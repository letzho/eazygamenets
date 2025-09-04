-- Create NFC Transactions table
CREATE TABLE IF NOT EXISTS nfc_transactions (
    id SERIAL PRIMARY KEY,
    sender_email VARCHAR(255) NOT NULL,
    recipient_email VARCHAR(255) NOT NULL,
    amount DECIMAL(10,2) NOT NULL,
    card_id INTEGER REFERENCES cards(id),
    timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    status VARCHAR(20) DEFAULT 'pending', -- 'pending', 'sent', 'received', 'cancelled'
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create index for faster queries
CREATE INDEX IF NOT EXISTS idx_nfc_transactions_sender ON nfc_transactions(sender_email);
CREATE INDEX IF NOT EXISTS idx_nfc_transactions_recipient ON nfc_transactions(recipient_email);
CREATE INDEX IF NOT EXISTS idx_nfc_transactions_status ON nfc_transactions(status);
CREATE INDEX IF NOT EXISTS idx_nfc_transactions_timestamp ON nfc_transactions(timestamp);
