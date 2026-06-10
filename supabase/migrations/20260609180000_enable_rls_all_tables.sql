-- Enable Row Level Security (RLS) on all public tables with a default "deny all" policy for defense-in-depth

-- users
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "deny all" ON users;
CREATE POLICY "deny all" ON users FOR ALL TO public USING (false);

-- question_bank
ALTER TABLE question_bank ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "deny all" ON question_bank;
CREATE POLICY "deny all" ON question_bank FOR ALL TO public USING (false);

-- question_sets
ALTER TABLE question_sets ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "deny all" ON question_sets;
CREATE POLICY "deny all" ON question_sets FOR ALL TO public USING (false);

-- global_settings
ALTER TABLE global_settings ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "deny all" ON global_settings;
CREATE POLICY "deny all" ON global_settings FOR ALL TO public USING (false);

-- jobs
ALTER TABLE jobs ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "deny all" ON jobs;
CREATE POLICY "deny all" ON jobs FOR ALL TO public USING (false);

-- applications
ALTER TABLE applications ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "deny all" ON applications;
CREATE POLICY "deny all" ON applications FOR ALL TO public USING (false);

-- offers
ALTER TABLE offers ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "deny all" ON offers;
CREATE POLICY "deny all" ON offers FOR ALL TO public USING (false);

-- onboardings
ALTER TABLE onboardings ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "deny all" ON onboardings;
CREATE POLICY "deny all" ON onboardings FOR ALL TO public USING (false);

-- application_stages
ALTER TABLE application_stages ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "deny all" ON application_stages;
CREATE POLICY "deny all" ON application_stages FOR ALL TO public USING (false);

-- resume_extractions
ALTER TABLE resume_extractions ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "deny all" ON resume_extractions;
CREATE POLICY "deny all" ON resume_extractions FOR ALL TO public USING (false);

-- interviews
ALTER TABLE interviews ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "deny all" ON interviews;
CREATE POLICY "deny all" ON interviews FOR ALL TO public USING (false);

-- interview_questions
ALTER TABLE interview_questions ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "deny all" ON interview_questions;
CREATE POLICY "deny all" ON interview_questions FOR ALL TO public USING (false);

-- interview_answers
ALTER TABLE interview_answers ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "deny all" ON interview_answers;
CREATE POLICY "deny all" ON interview_answers FOR ALL TO public USING (false);

-- interview_answer_versions
ALTER TABLE interview_answer_versions ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "deny all" ON interview_answer_versions;
CREATE POLICY "deny all" ON interview_answer_versions FOR ALL TO public USING (false);

-- interview_reports
ALTER TABLE interview_reports ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "deny all" ON interview_reports;
CREATE POLICY "deny all" ON interview_reports FOR ALL TO public USING (false);

-- interview_issues
ALTER TABLE interview_issues ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "deny all" ON interview_issues;
CREATE POLICY "deny all" ON interview_issues FOR ALL TO public USING (false);

-- interview_feedbacks
ALTER TABLE interview_feedbacks ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "deny all" ON interview_feedbacks;
CREATE POLICY "deny all" ON interview_feedbacks FOR ALL TO public USING (false);

-- interview_monitoring_events
ALTER TABLE interview_monitoring_events ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "deny all" ON interview_monitoring_events;
CREATE POLICY "deny all" ON interview_monitoring_events FOR ALL TO public USING (false);

-- hiring_decisions
ALTER TABLE hiring_decisions ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "deny all" ON hiring_decisions;
CREATE POLICY "deny all" ON hiring_decisions FOR ALL TO public USING (false);

-- interview_sessions
ALTER TABLE interview_sessions ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "deny all" ON interview_sessions;
CREATE POLICY "deny all" ON interview_sessions FOR ALL TO public USING (false);

-- interview_events
ALTER TABLE interview_events ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "deny all" ON interview_events;
CREATE POLICY "deny all" ON interview_events FOR ALL TO public USING (false);

-- ai_evaluations
ALTER TABLE ai_evaluations ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "deny all" ON ai_evaluations;
CREATE POLICY "deny all" ON ai_evaluations FOR ALL TO public USING (false);

-- candidate_skills
ALTER TABLE candidate_skills ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "deny all" ON candidate_skills;
CREATE POLICY "deny all" ON candidate_skills FOR ALL TO public USING (false);

-- job_versions
ALTER TABLE job_versions ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "deny all" ON job_versions;
CREATE POLICY "deny all" ON job_versions FOR ALL TO public USING (false);

-- resume_extraction_versions
ALTER TABLE resume_extraction_versions ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "deny all" ON resume_extraction_versions;
CREATE POLICY "deny all" ON resume_extraction_versions FOR ALL TO public USING (false);

-- interview_report_versions
ALTER TABLE interview_report_versions ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "deny all" ON interview_report_versions;
CREATE POLICY "deny all" ON interview_report_versions FOR ALL TO public USING (false);

-- attachment_resumes
ALTER TABLE attachment_resumes ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "deny all" ON attachment_resumes;
CREATE POLICY "deny all" ON attachment_resumes FOR ALL TO public USING (false);

-- audit_logs
ALTER TABLE audit_logs ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "deny all" ON audit_logs;
CREATE POLICY "deny all" ON audit_logs FOR ALL TO public USING (false);

-- notifications
ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "deny all" ON notifications;
CREATE POLICY "deny all" ON notifications FOR ALL TO public USING (false);
