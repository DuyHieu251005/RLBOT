#!/bin/bash
# RLBot Auto-Startup Script

# Navigate to the directory where the script is located
cd "$(dirname "$0")"

echo "[$(date)] Starting RLBot..." >> startup.log

# Ensure Docker is accessible (add path if needed, but usually fine in crontab if path is standard)
export PATH=$PATH:/usr/local/bin:/usr/bin

# Start services
echo "📥 Checking for updates..." >> startup.log
git pull origin main >> startup.log 2>&1
    
echo "🔨 Rebuilding containers if needed..." >> startup.log
docker compose -f docker-compose.prod.yml up -d --build --remove-orphans >> startup.log 2>&1

echo "[$(date)] RLBot startup command executed." >> startup.log
