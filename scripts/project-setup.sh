#!/bin/bash

# Collaborative Whiteboard - Initial Setup Script
# This script automates Phase 1: Initial Setup from the technical blueprint

set -e  # Exit on any error

PROJECT_ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$PROJECT_ROOT"

echo "=========================================="
echo "Collaborative Whiteboard - Setup Script"
echo "=========================================="
echo "Project root: $PROJECT_ROOT"
echo ""

# Step 1: Initialize npm with default settings
echo "[1/7] Initializing npm project..."
if [ ! -f "package.json" ]; then
    npm init -y
    echo "✓ package.json created"
else
    echo "✓ package.json already exists"
fi
echo ""

# Step 2: Install dependencies (express and socket.io)
echo "[2/7] Installing dependencies (express, socket.io)..."
npm install express socket.io
echo "✓ Dependencies installed"
echo ""

# Step 3: Install optional dev dependency (nodemon)
echo "[3/7] Installing optional dev dependency (nodemon)..."
npm install --save-dev nodemon
echo "✓ nodemon installed"
echo ""

# Step 4: Create folder structure
echo "[4/7] Creating folder structure..."
mkdir -p public
echo "✓ public/ directory created"
echo ""

# Step 5: Create files in public folder
echo "[5/7] Creating files in public/ folder..."
touch public/index.html
echo "✓ public/index.html created"
touch public/app.js
echo "✓ public/app.js created"
touch public/style.css
echo "✓ public/style.css created"
echo ""

# Step 6: Create server.js in root
echo "[6/7] Creating server.js in root..."
touch server.js
echo "✓ server.js created"
echo ""

# Step 7: Update package.json with npm scripts
echo "[7/7] Updating package.json with npm scripts..."
node -e "
const fs = require('fs');
const path = require('path');
const packagePath = path.join(process.cwd(), 'package.json');
const packageJson = JSON.parse(fs.readFileSync(packagePath, 'utf8'));

// Ensure scripts object exists
if (!packageJson.scripts) {
    packageJson.scripts = {};
}

// Add start script
packageJson.scripts.start = 'node server.js';

// Add dev script (nodemon is installed)
packageJson.scripts.dev = 'nodemon server.js';

// Write back to file
fs.writeFileSync(packagePath, JSON.stringify(packageJson, null, 2) + '\n');
"
echo "✓ npm scripts added to package.json"
echo ""

# Summary
echo "=========================================="
echo "Setup Complete!"
echo "=========================================="
echo "Project structure:"
echo "  collaborative-whiteboard/"
echo "  ├── server.js"
echo "  ├── package.json"
echo "  ├── package-lock.json"
echo "  ├── node_modules/"
echo "  └── public/"
echo "      ├── index.html"
echo "      ├── app.js"
echo "      └── style.css"
echo ""
echo "Next steps:"
echo "  1. Implement server.js (Phase 2)"
echo "  2. Implement frontend files (Phase 3)"
echo "  3. Run with: npm run dev (or npm start)"
echo ""
echo "=========================================="
