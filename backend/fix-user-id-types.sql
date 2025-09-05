-- Fix data type mismatch between check_ins.user_id and users.id
BEGIN;

-- First, drop the foreign key constraint if it exists
ALTER TABLE check_ins DROP CONSTRAINT IF EXISTS check_ins_user_id_fkey;

-- Change user_id from varchar to integer
ALTER TABLE check_ins ALTER COLUMN user_id TYPE integer USING user_id::integer;

-- Re-add the foreign key constraint
ALTER TABLE check_ins ADD CONSTRAINT check_ins_user_id_fkey 
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE;

COMMIT;




