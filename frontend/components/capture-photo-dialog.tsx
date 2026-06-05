'use client'

import React, { useRef, useState, useCallback } from 'react'
import Webcam from 'react-webcam'
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogDescription,
    DialogFooter
} from "@/components/ui/dialog"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Camera, RefreshCw, Check, Upload, Image as ImageIcon } from 'lucide-react'
import { APIClient } from '@/app/dashboard/lib/api-client'
import { useToast } from "@/hooks/use-toast"

interface CapturePhotoDialogProps {
    isOpen: boolean
    onOpenChange: (open: boolean) => void
    applicationId: number
    onSuccess: () => void
}

export function CapturePhotoDialog({ isOpen, onOpenChange, applicationId, onSuccess }: CapturePhotoDialogProps) {
    const webcamRef = useRef<Webcam>(null)
    const [imgSrc, setImgSrc] = useState<string | null>(null)
    const [isUploading, setIsUploading] = useState(false)
    const [activeTab, setActiveTab] = useState("capture")
    const fileInputRef = useRef<HTMLInputElement>(null)
    const { toast } = useToast()

    const capture = useCallback(() => {
        const imageSrc = webcamRef.current?.getScreenshot()
        setImgSrc(imageSrc || null)
    }, [webcamRef])

    const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0]
        if (file) {
            const reader = new FileReader()
            reader.onloadend = () => {
                setImgSrc(reader.result as string)
            }
            reader.readAsDataURL(file)
        }
    }

    const retake = () => {
        setImgSrc(null)
    }

    const uploadPhoto = async () => {
        if (!imgSrc) return
        
        setIsUploading(true)
        try {
            // Convert base64 to blob
            const response = await fetch(imgSrc)
            const blob = await response.blob()
            
            const formData = new FormData()
            formData.append('photo', blob, 'candidate_photo.jpg')

            await APIClient.postFormData(`/api/onboarding/applications/${applicationId}/capture-photo`, formData)

            toast({ title: "Success", description: "Candidate photo added successfully." })
            onSuccess()
            onOpenChange(false)
            setImgSrc(null)
        } catch (error) {
            toast({ title: "Error", description: "Failed to upload photo", variant: "destructive" })
        } finally {
            setIsUploading(false)
        }
    }

    return (
        <Dialog open={isOpen} onOpenChange={(open) => { onOpenChange(open); if(!open) setImgSrc(null); }}>
            <DialogContent className="sm:max-w-md border border-border bg-background/95 backdrop-blur-md shadow-2xl rounded-2xl">
                <DialogHeader>
                    <DialogTitle className="text-xl font-bold tracking-tight">Add Candidate Photo</DialogTitle>
                    <DialogDescription className="text-muted-foreground">
                        Provide a photo of the candidate for their official ID card.
                    </DialogDescription>
                </DialogHeader>
                
                <Tabs defaultValue="capture" className="w-full" onValueChange={(v) => { setActiveTab(v); setImgSrc(null); }}>
                    <TabsList className="grid w-full grid-cols-2 mb-4 bg-muted/60 p-1 rounded-xl">
                        <TabsTrigger value="capture" className="gap-2 rounded-lg data-[state=active]:shadow-sm">
                            <Camera className="h-4 w-4" />
                            Take Photo
                        </TabsTrigger>
                        <TabsTrigger value="upload" className="gap-2 rounded-lg data-[state=active]:shadow-sm">
                            <Upload className="h-4 w-4" />
                            Upload
                        </TabsTrigger>
                    </TabsList>
 
                    <TabsContent value="capture" className="mt-0">
                        <div className="flex flex-col items-center justify-center bg-zinc-950 rounded-2xl overflow-hidden aspect-video relative shadow-inner border border-border/40">
                            {!imgSrc ? (
                                <>
                                    <Webcam
                                        audio={false}
                                        ref={webcamRef}
                                        screenshotFormat="image/jpeg"
                                        className="w-full h-full object-cover"
                                        videoConstraints={{ facingMode: "user" }}
                                    />
                                    <div className="absolute bottom-4 left-1/2 -translate-x-1/2 animate-in fade-in duration-300">
                                        <Button 
                                            onClick={capture} 
                                            variant="secondary" 
                                            className="rounded-full h-12 w-12 p-0 bg-white/20 hover:bg-white/40 backdrop-blur-md border-white/50 border shadow-lg hover:scale-110 active:scale-90 transition-all duration-200"
                                        >
                                            <Camera className="h-6 w-6 text-white" />
                                        </Button>
                                    </div>
                                </>
                            ) : (
                                <>
                                    <img src={imgSrc} className="w-full h-full object-cover" alt="Captured" />
                                    {/* Persistent Glassmorphic Control Overlay */}
                                    <div className="absolute bottom-3 left-3 right-3 bg-background/70 backdrop-blur-md border border-border/40 rounded-xl p-2 flex items-center justify-between shadow-lg animate-in slide-in-from-bottom-2 duration-300">
                                        <span className="text-xs font-semibold text-foreground/90 pl-2">Photo Captured</span>
                                        <Button 
                                            onClick={retake} 
                                            variant="outline" 
                                            size="sm" 
                                            className="h-8 rounded-lg bg-background/50 hover:bg-background/95 hover:text-destructive text-muted-foreground border-border/60 transition-all active:scale-95 duration-200"
                                        >
                                            <RefreshCw className="h-3.5 w-3.5 mr-2" />
                                            Retake
                                        </Button>
                                    </div>
                                </>
                            )}
                        </div>
                    </TabsContent>
 
                    <TabsContent value="upload" className="mt-0">
                        <div className="group flex flex-col items-center justify-center border-2 border-dashed border-border/80 hover:border-primary/40 rounded-2xl aspect-video bg-muted/10 hover:bg-primary/[0.01] transition-all duration-300 relative overflow-hidden">
                            {!imgSrc ? (
                                <div className="text-center p-6 flex flex-col items-center gap-3">
                                    <div className="p-3 bg-background border rounded-xl shadow-sm transition-transform duration-300 group-hover:scale-110 group-hover:rotate-3">
                                        <ImageIcon className="h-6 w-6 text-muted-foreground" />
                                    </div>
                                    <div className="space-y-0.5">
                                        <p className="text-sm font-semibold text-foreground">Choose a photo</p>
                                        <p className="text-xs text-muted-foreground">JPG, PNG or WEBP (Max 5MB)</p>
                                    </div>
                                    <input 
                                        type="file" 
                                        accept="image/*" 
                                        className="hidden" 
                                        ref={fileInputRef}
                                        onChange={handleFileUpload}
                                    />
                                    <Button 
                                        variant="secondary" 
                                        size="sm"
                                        onClick={() => fileInputRef.current?.click()}
                                        className="rounded-xl active:scale-95 transition-all shadow-sm"
                                    >
                                        Browse Files
                                    </Button>
                                </div>
                            ) : (
                                <>
                                    <img src={imgSrc} className="w-full h-full object-cover" alt="Uploaded" />
                                    {/* Persistent Glassmorphic Control Overlay */}
                                    <div className="absolute bottom-3 left-3 right-3 bg-background/70 backdrop-blur-md border border-border/40 rounded-xl p-2 flex items-center justify-between shadow-lg animate-in slide-in-from-bottom-2 duration-300">
                                        <span className="text-xs font-semibold text-foreground/90 pl-2">Photo Loaded</span>
                                        <Button 
                                            onClick={retake} 
                                            variant="outline" 
                                            size="sm" 
                                            className="h-8 rounded-lg bg-background/50 hover:bg-background/95 hover:text-destructive text-muted-foreground border-border/60 transition-all active:scale-95 duration-200"
                                        >
                                            <RefreshCw className="h-3.5 w-3.5 mr-2" />
                                            Change Photo
                                        </Button>
                                    </div>
                                </>
                            )}
                        </div>
                    </TabsContent>
                </Tabs>
 
                <DialogFooter className="sm:justify-between pt-4 border-t border-border/40">
                    <Button variant="ghost" onClick={() => onOpenChange(false)} className="rounded-xl active:scale-95 transition-all">Cancel</Button>
                    {imgSrc && (
                        <Button 
                            onClick={uploadPhoto} 
                            disabled={isUploading}
                            className="bg-emerald-600 hover:bg-emerald-700 active:scale-[0.98] shadow-md shadow-emerald-600/10 text-white font-bold px-8 rounded-xl transition-all flex items-center justify-center gap-1.5"
                        >
                            {isUploading ? "Uploading..." : `Save ${activeTab === 'capture' ? 'Capture' : 'Upload'}`}
                            {!isUploading && <Check className="ml-2 h-4 w-4" />}
                        </Button>
                    )}
                </DialogFooter>
            </DialogContent>
        </Dialog>
    )
}
