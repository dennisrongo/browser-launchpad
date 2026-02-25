#!/bin/bash

# Browser Launchpad - Chrome Extension
# Development initialization script

set -e

echo "🚀 Initializing Browser Launchpad development environment..."

# Check Node.js installation
if ! command -v node &> /dev/null; then
    echo "❌ Node.js is not installed. Please install Node.js first."
    exit 1
fi

echo "✅ Node.js version: $(node --version)"
echo "✅ npm version: $(npm --version)"

# Install dependencies
echo "📦 Installing dependencies..."
npm install

# Create build directory if it doesn't exist
mkdir -p dist

# Check if Chrome is installed
if command -v google-chrome &> /dev/null; then
    echo "✅ Google Chrome found"
elif command -v chromium &> /dev/null; then
    echo "✅ Chromium found"
else
    echo "⚠️  Chrome/Chromium not found in PATH. You'll need to install it to test the extension."
fi

echo ""
echo "✨ Initialization complete!"
echo ""
echo "📋 Next steps:"
echo "   1. Run 'npm run dev' to start development server"
echo "   2. Open Chrome and navigate to chrome://extensions"
echo "   3. Enable 'Developer mode'"
echo "   4. Click 'Load unpacked' and select the 'dist' folder"
echo "   5. Open a new tab to see the extension"
echo ""
echo "🔧 Available commands:"
echo "   npm run dev    - Start development server with hot reload"
echo "   npm run build  - Build production bundle"
echo "   npm run lint   - Run linter"
echo "   npm run type   - Run TypeScript type check"
echo ""
