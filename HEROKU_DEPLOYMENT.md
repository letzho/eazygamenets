# 🚀 Heroku Deployment Guide

## Prerequisites
1. Install Heroku CLI: https://devcenter.heroku.com/articles/heroku-cli
2. Your code is already on GitHub
3. You have a Heroku account

## Step 1: Login to Heroku
```bash
heroku login
```

## Step 2: Create Heroku App
```bash
# Create a new Heroku app
heroku create your-app-name

# Or if you want to use the GitHub integration
# Go to Heroku Dashboard → New App → Connect to GitHub
```

## Step 3: Add PostgreSQL Database
```bash
# Add PostgreSQL addon (this will automatically set DATABASE_URL)
heroku addons:create heroku-postgresql:mini
```

## Step 4: Set Environment Variables
```bash
# Set your email credentials
heroku config:set EMAIL_USER=your-email@gmail.com
heroku config:set EMAIL_PASS=your-app-password

# Set Twilio credentials (optional)
heroku config:set TWILIO_ACCOUNT_SID=your-twilio-sid
heroku config:set TWILIO_AUTH_TOKEN=your-twilio-token
heroku config:set TWILIO_WHATSAPP_FROM=whatsapp:+14155238886

# Set NODE_ENV
heroku config:set NODE_ENV=production
```

## Step 5: Deploy from GitHub
1. Go to your Heroku Dashboard
2. Select your app
3. Go to "Deploy" tab
4. Connect to your GitHub repository
5. Select the main branch
6. Click "Deploy Branch"

## Step 6: Verify Deployment
```bash
# Check your app logs
heroku logs --tail

# Open your app
heroku open
```

## Step 7: Database Setup
The database will be automatically set up when the app starts, but you can also run it manually:
```bash
# Run database setup manually
heroku run npm run setup-db
```

## Troubleshooting

### If deployment fails:
1. Check logs: `heroku logs --tail`
2. Ensure all environment variables are set
3. Verify your GitHub repository is public or connected properly

### If database connection fails:
1. Verify DATABASE_URL is set: `heroku config:get DATABASE_URL`
2. Check if PostgreSQL addon is active: `heroku addons`

### If app crashes:
1. Check the logs for specific errors
2. Ensure all required environment variables are set
3. Verify the database setup completed successfully

## Environment Variables Reference
- `DATABASE_URL`: Automatically set by Heroku PostgreSQL
- `EMAIL_USER`: Your Gmail address
- `EMAIL_PASS`: Your Gmail app password
- `TWILIO_ACCOUNT_SID`: Twilio Account SID (optional)
- `TWILIO_AUTH_TOKEN`: Twilio Auth Token (optional)
- `TWILIO_WHATSAPP_FROM`: Twilio WhatsApp number (optional)
- `NODE_ENV`: Set to "production"

## Database Schema
The following tables will be created automatically:
- `check_ins`: User check-in records
- `payments`: Payment transaction records
- `game_stats`: Gaming statistics
- Additional design columns as needed

## Support
If you encounter issues:
1. Check Heroku logs: `heroku logs --tail`
2. Verify all environment variables are set correctly
3. Ensure your GitHub repository is properly connected
