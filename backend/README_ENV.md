# Environment Variables Setup

Create a `.env` file in the backend directory with the following variables:

## Required Variables

```env
# Database Configuration
DB_USER=your_db_user
DB_HOST=your_db_host
DB_NAME=your_db_name
DB_PASSWORD=your_db_password
DB_PORT=5432

# Email Configuration (for split bill feature)
EMAIL_USER=your_email@gmail.com
EMAIL_PASS=your_email_password

# Twilio Configuration (for WhatsApp split bill feature)
TWILIO_ACCOUNT_SID=your_twilio_account_sid
TWILIO_AUTH_TOKEN=your_twilio_auth_token
TWILIO_WHATSAPP_FROM=whatsapp:+14155238886

# OpenAI API Key (for AI chatbot)
OPENAI_API_KEY=your_openai_api_key_here

# Google Places API Key (for nearby places)
GOOGLE_PLACES_API_KEY=your_google_places_api_key_here

# Server Configuration
PORT=3001
```

## Getting OpenAI API Key

1. Go to https://platform.openai.com/
2. Sign up or log in to your account
3. Navigate to API Keys section
4. Create a new API key
5. Copy the key and paste it in the .env file

## Getting Twilio Credentials (for WhatsApp)

1. Go to https://www.twilio.com/
2. Sign up or log in to your account
3. Navigate to Console Dashboard
4. Find your Account SID and Auth Token
5. For WhatsApp, you'll need to:
   - Join the Twilio WhatsApp Sandbox by sending the provided code to +14155238886
   - Or get a dedicated WhatsApp Business number
6. Set TWILIO_WHATSAPP_FROM to your WhatsApp sender (e.g., whatsapp:+14155238886 for sandbox)
7. Add these credentials to your .env file

## Features that require API keys:

### OpenAI API (AI Chatbot)
- Used in the AI Eaze chatbot feature
- Provides intelligent responses to user queries
- Falls back to simple responses if API key is not provided

### Google Places API (Near Me Feature)
- Used for finding nearby restaurants and food places
- Provides real photos and information from Google Places
- Requires Google Cloud Console project with Places API enabled

### Email Configuration (Split Bill)
- Used for sending split bill requests via email
- Requires Gmail account with app password

### Twilio Configuration (WhatsApp Split Bill)
- Used for sending split bill requests via WhatsApp
- Requires Twilio account with WhatsApp capabilities
- Supports both sandbox and production WhatsApp numbers
- Environment variables: TWILIO_ID, TWILIO_TOKEN, TWILIO_WHATSAPP_FROM

## Security Notes

- Never commit the .env file to version control
- Keep your API keys secure and private
- Rotate API keys regularly
- Use environment-specific .env files for different deployments
