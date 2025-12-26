#!/bin/bash
# DuckDNS Auto-Update Script
# Updates DuckDNS record with current public IP
# Run via cron: */5 * * * * /home/hieukieu0543/RLBot/duckdns_update.sh >> /home/hieukieu0543/RLBot/duckdns.log 2>&1

# Configuration - UPDATE THIS TOKEN!
DUCKDNS_TOKEN="${DUCKDNS_TOKEN:-YOUR_DUCKDNS_TOKEN_HERE}"
DUCKDNS_DOMAIN="mc-sv-hcmus"

# Get current public IP
CURRENT_IP=$(curl -s https://api.ipify.org)

if [ -z "$CURRENT_IP" ]; then
    echo "$(date): ERROR - Could not get public IP"
    exit 1
fi

# Update DuckDNS
RESPONSE=$(curl -s "https://www.duckdns.org/update?domains=${DUCKDNS_DOMAIN}&token=${DUCKDNS_TOKEN}&ip=${CURRENT_IP}")

if [ "$RESPONSE" = "OK" ]; then
    echo "$(date): SUCCESS - Updated ${DUCKDNS_DOMAIN}.duckdns.org to ${CURRENT_IP}"
else
    echo "$(date): FAILED - Response: ${RESPONSE}"
    exit 1
fi
