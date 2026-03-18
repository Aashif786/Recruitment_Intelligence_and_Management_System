from app.infrastructure.database import engine
from sqlalchemy import text
import logging

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

def update_constraints():
    with engine.connect() as conn:
        trans = conn.begin()
        try:
            logger.info("Updating applications status constraint...")
            # Allowed statuses for applications
            app_statuses = [
                'applied', 'submitted', 'resume_screening', 'aptitude_round', 
                'ai_interview', 'ai_interview_completed', 'technical_interview', 
                'hr_interview', 'physical_interview', 'final_decision', 
                'hired', 'rejected', 'processing_failed', 'approved_for_interview', 
                'review_later', 'rejected_post_interview', 'call_for_face_to_face'
            ]
            app_statuses_str = ", ".join([f"'{s}'" for s in app_statuses])
            
            if "mysql" in str(engine.url):
                # MySQL: Drop and recreate
                try:
                    conn.execute(text("ALTER TABLE applications DROP CHECK check_applications_status"))
                except Exception as e:
                    logger.warning(f"Could not drop check_applications_status (maybe it doesn't exist?): {e}")
                
                conn.execute(text(f"ALTER TABLE applications ADD CONSTRAINT check_applications_status CHECK (status IN ({app_statuses_str}))"))
                
                logger.info("Updating interviews status constraint...")
                # Allowed statuses for interviews
                int_statuses = ['not_started', 'in_progress', 'completed', 'cancelled', 'terminated']
                int_statuses_str = ", ".join([f"'{s}'" for s in int_statuses])
                
                try:
                    conn.execute(text("ALTER TABLE interviews DROP CHECK check_interviews_status"))
                except Exception:
                    # In some schemas it might be named differently or not exist
                    try:
                        conn.execute(text("ALTER TABLE interviews DROP CHECK interviews_chk_1")) # Common auto-name
                    except Exception:
                        pass
                
                conn.execute(text(f"ALTER TABLE interviews ADD CONSTRAINT check_interviews_status CHECK (status IN ({int_statuses_str}))"))

            elif "sqlite" in str(engine.url):
                logger.warning("SQLite detected. SQLite requires table recreation for constraint changes. This script only handles MySQL directly for now.")
                # If SQLite is needed, I'd have to use a pattern like migrate_db.py
            
            trans.commit()
            logger.info("Migration successful!")
        except Exception as e:
            trans.rollback()
            logger.error(f"Migration failed: {e}")
            raise e

if __name__ == "__main__":
    update_constraints()
