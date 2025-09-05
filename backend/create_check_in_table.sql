-- Create check_ins table for daily check-in functionality
CREATE TABLE IF NOT EXISTS check_ins (
    id SERIAL PRIMARY KEY,
    user_id VARCHAR(255) NOT NULL,
    last_check_in TIMESTAMP,
    current_streak INTEGER DEFAULT 0,
    total_check_ins INTEGER DEFAULT 0,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

-- Create index on user_id for faster lookups
CREATE INDEX IF NOT EXISTS idx_check_ins_user_id ON check_ins(user_id);

-- Add unique constraint to ensure one record per user
ALTER TABLE check_ins ADD CONSTRAINT unique_user_check_in UNIQUE (user_id);







