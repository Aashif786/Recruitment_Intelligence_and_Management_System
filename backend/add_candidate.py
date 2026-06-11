import os
import sys
import argparse

# Ensure backend directory is in path
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

from app.infrastructure.database import SessionLocal
from app.domain.models import Application, Job, User
from app.domain.constants import CandidateState

def main():
    parser = argparse.ArgumentParser(description="Inject a single candidate into a specific stage.")
    parser.add_argument("--name", type=str, required=True, help="Candidate full name")
    parser.add_argument("--email", type=str, required=True, help="Candidate registered email")
    parser.add_argument("--stage", type=str, required=True, help="Candidate stage/status")
    parser.add_argument("--job-id", type=int, help="Optional Job ID (defaults to the first job in the DB)")
    
    args = parser.parse_args()
    
    # Normalize stage
    stage = args.stage.strip().lower()
    
    # Validate stage against CandidateState Enum
    valid_stages = [s.value for s in CandidateState]
    if stage not in valid_stages:
        print(f"\nError: Invalid stage '{args.stage}'\nMust be one of: {valid_stages}")
        sys.exit(1)
        
    db = SessionLocal()
    try:
        # Retrieve target job
        if args.job_id:
            job = db.query(Job).filter(Job.id == args.job_id).first()
            if not job:
                print(f"Error: Job with ID {args.job_id} not found.")
                sys.exit(1)
        else:
            job = db.query(Job).first()
            if not job:
                print("Error: No job exists in the database. Please create a job first.")
                sys.exit(1)
                
        hr_id = job.hr_id
        
        # Check uniqueness constraint (job_id + candidate_email)
        existing = db.query(Application).filter(
            Application.job_id == job.id,
            Application.candidate_email == args.email
        ).first()
        
        if existing:
            print(f"Candidate '{args.name}' ({args.email}) already exists. Updating status from '{existing.status}' to '{stage}'...")
            existing.status = stage
            existing.candidate_name = args.name
        else:
            print(f"Creating candidate '{args.name}' ({args.email}) in stage '{stage}'...")
            app = Application(
                job_id=job.id,
                hr_id=hr_id,
                candidate_name=args.name,
                candidate_email=args.email,
                status=stage,
                resume_status='parsed',
                resume_score=85.0,
                aptitude_score=75.0,
                interview_score=80.0,
                composite_score=80.0
            )
            db.add(app)
            
        db.commit()
        print("Success! Candidate record has been saved.")
    except Exception as e:
        db.rollback()
        print("Error during candidate insertion:", e)
    finally:
        db.close()

if __name__ == "__main__":
    main()
