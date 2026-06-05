'use client'

import React, { useState, useRef, useEffect } from 'react'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { UploadCloud, CheckCircle2, XCircle, Loader2, AlertCircle, FileText, FolderUp, Trash2, ArrowRight, Download, FileSpreadsheet } from 'lucide-react'
import useSWR, { mutate as globalMutate } from 'swr'
import { APIClient } from '@/app/dashboard/lib/api-client'
import { fetcher } from '@/app/dashboard/lib/swr-fetcher'
import * as XLSX from 'xlsx'
import JSZip from 'jszip'
import { toast } from 'sonner'

interface Job {
  id: number
  title: string
  status: string
}

interface ProcessedFile {
  id: string
  file: File
  status: 'pending' | 'processing' | 'success' | 'failed' | 'skipped'
  errorMessage?: string
  skippedReason?: string
}

interface BatchUploadModalProps {
  isOpen: boolean
  onClose: () => void
  onSuccess: () => void
}

const MAX_FILE_SIZE = 5 * 1024 * 1024 // 5MB
const MAX_FILES = 40

const normalizePhone = (rawPhone: string, countryCode?: string | null): string => {
  if (!rawPhone || typeof rawPhone !== 'string') return 'N/A'

  const cleaned = rawPhone.replace(/[\s\-\(\)]/g, '')
  const digitsOnly = cleaned.replace(/\D/g, '')

  // Invalid length
  if (digitsOnly.length < 10) return 'N/A'

  // Already explicitly has country code prefixed
  if (cleaned.startsWith('+')) {
    return '+' + digitsOnly
  }

  const prefix = countryCode ? countryCode.toString().replace(/\D/g, '') : '91'

  // If number already includes the prefix (e.g., 12 digits starting with 91)
  if (digitsOnly.length > 10 && digitsOnly.startsWith(prefix)) {
    return '+' + digitsOnly
  }

  // Exact 10 digits -> append prefix
  if (digitsOnly.length === 10) {
    return '+' + prefix + digitsOnly
  }

  // Any other standalone length without a '+'
  return '+' + digitsOnly
}

const toTitleCase = (str: string): string => {
  if (!str) return ''
  return str
    .split(/\s+/)
    .map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
    .join(' ')
}

const traverseFileTree = async (entry: any): Promise<File[]> => {
  if (entry.isFile) {
    return new Promise((resolve) => {
      entry.file((file: File) => resolve([file]), () => resolve([]))
    })
  } else if (entry.isDirectory) {
    const dirReader = entry.createReader()
    const readEntries = (): Promise<any[]> => {
      return new Promise((resolve) => {
        dirReader.readEntries(
          (results: any[]) => resolve(results),
          () => resolve([])
        )
      })
    }

    let allEntries: any[] = []
    let entries = await readEntries()
    while (entries.length > 0) {
      allEntries = [...allEntries, ...entries]
      entries = await readEntries()
    }

    const promises = allEntries.map((e) => traverseFileTree(e))
    const filesArrays = await Promise.all(promises)
    return filesArrays.flat()
  }
  return []
}

