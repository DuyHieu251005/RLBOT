#!/bin/bash

# ============================================
# RLBot Deployment Script for GCP VM
# Domain: rlbot.dpdns.org
# ============================================

set -e

echo "🚀 RLBot Deployment Script"
echo "=================================="

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Check if running as root
if [ "$EUID" -eq 0 ]; then 
    echo -e "${RED}❌ Please do not run as root. Run as normal user.${NC}"
    exit 1
fi

# Step 1: Install Docker if not installed
install_docker() {
    echo -e "${YELLOW}📦 Checking Docker installation...${NC}"
    
    if ! command -v docker &> /dev/null; then
        echo "Installing Docker..."
        sudo apt update
        sudo apt install -y docker.io docker-compose-v2
        sudo usermod -aG docker $USER
        echo -e "${GREEN}✅ Docker installed. Please logout and login again, then re-run this script.${NC}"
        exit 0
    else
        echo -e "${GREEN}✅ Docker is already installed${NC}"
    fi
}

# Step 2: Create required directories
create_directories() {
    echo -e "${YELLOW}📁 Creating directories...${NC}"
    mkdir -p nginx/certbot/conf
    mkdir -p nginx/certbot/www
    echo -e "${GREEN}✅ Directories created${NC}"
}

# Step 3: Check environment files
check_env() {
    echo -e "${YELLOW}🔐 Checking environment files...${NC}"
    
    if [ ! -f "backend/.env" ]; then
        echo -e "${RED}❌ backend/.env not found!${NC}"
        echo "Please copy backend/.env.example to backend/.env and fill in your values"
        exit 1
    fi
    
    if [ ! -f ".env" ]; then
        echo -e "${RED}❌ .env not found!${NC}"
        echo "Please copy .env.example to .env and fill in your values"
        exit 1
    fi
    
    echo -e "${GREEN}✅ Environment files found${NC}"
}

# Step 4: Initial deploy (without SSL)
deploy_initial() {
    echo -e "${YELLOW}🏗️ Initial deployment (no SSL)...${NC}"
    
    # Use init nginx config
    cp nginx/nginx.init.conf nginx/nginx.conf.bak
    cp nginx/nginx.init.conf nginx/nginx.conf
    
    # Build and start
    docker compose -f docker-compose.prod.yml build
    docker compose -f docker-compose.prod.yml up -d
    
    echo -e "${GREEN}✅ Initial deployment complete${NC}"
    echo -e "${YELLOW}⏳ Waiting 10 seconds for services to start...${NC}"
    sleep 10
}

# Step 5: Get SSL certificate
get_ssl() {
    echo -e "${YELLOW}🔒 Getting SSL certificate from Let's Encrypt...${NC}"
    
    read -p "Enter your email for SSL certificate: " EMAIL
    
    docker compose -f docker-compose.prod.yml run --rm certbot certonly \
        --webroot \
        --webroot-path=/var/www/certbot \
        -d rlbot.dpdns.org \
        --email $EMAIL \
        --agree-tos \
        --no-eff-email
    
    if [ $? -eq 0 ]; then
        echo -e "${GREEN}✅ SSL certificate obtained${NC}"
        
        # Switch to SSL nginx config
        cp nginx/nginx.conf.bak nginx/nginx.init.conf
        # nginx/nginx.conf already has SSL config
        
        # Restart nginx with SSL
        docker compose -f docker-compose.prod.yml restart nginx
        
        echo -e "${GREEN}✅ SSL enabled${NC}"
    else
        echo -e "${RED}❌ Failed to get SSL certificate${NC}"
        echo "Make sure DNS is pointing to this server's IP"
        exit 1
    fi
}

# Step 6: Full deploy with SSL
deploy_full() {
    echo -e "${YELLOW}🚀 Full deployment with SSL...${NC}"
    
    docker compose -f docker-compose.prod.yml down
    docker compose -f docker-compose.prod.yml build
    docker compose -f docker-compose.prod.yml up -d
    
    echo -e "${GREEN}✅ Deployment complete!${NC}"
}

# Step 7: Show status
show_status() {
    echo ""
    echo "=================================="
    echo -e "${GREEN}🎉 RLBot is now running!${NC}"
    echo "=================================="
    echo ""
    echo "📌 URLs:"
    echo "   - Website: https://rlbot.dpdns.org"
    echo "   - API: https://rlbot.dpdns.org/api"
    echo ""
    echo "📋 Useful commands:"
    echo "   - View logs: docker compose -f docker-compose.prod.yml logs -f"
    echo "   - Stop: docker compose -f docker-compose.prod.yml down"
    echo "   - Restart: docker compose -f docker-compose.prod.yml restart"
    echo ""
    docker compose -f docker-compose.prod.yml ps
}

# Main menu
main() {
    echo ""
    echo "Choose an option:"
    echo "1) Full install (first time)"
    echo "2) Deploy only (update code)"
    echo "3) Get/Renew SSL certificate"
    echo "4) Show status"
    echo "5) View logs"
    echo "6) Stop all services"
    echo ""
    read -p "Enter choice [1-6]: " choice
    
    case $choice in
        1)
            install_docker
            create_directories
            check_env
            deploy_initial
            get_ssl
            show_status
            ;;
        2)
            check_env
            deploy_full
            show_status
            ;;
        3)
            get_ssl
            ;;
        4)
            show_status
            ;;
        5)
            docker compose -f docker-compose.prod.yml logs -f
            ;;
        6)
            docker compose -f docker-compose.prod.yml down
            echo -e "${GREEN}✅ All services stopped${NC}"
            ;;
        *)
            echo -e "${RED}Invalid option${NC}"
            exit 1
            ;;
    esac
}

main
