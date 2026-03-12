import sqlite3

def run():
    con = sqlite3.connect('sql_app.db')
    cur = con.cursor()
    
    cur.execute("PRAGMA foreign_keys=off;")
    con.commit()
    
    # Create the new table
    schema = """
    CREATE TABLE IF NOT EXISTS "applications_new" (
            id INTEGER NOT NULL, 
            job_id INTEGER NOT NULL, 
            candidate_name VARCHAR(255) NOT NULL, 
            candidate_email VARCHAR(255) NOT NULL, 
            candidate_phone TEXT, 
            resume_file_path VARCHAR(500), 
            resume_file_name VARCHAR(255), 
            candidate_photo_path VARCHAR(500), 
            status VARCHAR(50), 
            hr_notes TEXT, 
            resume_score FLOAT, 
            aptitude_score FLOAT, 
            interview_score FLOAT, 
            composite_score FLOAT, 
            recommendation VARCHAR(50), 
            applied_at DATETIME DEFAULT CURRENT_TIMESTAMP, 
            updated_at DATETIME DEFAULT CURRENT_TIMESTAMP, 
            PRIMARY KEY (id), 
            CONSTRAINT check_applications_status CHECK (status IN (
                'applied', 'aptitude_round', 'ai_interview', 'ai_interview_completed', 
                'review_later', 'physical_interview', 'hired', 'rejected', 'processing_failed'
            )), 
            CONSTRAINT uq_application_job_email UNIQUE (job_id, candidate_email), 
            FOREIGN KEY(job_id) REFERENCES jobs (id)
        );
    """
    cur.execute("BEGIN;")
    cur.execute(schema)
    cur.execute("INSERT INTO applications_new SELECT * FROM applications;")
    cur.execute("DROP TABLE applications;")
    cur.execute("ALTER TABLE applications_new RENAME TO applications;")
    
    # Re-create indices
    indexes = [
        "CREATE INDEX ix_applications_composite_score ON applications (composite_score);",
        "CREATE INDEX ix_applications_job_id ON applications (job_id);",
        "CREATE INDEX ix_applications_status ON applications (status);",
        "CREATE INDEX ix_applications_applied_at ON applications (applied_at);",
        "CREATE INDEX ix_applications_candidate_email ON applications (candidate_email);",
        "CREATE INDEX ix_applications_job_status ON applications (job_id, status);",
        "CREATE INDEX ix_applications_id ON applications (id);",
        "CREATE UNIQUE INDEX uq_application_job_email ON applications(job_id, candidate_email);"
    ]
    for idx in indexes:
        cur.execute(idx)
        
    con.commit()
    cur.execute("PRAGMA foreign_keys=on;")
    con.close()
    print("Successfully updated applications table CHECK constraint")

if __name__ == '__main__':
    run()
