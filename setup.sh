#!/bin/bash
# NexBoard Quick Start Script

echo "🚀 NexBoard Setup"
echo "=================="

# Check Node.js
if ! command -v node &> /dev/null; then
  echo "❌ Node.js not found. Install from https://nodejs.org"
  exit 1
fi
echo "✅ Node.js $(node -v)"

# Setup backend
echo ""
echo "📦 Installing backend dependencies..."
cd backend
cp -n .env.example .env 2>/dev/null && echo "📋 Created backend/.env from example" || echo "ℹ️  backend/.env already exists"
mkdir -p uploads logs
npm install
echo "✅ Backend ready"

# Setup frontend
echo ""
echo "📦 Installing frontend dependencies..."
cd ../frontend
cp -n .env.example .env 2>/dev/null && echo "📋 Created frontend/.env from example" || echo "ℹ️  frontend/.env already exists"
npm install
echo "✅ Frontend ready"

echo ""
echo "🎉 Setup complete!"
echo ""
echo "⚠️  Before starting, configure your .env files:"
echo "   • backend/.env  → MONGODB_URI, JWT_SECRET, Google OAuth"
echo "   • frontend/.env → REACT_APP_API_URL, REACT_APP_SOCKET_URL"
echo ""
echo "▶️  To start development:"
echo "   Terminal 1: cd backend && npm run dev"
echo "   Terminal 2: cd frontend && npm start"
echo ""
echo "🌐 Open http://localhost:3000"
