#!/bin/bash
# RLBot Auto-Startup Script

# Navigate to the directory where the script is located
cd "$(dirname "$0")"

echo "[$(date)] Starting RLBot..." >> startup.log

# Ensure Docker is accessible (add path if needed, but usually fine in crontab if path is standard)
export PATH=$PATH:/usr/local/bin:/usr/bin

# Start services
docker compose -f docker-compose.prod.yml up -d >> startup.log 2>&1

echo "[$(date)] RLBot startup command executed." >> startup.log
