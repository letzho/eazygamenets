-- Fix Heroku Database - Add missing type column
ALTER TABLE transactions ADD COLUMN IF NOT EXISTS type VARCHAR(10);

-- Add constraint
ALTER TABLE transactions ADD CONSTRAINT IF NOT EXISTS transactions_type_chk CHECK (type IN ('income','expense'));

-- Update existing records
UPDATE transactions SET type = 'income' WHERE amount > 0;
UPDATE transactions SET type = 'expense' WHERE amount < 0;

-- Verify the fix
\d transactions;
SELECT * FROM transactions ORDER BY time DESC LIMIT 5;
