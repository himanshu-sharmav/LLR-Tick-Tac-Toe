#!/bin/bash
# AWS EC2 deployment script for Nakama Tic-Tac-Toe
# Run this on a fresh Ubuntu 22.04 EC2 instance (t3.small or larger)
#
# Prerequisites:
#   - EC2 instance with security group allowing ports 22, 80, 443, 7350, 7351
#   - SSH access to the instance
#   - Domain pointed to the instance's public IP (for TLS)
#
# Usage: ssh ubuntu@<EC2_IP> 'bash -s' < deploy.sh

set -euo pipefail

echo "=== Tic-Tac-Toe Nakama Server Deployment ==="

# 1. Install Docker
echo "--- Installing Docker ---"
sudo apt-get update -y
sudo apt-get install -y ca-certificates curl gnupg lsb-release
sudo mkdir -p /etc/apt/keyrings
curl -fsSL https://download.docker.com/linux/ubuntu/gpg | sudo gpg --dearmor -o /etc/apt/keyrings/docker.gpg
echo "deb [arch=$(dpkg --print-architecture) signed-by=/etc/apt/keyrings/docker.gpg] https://download.docker.com/linux/ubuntu $(lsb_release -cs) stable" | sudo tee /etc/apt/sources.list.d/docker.list > /dev/null
sudo apt-get update -y
sudo apt-get install -y docker-ce docker-ce-cli containerd.io docker-compose-plugin
sudo usermod -aG docker $USER

# 2. Install Nginx + Certbot
echo "--- Installing Nginx + Certbot ---"
sudo apt-get install -y nginx certbot python3-certbot-nginx

# 3. Clone the project
echo "--- Cloning project ---"
if [ ! -d "/opt/ttt-server" ]; then
    sudo mkdir -p /opt/ttt-server
    sudo chown $USER:$USER /opt/ttt-server
fi

echo "Copy your project files to /opt/ttt-server, then run:"
echo ""
echo "  cd /opt/ttt-server"
echo "  # Create .env file with production secrets:"
echo "  cat > .env << EOF"
echo "  DB_PASSWORD=your_secure_db_password_here"
echo "  NAKAMA_SERVER_KEY=your_random_32char_key_here"
echo "  NAKAMA_ENCRYPTION_KEY=your_random_32char_key_here"
echo "  NAKAMA_HTTP_KEY=your_random_32char_key_here"
echo "  EOF"
echo ""
echo "  # Start services:"
echo "  docker compose -f docker-compose.prod.yml up -d --build"
echo ""
echo "  # Setup TLS (replace with your domain):"
echo "  sudo certbot --nginx -d your-domain.com"
echo ""
echo "  # Copy nginx config:"
echo "  sudo cp deployment/nginx.conf /etc/nginx/sites-available/default"
echo "  sudo nginx -t && sudo systemctl reload nginx"
echo ""
echo "=== Deployment prerequisites complete ==="
