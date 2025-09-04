#!/bin/bash

echo "========================================"
echo "EazyGame Project Setup for Junior"
echo "========================================"

echo ""
echo "Step 1: Installing dependencies..."
npm install
cd backend
npm install
cd ../eazygame
npm install
cd ..

echo ""
echo "Step 2: Setting up database..."
echo "Please make sure PostgreSQL is running and create a database named 'eazygame_db'"
echo "Then run: psql -d eazygame_db -f backend/complete_database_setup.sql"

echo ""
echo "Step 3: Seeding database..."
cd backend
node seed.js
cd ..

echo ""
echo "Step 4: Creating environment file..."
echo "Please create backend/.env with your database connection string:"
echo "DATABASE_URL=postgresql://username:password@localhost:5432/eazygame_db"
echo "PORT=3002"
echo "NODE_ENV=development"

echo ""
echo "Setup complete!"
echo ""
echo "To run the application:"
echo "1. Start backend: cd backend && node index.js"
echo "2. Start frontend: cd eazygame && npm run dev"
echo ""
echo "Test users:"
echo "- lsheang@yahoo.com / password1"
echo "- evanlee@gmail.com / password2"
echo "- shilin@gmail.com / password3"
echo ""
