#!/bin/bash

# Smart Attendance System - Quick Deploy Script
# This script helps you deploy both frontend and backend to Vercel

echo "🚀 Smart Attendance System - Deployment Script"
echo "================================================"
echo ""

# Check if vercel CLI is installed
if ! command -v vercel &> /dev/null
then
    echo "❌ Vercel CLI is not installed"
    echo "📦 Installing Vercel CLI..."
    npm install -g vercel
fi

echo "✅ Vercel CLI is ready"
echo ""

# Ask which part to deploy
echo "What would you like to deploy?"
echo "1) Backend only"
echo "2) Frontend only"
echo "3) Both (Backend first, then Frontend)"
echo ""
read -p "Enter your choice (1-3): " choice

case $choice in
  1)
    echo ""
    echo "📦 Deploying Backend..."
    cd server
    vercel --prod
    echo ""
    echo "✅ Backend deployed!"
    echo "📝 Don't forget to:"
    echo "   1. Add environment variables in Vercel dashboard"
    echo "   2. Note your backend URL"
    ;;
  2)
    echo ""
    echo "📦 Deploying Frontend..."
    cd client
    vercel --prod
    echo ""
    echo "✅ Frontend deployed!"
    echo "📝 Don't forget to:"
    echo "   1. Add VITE_API_URL in Vercel dashboard"
    echo "   2. Update backend CLIENT_URL with this frontend URL"
    ;;
  3)
    echo ""
    echo "📦 Step 1: Deploying Backend..."
    cd server
    vercel --prod
    BACKEND_URL=$(vercel ls --prod | grep "smart-attendance" | head -1 | awk '{print $2}')
    cd ..
    
    echo ""
    echo "✅ Backend deployed!"
    echo "🔗 Backend URL: $BACKEND_URL"
    echo ""
    
    read -p "Press Enter to continue with Frontend deployment..."
    
    echo ""
    echo "📦 Step 2: Deploying Frontend..."
    cd client
    vercel --prod
    FRONTEND_URL=$(vercel ls --prod | grep "smart-attendance" | head -1 | awk '{print $2}')
    cd ..
    
    echo ""
    echo "✅ Frontend deployed!"
    echo "🔗 Frontend URL: $FRONTEND_URL"
    echo ""
    echo "📝 Next Steps:"
    echo "   1. Add environment variables in Vercel dashboard:"
    echo "      Backend: MONGO_URI, JWT_SECRET, CLIENT_URL=$FRONTEND_URL"
    echo "      Frontend: VITE_API_URL=$BACKEND_URL/api"
    echo "   2. Redeploy both projects after adding env variables"
    echo "   3. Test the deployment"
    ;;
  *)
    echo "❌ Invalid choice"
    exit 1
    ;;
esac

echo ""
echo "================================================"
echo "📚 For detailed instructions, see:"
echo "   - DEPLOYMENT_GUIDE.md"
echo "   - DEPLOYMENT_CHECKLIST.md"
echo ""
echo "🎉 Deployment process complete!"