export function BatchUploadModal({ isOpen, onClose, onSuccess }: BatchUploadModalProps) {
  const [selectedJobId, setSelectedJobId] = useState<string>('')
  const [files, setFiles] = useState<ProcessedFile[]>([])
  const [isProcessing, setIsProcessing] = useState(false)
  
  // Stats
  const [stats, setStats] = useState({ success: 0, failed: 0, skipped: 0, total: 0, applicationIds: [] as number[], jobRole: '' })
  const [showSummary, setShowSummary] = useState(false)
  
  const [isExportReady, setIsExportReady] = useState(false)
  const [finalBatchData, setFinalBatchData] = useState<any[]>([])
  const [pollingStatus, setPollingStatus] = useState<string>('')
  
  const fileInputRef = useRef<HTMLInputElement>(null)
  const folderInputRef = useRef<HTMLInputElement>(null)
  const isCancelling = useRef(false)

  const [isDragging, setIsDragging] = useState(false)
  const dragCounter = useRef(0)

  const handleDragEnter = (e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    dragCounter.current++
    if (e.dataTransfer.items && e.dataTransfer.items.length > 0) {
      setIsDragging(true)
    }
  }

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    dragCounter.current--
    if (dragCounter.current === 0) {
      setIsDragging(false)
    }
  }

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
  }

  const handleDrop = async (e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    setIsDragging(false)
    dragCounter.current = 0

    if (e.dataTransfer.items && e.dataTransfer.items.length > 0) {
      const droppedFiles: File[] = []
      const promises: Promise<File[]>[] = []

      for (let i = 0; i < e.dataTransfer.items.length; i++) {
        const item = e.dataTransfer.items[i]
        if (item.kind === 'file') {
          if (typeof item.webkitGetAsEntry === 'function') {
            const entry = item.webkitGetAsEntry()
            if (entry) {
              promises.push(traverseFileTree(entry))
              continue
            }
          }
          const file = item.getAsFile()
          if (file) {
            droppedFiles.push(file)
          }
        }
      }

      if (promises.length > 0) {
        const traversed = await Promise.all(promises)
        droppedFiles.push(...traversed.flat())
      }

      if (droppedFiles.length > 0) {
        await processIncomingFiles(droppedFiles)
      }
    }
  }

  const { data: jobs, isLoading: jobsLoading } = useSWR<Job[]>('/api/jobs', (url: string) => fetcher<Job[]>(url))

  // Prevent accidental navigation during processing
  useEffect(() => {
    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      if (isProcessing) {
        e.preventDefault()
        e.returnValue = ''
      }
    }
    window.addEventListener('beforeunload', handleBeforeUnload)
    return () => window.removeEventListener('beforeunload', handleBeforeUnload)
  }, [isProcessing])

  // Reset state when modal opens
  useEffect(() => {
    if (isOpen) {
      setSelectedJobId('')
      setFiles([])
      setIsProcessing(false)
      setStats({ success: 0, failed: 0, skipped: 0, total: 0, applicationIds: [], jobRole: '' })
      setShowSummary(false)
      setIsExportReady(false)
      setFinalBatchData([])
      setPollingStatus('')
      isCancelling.current = false
      setIsDragging(false)
      dragCounter.current = 0
    }
  }, [isOpen])

  // Polling logic for background processing completion
  useEffect(() => {
    let interval: NodeJS.Timeout
    const checkCompletion = async () => {
      // We only poll if there are successfully submitted applications and we're showing the summary
      if (!showSummary || stats.applicationIds.length === 0 || isExportReady) return
      
      try {
        const resp = await APIClient.get<any>(`/api/applications?job_id=${selectedJobId}&limit=100&t=${Date.now()}`)
        // Handle both direct array and normalized { items, total } responses
        const apps = Array.isArray(resp) ? resp : (resp?.items || [])
        
        // Filter out applications for this batch
        const batchApps = apps.filter((a: any) => stats.applicationIds.includes(a.id))
        
        // Processing is complete if we have extraction OR it explicitly failed
        const completedCount = batchApps.filter((a: any) => 
          a.resume_extraction !== null || 
          (a.hr_notes && a.hr_notes.includes('AI analysis failed'))
        ).length

        setPollingStatus(`Finalizing data: ${completedCount}/${stats.applicationIds.length} candidates ready...`)

        // Only complete when ALL submitted applications are present and finished
        if (batchApps.length === stats.applicationIds.length && completedCount === stats.applicationIds.length) {
          setIsExportReady(true)
          setFinalBatchData(batchApps)
        }
      } catch (err) {
        console.error("Error polling applications state:", err)
      }
    }

    if (showSummary && !isExportReady && stats.applicationIds.length > 0) {
      // Check immediately
      checkCompletion()
      // Then poll every 3 seconds
      interval = setInterval(checkCompletion, 3000)
    }
    
    return () => clearInterval(interval)
  }, [showSummary, isExportReady, selectedJobId, stats.applicationIds])

  const processIncomingFiles = async (selectedFiles: File[]) => {
    const newProcessedFiles: ProcessedFile[] = []
    
    // We need to compare against both existing files and files added in this batch
    const allFilesSoFar = [...files]

    const addFileWithValidation = (f: File) => {
      // Rule 1: Allow only pdf/doc/docx
      const lowerName = f.name.toLowerCase()
      if (!lowerName.endsWith('.pdf') && !lowerName.endsWith('.doc') && !lowerName.endsWith('.docx')) {
        return // Ignore silently as per requirements
      }

      const id = `${f.name}-${f.size}-${Math.random()}`
      let status: ProcessedFile['status'] = 'pending'
      let skippedReason = ''

      // Rule 2: Max File Size
      if (f.size > MAX_FILE_SIZE) {
        status = 'skipped'
        skippedReason = 'Over 5MB limit'
      }

      // Rule 3: Empty File Detection (BA_007)
      if (f.size === 0) {
        status = 'skipped'
        skippedReason = 'Invalid or empty file'
        toast.error(`Invalid or empty file: ${f.name}`)
      }

      // Rule 4: Duplicate detection (name + size)
      const isDuplicate = allFilesSoFar.some(
        existing => existing.file.name === f.name && existing.file.size === f.size
      )
      
      if (isDuplicate) {
        toast.warning(`Duplicate resume detected and removed: ${f.name}`)
        return
      }

      const pFile = { id, file: f, status, skippedReason }
      newProcessedFiles.push(pFile)
      allFilesSoFar.push(pFile)
    }

    for (const file of selectedFiles) {
      if (file.name.toLowerCase().endsWith('.zip')) {
        try {
          const zip = await JSZip.loadAsync(file)
          for (const [relativePath, zipEntry] of Object.entries(zip.files)) {
            if (!zipEntry.dir) {
              const lowerName = zipEntry.name.toLowerCase()
              if (lowerName.endsWith('.pdf') || lowerName.endsWith('.doc') || lowerName.endsWith('.docx')) {
                try {
                  const blob = await zipEntry.async('blob')
                  const extractedFile = new File([blob], zipEntry.name.split('/').pop() || 'resume', {
                    type: lowerName.endsWith('.pdf') ? 'application/pdf' : 'application/docx'
                  })
                  addFileWithValidation(extractedFile)
                } catch (err) {
                  console.error(`Error extracting ${zipEntry.name}:`, err)
                }
              }
            }
          }
        } catch (err) {
          console.error('Failed to extract ZIP:', err)
        }
      } else {
        addFileWithValidation(file)
      }
    }

    // Rule 5: Total files cap (max 40) - BA_004, BA_017
    setFiles((prev) => {
      const combined = [...prev, ...newProcessedFiles]
      
      if (combined.length > MAX_FILES) {
        toast.warning(`File limit reached`, {
          description: `Only the first ${MAX_FILES} valid files will be processed per batch. Extra files have been marked as skipped.`,
          duration: 5000,
        })
      }

      // Enforce max 40: Mark anything beyond 40 as skipped
      return combined.map((f, idx) => {
        if (idx >= MAX_FILES && f.status === 'pending') {
          return { ...f, status: 'skipped', skippedReason: `${MAX_FILES} files limit exceeded` }
        }
        return f
      })
    })

    if (fileInputRef.current) fileInputRef.current.value = ''
    if (folderInputRef.current) folderInputRef.current.value = ''
  }

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files) return
    const selectedFiles = Array.from(e.target.files)
    await processIncomingFiles(selectedFiles)
  }

  const removeFile = (id: string) => {
    setFiles(prev => prev.filter((f) => f.id !== id))
  }

  const handleProcess = async () => {
    if (isProcessing || !selectedJobId || files.length === 0) return

    setIsProcessing(true)
    setShowSummary(false)
    isCancelling.current = false
    
    // Reset statuses of previously failed/skipped-by-network files (if any)
    setFiles(prev => prev.map(f => f.status === 'failed' ? {...f, status: 'pending', errorMessage: ''} : f))

    let successCount = 0
    let failedCount = 0
    const successfulAppIds: number[] = []
    
    const selectedJob = jobs?.find(j => j.id.toString() === selectedJobId)
    const jobRole = selectedJob?.title || 'Unknown Role'

    // The working queue is only pending files
    const queue = files.filter(f => f.status === 'pending')
    const initialSkippedCount = files.filter(f => f.status === 'skipped').length

    setStats({ 
        success: 0, 
        failed: 0, 
        skipped: initialSkippedCount, 
        total: queue.length + initialSkippedCount,
        applicationIds: [],
        jobRole
    })

    const worker = async () => {
      while (queue.length > 0) {
        if (isCancelling.current) break

        const currentItem = queue.shift()
        if (!currentItem) continue

        // Mark as processing
        setFiles(prev => prev.map(f => f.id === currentItem.id ? { ...f, status: 'processing' } : f))

        try {
          const formData = new FormData()
          formData.append('job_id', selectedJobId)
          
          const lastDotIdx = currentItem.file.name.lastIndexOf('.')
          const baseName = lastDotIdx !== -1 ? currentItem.file.name.substring(0, lastDotIdx) : currentItem.file.name
          const rawCleanName = baseName.replace(/[-_]/g, ' ') || 'Unknown Candidate'
          const cleanName = toTitleCase(rawCleanName)
          const timestamp = Date.now()
          const randomStr = Math.random().toString(36).substring(7)
          const uniqueEmail = `batch.${cleanName.replace(/[^a-zA-Z0-9]/g, '')}_${timestamp}_${randomStr}@batch.example.com`.toLowerCase()

          formData.append('candidate_name', cleanName)
          formData.append('candidate_email', uniqueEmail)
          formData.append('resume_file', currentItem.file)

          const responseData = await APIClient.postFormData<any>('/api/applications/apply', formData)
          
          const appId = responseData?.id || responseData?.application?.id
          if (appId) {
            successfulAppIds.push(appId)
          }
          successCount++
          
          setFiles(prev => prev.map(f => f.id === currentItem.id ? { ...f, status: 'success' } : f))
        } catch (error: any) {
          const isRateLimit = error.message?.toLowerCase().includes('rate limit')
          if (isRateLimit) {
            // ... (keep existing rate limit logic)
            const retryCount = (currentItem as any)._retryCount || 0
            if (retryCount < 2) {
              ;(currentItem as any)._retryCount = retryCount + 1
              queue.unshift(currentItem) // put back at front
              setFiles(prev => prev.map(f => f.id === currentItem.id ? { ...f, status: 'pending', errorMessage: '' } : f))
              await new Promise(resolve => setTimeout(resolve, 15000)) // wait 15s
              continue
            }
          }
          
          const isDuplicate = error.message?.toLowerCase().includes('duplicate resume entry')
          if (isDuplicate) {
            setFiles(prev => prev.map(f => f.id === currentItem.id ? { ...f, status: 'skipped', skippedReason: 'Duplicate resume already exists' } : f))
          } else {
            failedCount++
            setFiles(prev => prev.map(f => f.id === currentItem.id ? { ...f, status: 'failed', errorMessage: error.message || 'API Error' } : f))
          }
        }

        // Live stats update
        setStats(prev => ({ ...prev, success: successCount, failed: failedCount, applicationIds: successfulAppIds }))

        // Throttle: Respect rate limits. Default is 1000ms for high-speed production capability, or configure via env.
        const uploadDelay = process.env.NEXT_PUBLIC_BATCH_UPLOAD_DELAY 
          ? parseInt(process.env.NEXT_PUBLIC_BATCH_UPLOAD_DELAY, 10) 
          : 1000
        if (queue.length > 0 && !isCancelling.current) {
          await new Promise(resolve => setTimeout(resolve, uploadDelay))
        }
      }
    }

    // Launch Sequential Processing (respect backend/Supabase rate limits)
    // Concurrency defaults to 1 worker to ensure order and stability, but is configurable.
    const CONCURRENCY = process.env.NEXT_PUBLIC_BATCH_UPLOAD_CONCURRENCY 
      ? parseInt(process.env.NEXT_PUBLIC_BATCH_UPLOAD_CONCURRENCY, 10) 
      : 1
    const workers = Array(Math.min(CONCURRENCY, queue.length)).fill(null).map((_, i) =>
      new Promise<void>(resolve => setTimeout(resolve, i * 300)).then(() => worker())
    )
    await Promise.all(workers)

    setIsProcessing(false)
    setShowSummary(true)

    // Final stats adjustment: Any file still 'pending' should be considered 'skipped' (e.g. due to cancellation)
    setFiles(prev => {
        const finalFiles = prev.map(f => f.status === 'pending' ? { ...f, status: 'skipped' as const, skippedReason: 'Cancelled/Not processed' } : f)
        const finalSkipped = finalFiles.filter(f => f.status === 'skipped').length
        setStats(prevStats => ({ ...prevStats, skipped: finalSkipped }))
        return finalFiles
    })
  }

  const handleCancel = () => {
    isCancelling.current = true
  }

  const handleExport = async () => {
    if (!showSummary || finalBatchData.length === 0) return

    const uniqueAppsMap = new Map()
    
    finalBatchData.forEach(app => {
      // EXACT 1:1 match with Applications state
      const name = app.candidate_name || 'Unknown'
      const email = app.candidate_email || 'N/A'
      
      const rawPhone = app.candidate_phone || ''
      const extCountryCode = app.country_code || null
      const phone = normalizePhone(rawPhone, extCountryCode)
      
      const role = app.job?.title || stats.jobRole || 'Unknown Role'
      
      const rawScore = app.job_compatibility_score ?? app.resume_score ?? app.resume_extraction?.match_percentage ?? app.resume_extraction?.skill_match_percentage ?? 0
      const pctScore = rawScore <= 10 && rawScore > 0 ? rawScore * 10 : rawScore
      const matchStatus = pctScore >= 50 ? "YES" : "NO"
      
      const key = email !== 'N/A' ? email : `${name}-${Math.random()}`
      if (!uniqueAppsMap.has(key)) {
          uniqueAppsMap.set(key, { 
            Name: name, 
            Email: email, 
            'Phone Number': phone, 
            'Job Role': role,
            'MATCH': matchStatus
          })
      }
    })
    
    const uniqueApps = Array.from(uniqueAppsMap.values())
    
    const worksheet = XLSX.utils.json_to_sheet(uniqueApps)
    const workbook = XLSX.utils.book_new()
    XLSX.utils.book_append_sheet(workbook, worksheet, "Candidates")
    
    XLSX.writeFile(workbook, "candidates_export.xlsx")
  }

  const handleClose = () => {
    if (isProcessing) return // Prevent closing while processing (they must hit cancel first)
    if (showSummary) {
      // Invalidate applications and dashboard analytics
      globalMutate('/api/applications')
      globalMutate('/api/analytics/dashboard')
      onSuccess()
    }
    onClose()
  }

  const progressCount = stats.success + stats.failed + files.filter(f => f.status === 'processing').length
  const processingQueueTotal = files.filter(f => ['pending', 'processing', 'success', 'failed'].includes(f.status)).length

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent 
        className="max-w-2xl max-h-[90vh] flex flex-col overflow-hidden relative border border-border/80 bg-background/95 backdrop-blur-md shadow-2xl transition-all duration-300"
        onDragEnter={handleDragEnter}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
      >
        <DialogHeader>
          <DialogTitle className="text-xl font-bold tracking-tight">Batch Resume Analysis</DialogTitle>
          <DialogDescription className="text-muted-foreground">
            Upload multiple resumes or a folder. They will be actively filtered and processed securely.
          </DialogDescription>
        </DialogHeader>

        {isDragging && !isProcessing && !showSummary && (
          <div className="absolute inset-0 bg-background/80 backdrop-blur-sm z-50 flex flex-col items-center justify-center transition-all duration-300 animate-in fade-in">
            <div className="border-2 border-dashed border-primary/50 rounded-2xl p-12 max-w-lg w-[90%] text-center flex flex-col items-center justify-center space-y-4 bg-primary/5 shadow-2xl shadow-primary/5 animate-in zoom-in-95 duration-200">
              <div className="w-16 h-16 bg-primary/10 text-primary rounded-full flex items-center justify-center animate-bounce shadow-inner">
                <UploadCloud className="h-8 w-8" />
              </div>
              <h3 className="text-xl font-bold text-foreground">Drop Resumes Here</h3>
              <p className="text-sm text-muted-foreground">
                Release to add candidate resumes (.pdf, .doc, .docx or .zip)
              </p>
            </div>
          </div>
        )}

        {isProcessing ? (
          <div className="py-12 flex flex-col items-center justify-center space-y-6 flex-1 animate-in fade-in zoom-in-95 duration-200">
            <div className="relative flex items-center justify-center w-16 h-16">
              <div className="absolute inset-0 rounded-full border-4 border-primary/20 border-t-primary animate-spin" />
              <UploadCloud className="h-6 w-6 text-primary animate-pulse" />
            </div>
            <div className="text-center space-y-3 w-full max-w-sm">
              <h3 className="text-lg font-bold tracking-tight text-foreground">Processing resumes... ⏳</h3>
              <p className="text-sm text-muted-foreground font-medium">
                Processing {Math.min(progressCount + 1, processingQueueTotal)} of {processingQueueTotal} resumes
              </p>
              
              <div className="relative w-full bg-secondary/85 rounded-full h-3 mt-4 overflow-hidden border border-border/20 shadow-inner">
                <div 
                  className="bg-gradient-to-r from-primary via-primary/90 to-primary/80 h-full rounded-full transition-all duration-300 shadow-md shadow-primary/20 animate-pulse"
                  style={{ width: `${(progressCount / processingQueueTotal) * 100}%` }}
                />
              </div>
              
              <div className="flex justify-between text-xs font-semibold text-muted-foreground mt-3">
                <span className="text-emerald-600 dark:text-emerald-400 bg-emerald-500/10 dark:bg-emerald-500/20 px-2 py-0.5 rounded-md">{stats.success} Success</span>
                <span className="text-destructive bg-destructive/10 px-2 py-0.5 rounded-md">{stats.failed} Failed</span>
              </div>
            </div>
            <Button variant="destructive" onClick={handleCancel} className="mt-4 active:scale-95 transition-all shadow-md rounded-xl">
               Cancel Remaining
            </Button>
          </div>
        ) : showSummary ? (
          <div className="py-6 flex flex-col items-center justify-center space-y-5 flex-1 animate-in fade-in zoom-in-95 duration-200">
            <div className="w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center shadow-inner animate-in zoom-in duration-300">
              <CheckCircle2 className="h-8 w-8 text-primary" />
            </div>
            <div className="text-center space-y-2 w-full flex flex-col items-center">
              <h3 className="text-xl font-bold tracking-tight text-foreground">Processing Finalized</h3>
              
              <div className="grid grid-cols-3 gap-4 w-full max-w-md mt-4">
                {/* Success Card */}
                <div className="bg-emerald-500/5 dark:bg-emerald-500/10 border border-emerald-500/20 rounded-2xl p-4 flex flex-col items-center justify-center text-center shadow-sm hover:scale-[1.02] hover:shadow-md hover:shadow-emerald-500/5 transition-all duration-300">
                  <CheckCircle2 className="h-5 w-5 text-emerald-500 mb-1" />
                  <span className="text-2xl font-extrabold text-emerald-600 dark:text-emerald-400">{stats.success}</span>
                  <span className="text-[10px] font-bold text-emerald-600/80 dark:text-emerald-400/80 uppercase tracking-wide">Success</span>
                </div>
                
                {/* Failed Card */}
                <div className={`border rounded-2xl p-4 flex flex-col items-center justify-center text-center shadow-sm transition-all hover:scale-[1.02] hover:shadow-md duration-300 ${stats.failed > 0 ? 'bg-destructive/5 dark:bg-destructive/10 border-destructive/20 text-destructive hover:shadow-destructive/5' : 'bg-muted/20 border-border/40 opacity-40'}`}>
                  <XCircle className={`h-5 w-5 mb-1 ${stats.failed > 0 ? 'text-destructive' : 'text-muted-foreground'}`} />
                  <span className="text-2xl font-extrabold">{stats.failed}</span>
                  <span className="text-[10px] font-bold uppercase tracking-wide">Failed</span>
                </div>

                {/* Skipped Card */}
                <div className={`border rounded-2xl p-4 flex flex-col items-center justify-center text-center shadow-sm transition-all hover:scale-[1.02] hover:shadow-md duration-300 ${stats.skipped > 0 ? 'bg-amber-500/5 dark:bg-amber-500/10 border-amber-500/20 text-amber-600 dark:text-amber-400 hover:shadow-amber-500/5' : 'bg-muted/20 border-border/40 opacity-40'}`}>
                  <AlertCircle className={`h-5 w-5 mb-1 ${stats.skipped > 0 ? 'text-amber-500 animate-pulse' : 'text-muted-foreground'}`} />
                  <span className="text-2xl font-extrabold">{stats.skipped}</span>
                  <span className="text-[10px] font-bold uppercase tracking-wide">Skipped</span>
                </div>
              </div>
              
              {!isExportReady && stats.success > 0 && (
                <p className="text-xs text-muted-foreground flex items-center justify-center gap-2 mt-4 font-medium">
                  <Loader2 className="h-3.5 w-3.5 animate-spin text-primary"/>
                  {pollingStatus || 'Preparing final export data...'}
                </p>
              )}
            </div>
            
            <div className="w-full max-w-lg mt-4 bg-muted/20 border border-border/40 p-4 rounded-2xl max-h-48 overflow-y-auto shadow-inner">
                <h4 className="text-xs font-bold text-muted-foreground uppercase tracking-wide mb-3 text-left">Detailed Results</h4>
                <div className="space-y-2">
                  {files.filter(f => f.status !== 'pending').map(file => (
                      <div key={file.id} className="flex justify-between items-center p-2.5 rounded-xl text-xs border border-border/30 bg-background/50 gap-4">
                          <span className="truncate max-w-[200px] sm:max-w-xs font-medium text-foreground">{file.file.name}</span>
                          {file.status === 'success' && (
                            <span className="text-emerald-600 dark:text-emerald-400 bg-emerald-500/10 dark:bg-emerald-500/20 px-2 py-0.5 rounded-full font-semibold whitespace-nowrap shrink-0 flex items-center gap-1">
                              <CheckCircle2 className="w-3.5 h-3.5" /> Success
                            </span>
                          )}
                          {file.status === 'failed' && (
                            <span className="text-destructive bg-destructive/10 px-2 py-0.5 rounded-full font-semibold whitespace-nowrap shrink-0 flex items-center gap-1">
                              <XCircle className="w-3.5 h-3.5" /> Failed
                            </span>
                          )}
                          {file.status === 'skipped' && (
                            <span className="text-muted-foreground bg-muted border px-2 py-0.5 rounded-full font-semibold whitespace-nowrap shrink-0 flex items-center gap-1">
                              <AlertCircle className="w-3.5 h-3.5" /> Skipped
                            </span>
                          )}
                      </div>
                  ))}
                </div>
            </div>

            <div className="flex flex-col w-full sm:flex-row gap-3 mt-4 pt-4 border-t border-border/40">
              <Button onClick={handleClose} className="flex-1 rounded-xl shadow-md active:scale-[0.98] transition-all flex items-center justify-center gap-2">
                View Applications <ArrowRight className="w-4 h-4" />
              </Button>
              {stats.success > 0 && (
                <Button 
                  variant="outline" 
                  onClick={handleExport} 
                  disabled={!isExportReady}
                  className="flex-1 rounded-xl border-primary text-primary hover:bg-primary/5 hover:border-primary shadow-sm active:scale-[0.98] transition-all flex items-center justify-center gap-2 disabled:opacity-50"
                >
                  <FileSpreadsheet className="w-4 h-4" />
                  {isExportReady ? 'Download Excel' : 'Preparing Data...'}
                </Button>
              )}
            </div>
          </div>
        ) : (
          <div className="space-y-6 py-4 flex-1 overflow-y-auto pr-2">
            <div className="space-y-2">
              <Label htmlFor="job-select" className="text-sm font-semibold text-foreground">Target Job Role</Label>
              <Select value={selectedJobId} onValueChange={setSelectedJobId} disabled={jobsLoading}>
                <SelectTrigger id="job-select" className="rounded-xl border-border/80 focus:ring-primary/20">
                  <SelectValue placeholder={jobsLoading ? "Loading jobs..." : "Select a job for these resumes"} />
                </SelectTrigger>
                <SelectContent className="rounded-xl">
                  {jobs?.filter(j => j.status === 'open').map((job) => (
                    <SelectItem key={job.id} value={job.id.toString()}>
                      {job.title}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2.5">
              <Label className="text-sm font-semibold text-foreground">Upload Resumes</Label>
              <div className="grid grid-cols-2 gap-4">
                  <div 
                    className="group relative border-2 border-dashed border-border/80 hover:border-primary/50 rounded-2xl p-6 hover:bg-primary/[0.02] dark:hover:bg-primary/[0.04] transition-all duration-300 cursor-pointer text-center flex flex-col items-center justify-center active:scale-[0.98] shadow-sm hover:shadow-md hover:shadow-primary/[0.03]"
                    onClick={() => fileInputRef.current?.click()}
                  >
                    <input
                      type="file"
                      multiple
                      accept=".pdf,.doc,.docx,.zip"
                      className="hidden"
                      ref={fileInputRef}
                      onChange={handleFileChange}
                    />
                    <div className="w-12 h-12 bg-primary/5 border border-primary/10 text-primary rounded-xl flex items-center justify-center mb-3 mx-auto transition-all duration-300 group-hover:scale-110 group-hover:bg-primary/10 group-hover:border-primary/30 group-hover:ring-4 group-hover:ring-primary/15">
                      <UploadCloud className="h-6 w-6 transition-transform duration-300 group-hover:-translate-y-0.5" />
                    </div>
                    <h4 className="font-semibold text-sm text-foreground mb-1">Select Files / ZIP</h4>
                    <p className="text-[11px] text-muted-foreground max-w-[180px]">PDF, DOCX, or ZIP (max 5MB each)</p>
                  </div>

                  <div 
                    className="group relative border-2 border-dashed border-border/80 hover:border-primary/50 rounded-2xl p-6 hover:bg-primary/[0.02] dark:hover:bg-primary/[0.04] transition-all duration-300 cursor-pointer text-center flex flex-col items-center justify-center active:scale-[0.98] shadow-sm hover:shadow-md hover:shadow-primary/[0.03]"
                    onClick={() => folderInputRef.current?.click()}
                  >
                    <input
                      type="file"
                      multiple
                      // @ts-ignore
                      webkitdirectory=""
                      directory=""
                      className="hidden"
                      ref={folderInputRef}
                      onChange={handleFileChange}
                    />
                    <div className="w-12 h-12 bg-primary/5 border border-primary/10 text-primary rounded-xl flex items-center justify-center mb-3 mx-auto transition-all duration-300 group-hover:scale-110 group-hover:bg-primary/10 group-hover:border-primary/30 group-hover:ring-4 group-hover:ring-primary/15">
                      <FolderUp className="h-6 w-6 transition-transform duration-300 group-hover:translate-y-[-2px]" />
                    </div>
                    <h4 className="font-semibold text-sm text-foreground mb-1">Select Folder</h4>
                    <p className="text-[11px] text-muted-foreground max-w-[180px]">Upload complete directory folders</p>
                  </div>
              </div>
            </div>

            {files.length > 0 && (
              <div className="space-y-2 border-t pt-4 border-border/40">
                <div className="flex items-center justify-between">
                  <Label className="text-sm font-semibold text-foreground">
                    Selected Files ({files.filter(f => f.status === 'pending').length} ready, {files.filter(f => f.status === 'skipped').length} skipped)
                  </Label>
                  <Button variant="ghost" size="sm" onClick={() => setFiles([])} className="h-auto p-0 text-muted-foreground hover:text-destructive text-xs hover:bg-transparent transition-colors">
                    Clear all
                  </Button>
                </div>
                
                {files.filter(f => f.status === 'pending').length === 0 && (
                   <div className="p-3 bg-destructive/10 text-destructive text-sm rounded-xl flex items-center gap-2 border border-destructive/20 animate-in fade-in">
                       <AlertCircle className="h-4 w-4 shrink-0" />
                       No valid resumes ready. Try clearing and selecting valid files.
                   </div>
                )}
                
                <div className="max-h-48 overflow-y-auto space-y-2 pr-2">
                  {files.map((fileObj) => (
                    <div key={fileObj.id} className={`flex items-center justify-between p-2.5 rounded-xl text-sm border hover:border-primary/20 hover:bg-primary/[0.01] transition-all duration-200 ${fileObj.status === 'skipped' ? 'bg-muted/30 opacity-60 border-border/40' : 'bg-background border-border/60'}`}>
                      <div className="flex items-center gap-2.5 overflow-hidden flex-1">
                        <FileText className={`h-4.5 w-4.5 shrink-0 ${fileObj.status === 'skipped' ? 'text-muted-foreground' : 'text-primary'}`} />
                        <div className="flex flex-col truncate flex-1">
                             <span className="truncate font-medium text-foreground">{fileObj.file.name}</span>
                             {fileObj.status === 'skipped' && (
                                 <span className="text-[10px] text-destructive/90 font-medium">Skipped: {fileObj.skippedReason}</span>
                             )}
                        </div>
                      </div>
                      <Button 
                        variant="ghost" 
                        size="icon" 
                        onClick={() => removeFile(fileObj.id)} 
                        className="h-7 w-7 text-muted-foreground hover:text-destructive hover:bg-destructive/10 rounded-lg shrink-0 transition-all active:scale-90"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {!isProcessing && !showSummary && (
          <DialogFooter className="mt-2 pt-4 border-t border-border/40">
            <Button variant="outline" onClick={handleClose} className="rounded-xl active:scale-95 transition-all">Cancel</Button>
            <Button 
              onClick={handleProcess} 
              disabled={!selectedJobId || files.filter(f => f.status === 'pending').length === 0}
              className="gap-2 rounded-xl shadow-md shadow-primary/10 active:scale-[0.98] transition-all"
            >
              Start Analysis ({files.filter(f => f.status === 'pending').length}) <ArrowRight className="w-4 h-4" />
            </Button>
          </DialogFooter>
        )}
      </DialogContent>
    </Dialog>
  )
}
