import os
import sys

# Ensure backend directory is in path
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

from app.infrastructure.database import SessionLocal
from app.domain.models import Application, Job, User
from app.domain.constants import CandidateState

def main():
    db = SessionLocal()
    try:
        # Get first job or create one
        job = db.query(Job).first()
        if not job:
            # We need an HR/Super Admin user
            hr = db.query(User).filter(User.role == "hr").first()
            if not hr:
                hr = db.query(User).first()
            if not hr:
                print("No user exists in the database. Please register/create a user first.")
                return
            
            # Create a test job
            job = Job(
                title="Python Developer",
                status="open",
                hr_id=hr.id,
                primary_evaluated_skills="Python, SQL"
            )
            db.add(job)
            db.commit()
            db.refresh(job)
            print(f"Created default Job '{job.title}' with ID {job.id}")
        else:
            print(f"Using existing Job '{job.title}' with ID {job.id}")

        hr_id = job.hr_id
        
        stages = [
            'applied',
            'screened',
            'interview_scheduled',
            'interview_completed',
            'review_later',
            'physical_interview',
            'offer_sent',
            'hired',
            'onboarded',
            'rejected'
        ]

        print("Injecting candidates...")
        for stage in stages:
            name = f"Test Candidate {stage.replace('_', ' ').title()}"
            email = f"test_{stage}@example.com"
            
            # Check if application already exists for this email and job
            existing = db.query(Application).filter(
                Application.job_id == job.id,
                Application.candidate_email == email
            ).first()
            
            if existing:
                print(f"  Candidate '{name}' ({email}) already exists. Updating status to '{stage}'...")
                existing.status = stage
            else:
                print(f"  Creating candidate '{name}' ({email}) in stage '{stage}'...")
                app = Application(
                    job_id=job.id,
                    hr_id=hr_id,
                    candidate_name=name,
                    candidate_email=email,
                    status=stage,
                    resume_status='parsed',
                    resume_score=85.0,
                    aptitude_score=75.0,
                    interview_score=80.0,
                    composite_score=80.0
                )
                db.add(app)
        
        db.commit()
        print("Done! All candidates injected successfully.")
    except Exception as e:
        db.rollback()
        print("Error during candidate injection:", e)
    finally:
        db.close()

if __name__ == "__main__":
    main()
