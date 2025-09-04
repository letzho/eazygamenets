# 🚀 Complete Setup Guide for EazyGame Project

## 📋 Prerequisites
- Node.js (v18 or higher)
- PostgreSQL database
- Git

## 🗄️ Database Setup

### Step 1: Create PostgreSQL Database
```sql
-- Connect to PostgreSQL and create database
CREATE DATABASE eazygame_db;
```

### Step 2: Run Database Setup Script
```bash
# Navigate to backend folder
cd backend

# Run the complete database setup
psql -d eazygame_db -f complete_database_setup.sql
```

### Step 3: Seed the Database
```bash
# Run the seed script
node seed.js
```

## 🔧 Environment Setup

### Step 1: Install Dependencies
```bash
# Install root dependencies
npm install

# Install backend dependencies
cd backend
npm install

# Install frontend dependencies
cd ../eazygame
npm install
```

### Step 2: Create Environment File
Create `backend/.env` file:
```env
DATABASE_URL=postgresql://username:password@localhost:5432/eazygame_db
PORT=3002
NODE_ENV=development
```

## 🚀 Running the Application

### Step 1: Start Backend
```bash
cd backend
node index.js
```

### Step 2: Start Frontend (in new terminal)
```bash
cd eazygame
npm run dev
```

## 🔍 Troubleshooting

### Database Issues
- Ensure PostgreSQL is running
- Check database connection string
- Verify all tables are created
- Run seed script if data is missing

### User Authentication Issues
- Check if users table has data
- Verify user IDs are numeric
- Check NFC payment user mapping

### Transaction Issues
- Ensure transactions table has 'type' column
- Check if transactions are properly categorized
- Verify API endpoints are working

## 📁 Important Files
- `backend/complete_database_setup.sql` - Complete database schema
- `backend/seed.js` - Sample data
- `eazygame/src/config.js` - API configuration
- `backend/.env` - Environment variables

## 🆘 Common Issues
1. **Database connection failed**: Check DATABASE_URL in .env
2. **User authentication failed**: Run seed script to create users
3. **Transactions not showing**: Check if 'type' column exists
4. **NFC payment not working**: Verify user mapping in NFCModal.jsx
