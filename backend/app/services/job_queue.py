import json
from typing import Dict, Any, Optional
from app.core.redis_store import get_redis_client

# Simple in-memory dict for job tracking (fallback)
_ai_jobs_fallback: Dict[str, Dict[str, Any]] = {}
_JOB_TTL = 86400  # 24 hours

def _get_redis_key(job_id: str) -> str:
    return f"rims:ai_job:{job_id}"

def create_job(job_id: str):
    r = get_redis_client()
    job_data = {"status": "processing", "result": None, "error": None}
    if r:
        try:
            r.setex(_get_redis_key(job_id), _JOB_TTL, json.dumps(job_data))
            return
        except Exception:
            pass
    _ai_jobs_fallback[job_id] = job_data

def complete_job(job_id: str, result: Any = None):
    r = get_redis_client()
    job_data = {"status": "completed", "result": result, "error": None}
    if r:
        try:
            r.setex(_get_redis_key(job_id), _JOB_TTL, json.dumps(job_data))
            return
        except Exception:
            pass
    if job_id in _ai_jobs_fallback:
        _ai_jobs_fallback[job_id] = job_data

def fail_job(job_id: str, error: str):
    r = get_redis_client()
    job_data = {"status": "failed", "result": None, "error": error}
    if r:
        try:
            r.setex(_get_redis_key(job_id), _JOB_TTL, json.dumps(job_data))
            return
        except Exception:
            pass
    if job_id in _ai_jobs_fallback:
        _ai_jobs_fallback[job_id] = job_data

def get_job(job_id: str) -> Optional[Dict[str, Any]]:
    r = get_redis_client()
    if r:
        try:
            val = r.get(_get_redis_key(job_id))
            if val:
                return json.loads(val)
        except Exception:
            pass
    return _ai_jobs_fallback.get(job_id)

class AIJobsMapping:
    def __contains__(self, item: str) -> bool:
        return get_job(item) is not None

    def __getitem__(self, item: str) -> Dict[str, Any]:
        job = get_job(item)
        if job is None:
            raise KeyError(item)
        return job

ai_jobs = AIJobsMapping()

