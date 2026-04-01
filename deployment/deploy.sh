#!/bin/bash
# AWS EC2 deployment script for Multiplayer Tic-Tac-Toe
# Run on a fresh Ubuntu 22.04 EC2 instance (t3.small or larger)
#
# Security Group: allow inbound TCP 22, 80
#
# Usage:
#   1. scp -r . ubuntu@<EC2_IP>:/opt/ttt-server/
#   2. ssh ubuntu@<EC2_IP> 'cd /opt/ttt-server && bash deployment/deploy.sh'

set -euo pipefail

echo "=== Tic-Tac-Toe Deployment ==="

# 1. Install Docker if not present
if ! command -v docker &> /dev/null; then
    echo "--- Installing Docker ---"
    sudo apt-get update -y
    sudo apt-get install -y ca-certificates curl gnupg
    sudo install -m 0755 -d /etc/apt/keyrings
    curl -fsSL https://download.docker.com/linux/ubuntu/gpg | sudo gpg --dearmor -o /etc/apt/keyrings/docker.gpg
    sudo chmod a+r /etc/apt/keyrings/docker.gpg
    echo "deb [arch=$(dpkg --print-architecture) signed-by=/etc/apt/keyrings/docker.gpg] https://download.docker.com/linux/ubuntu $(lsb_release -cs) stable" | sudo tee /etc/apt/sources.list.d/docker.list > /dev/null
    sudo apt-get update -y
    sudo apt-get install -y docker-ce docker-ce-cli containerd.io docker-compose-plugin
    sudo usermod -aG docker $USER
    echo "Docker installed. You may need to log out and back in for group changes."
fi

# 2. Create .env if it doesn't exist
if [ ! -f .env ]; then
    echo "--- Creating .env with default secrets ---"
    PUBLIC_IP=$(curl -s http://169.254.169.254/latest/meta-data/public-ipv4 2>/dev/null || echo "localhost")
    cat > .env << EOF
DB_PASSWORD=$(openssl rand -hex 16)
NAKAMA_SERVER_KEY=defaultkey
NAKAMA_ENCRYPTION_KEY=$(openssl rand -hex 16)
NAKAMA_HTTP_KEY=$(openssl rand -hex 16)
PUBLIC_HOST=${PUBLIC_IP}
EOF
    echo ".env created with PUBLIC_HOST=${PUBLIC_IP}"
fi

# 3. Build and start all services
echo "--- Building and starting services ---"
sudo docker compose -f docker-compose.prod.yml up -d --build

# 4. Wait for services to be healthy
echo "--- Waiting for services to start ---"
sleep 10

# 5. Check status
echo ""
echo "=== Deployment Complete ==="
sudo docker compose -f docker-compose.prod.yml ps
echo ""
PUBLIC_IP=$(grep PUBLIC_HOST .env | cut -d= -f2)
echo "Frontend:       http://${PUBLIC_IP}"
echo "Nakama API:     http://${PUBLIC_IP}/v2"
echo "Nakama Console: http://${PUBLIC_IP}/console"
echo ""
echo "Default console login: admin / password"
