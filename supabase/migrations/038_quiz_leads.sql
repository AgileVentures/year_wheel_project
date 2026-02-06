-- Quiz Leads Table Schema
-- Store quiz submissions for lead generation and analysis

CREATE TABLE IF NOT EXISTS quiz_leads (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  
  -- Contact Info
  email TEXT NOT NULL,
  
  -- Persona & Segmentation
  persona TEXT NOT NULL CHECK (persona IN ('marketing', 'project', 'education')),
  
  -- Quiz Data
  answers JSONB NOT NULL,
  pain_score INTEGER DEFAULT 0,
  readiness_score INTEGER DEFAULT 0,
  
  -- Metadata
  source_url TEXT,
  user_agent TEXT,
  ip_address INET,
  
  -- Status
  status TEXT DEFAULT 'new' CHECK (status IN ('new', 'contacted', 'converted', 'lost')),
  converted_to_user_id UUID REFERENCES auth.users(id),
  
  -- Timestamps
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  contacted_at TIMESTAMP WITH TIME ZONE,
  converted_at TIMESTAMP WITH TIME ZONE,
  
  -- Indexes for common queries
  CONSTRAINT unique_email_persona UNIQUE(email, persona)
);

-- Indexes for performance
CREATE INDEX idx_quiz_leads_persona ON quiz_leads(persona);
CREATE INDEX idx_quiz_leads_created_at ON quiz_leads(created_at DESC);
CREATE INDEX idx_quiz_leads_pain_score ON quiz_leads(pain_score DESC);
CREATE INDEX idx_quiz_leads_status ON quiz_leads(status);
CREATE INDEX idx_quiz_leads_email ON quiz_leads(email);

-- RLS Policies
ALTER TABLE quiz_leads ENABLE ROW LEVEL SECURITY;

-- Admin can read all leads
CREATE POLICY "Admin can read quiz leads"
  ON quiz_leads
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.is_admin = true
    )
  );

-- Anyone can insert (public lead generation)
CREATE POLICY "Anyone can submit quiz"
  ON quiz_leads
  FOR INSERT
  TO anon, authenticated
  WITH CHECK (true);

-- Comments
COMMENT ON TABLE quiz_leads IS 'Stores quiz submissions for lead qualification and segmentation';
COMMENT ON COLUMN quiz_leads.persona IS 'Which persona quiz was taken: marketing, project, or education';
COMMENT ON COLUMN quiz_leads.pain_score IS 'Calculated from pain_ prefixed questions, indicates problem severity';
COMMENT ON COLUMN quiz_leads.readiness_score IS 'Calculated from readiness_ questions, indicates buying intent';
COMMENT ON COLUMN quiz_leads.answers IS 'Full JSONB of all quiz answers for analysis';
COMMENT ON COLUMN quiz_leads.status IS 'Lead lifecycle: new → contacted → converted/lost';

-- Helper function to calculate scores from answers
CREATE OR REPLACE FUNCTION calculate_quiz_scores(answers_json JSONB)
RETURNS TABLE(pain_score INT, readiness_score INT) AS $$
BEGIN
  RETURN QUERY
  SELECT
    -- Pain score: sum of scores from pain_ prefixed answers
    COALESCE(
      (SELECT SUM((value->>'score')::INT)
       FROM jsonb_each(answers_json)
       WHERE key LIKE 'pain_%'
       AND value ? 'score'),
      0
    )::INT AS pain_score,
    
    -- Readiness score: sum of scores from readiness_ prefixed answers
    COALESCE(
      (SELECT SUM((value->>'score')::INT)
       FROM jsonb_each(answers_json)
       WHERE key LIKE 'readiness_%'
       AND value ? 'score'),
      0
    )::INT AS readiness_score;
END;
$$ LANGUAGE plpgsql IMMUTABLE;

-- View for analytics
CREATE OR REPLACE VIEW quiz_lead_analytics AS
SELECT
  persona,
  COUNT(*) as total_submissions,
  AVG(pain_score) as avg_pain_score,
  AVG(readiness_score) as avg_readiness_score,
  COUNT(*) FILTER (WHERE pain_score > 15) as high_pain_count,
  COUNT(*) FILTER (WHERE pain_score BETWEEN 8 AND 15) as medium_pain_count,
  COUNT(*) FILTER (WHERE pain_score < 8) as low_pain_count,
  COUNT(*) FILTER (WHERE readiness_score >= 7) as high_intent_count,
  COUNT(*) FILTER (WHERE status = 'converted') as converted_count,
  ROUND(
    COUNT(*) FILTER (WHERE status = 'converted')::NUMERIC / 
    NULLIF(COUNT(*), 0) * 100,
    2
  ) as conversion_rate_percent,
  DATE_TRUNC('day', created_at) as submission_date
FROM quiz_leads
GROUP BY persona, DATE_TRUNC('day', created_at)
ORDER BY submission_date DESC, persona;

COMMENT ON VIEW quiz_lead_analytics IS 'Daily analytics for quiz lead generation by persona';
