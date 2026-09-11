#!/usr/bin/env bash
# ==============================================================================
# NetTopology - Local Direct Hardware SSH Runner Script
# Runs the full-stack panel directly on your Linux host for direct switch/router access
# ==============================================================================

set -e

RED='\033[0;31m'
GREEN='\033[0;32m'
CYAN='\033[0;36m'
YELLOW='\033[1;33m'
NC='\033[0m'

echo -e "${CYAN}======================================================${NC}"
echo -e "${CYAN}  NetTopology Enterprise - Real Hardware SSH Engine   ${NC}"
echo -e "${CYAN}======================================================${NC}"

# Check for Node.js
if ! command -v node &> /dev/null; then
    echo -e "${RED}[ERROR] Node.js is not installed. Please install Node.js 18+ or 20+.${NC}"
    exit 1
fi

# Check for Python 3
if ! command -v python3 &> /dev/null; then
    echo -e "${RED}[ERROR] Python 3 is not installed. Please install python3.${NC}"
    exit 1
fi

echo -e "${GREEN}[*] Node.js version:${NC} $(node -v)"
echo -e "${GREEN}[*] Python version:${NC} $(python3 --version)"

# Install dependencies if node_modules missing
if [ ! -d "node_modules" ]; then
    echo -e "${YELLOW}[*] Installing dependencies...${NC}"
    npm install --legacy-peer-deps
fi

# Build project if dist/server.cjs missing
if [ ! -f "dist/server.cjs" ]; then
    echo -e "${YELLOW}[*] Building production bundle...${NC}"
    npm run build
fi

echo -e "${GREEN}[✔] Launching NetTopology Full-Stack Server on port 3000...${NC}"
echo -e "${CYAN}[*] Access Web UI at:${NC} http://localhost:3000 or http://$(hostname -I | awk '{print $1}'):3000"
echo -e "${CYAN}[*] Direct SSH Port 22 connections are enabled via WebSocket gateway /ws/ssh${NC}"

export NODE_ENV=production
export PORT=3000
export HOST=0.0.0.0
export PYTHON_PORT=5001

node dist/server.cjs
