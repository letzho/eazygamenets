-- Migration script to update transactions table for external payment methods
-- This allows external payment methods (eNETS, NETS QR) to create transactions without cards

BEGIN;

-- Add user_id column if it doesn't exist
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'transactions' AND column_name = 'user_id') THEN
        ALTER TABLE public.transactions ADD COLUMN user_id integer REFERENCES public.users(id) ON DELETE CASCADE;
        COMMENT ON COLUMN public.transactions.user_id IS 'User ID who made the transaction';
    END IF;
END $$;

-- Drop the existing NOT NULL constraint on card_id
ALTER TABLE public.transactions ALTER COLUMN card_id DROP NOT NULL;

-- Add a comment explaining the change
COMMENT ON COLUMN public.transactions.card_id IS 'Card ID for card-based transactions, NULL for external payment methods (eNETS, NETS QR)';

-- Create index on user_id if it doesn't exist
CREATE INDEX IF NOT EXISTS idx_tx_user_time ON public.transactions(user_id, "time");

COMMIT;
