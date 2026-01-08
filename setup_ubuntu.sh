#!/bin/bash

# Setup script for Flask Recipe App on Ubuntu VM
# This script installs all dependencies and sets up the application to run directly without Docker

set -e  # Exit on any error

echo "=========================================="
echo "Flask Recipe App - Ubuntu Setup Script"
echo "=========================================="
echo ""

# Check if running as root
if [ "$EUID" -eq 0 ]; then
    echo "Please do not run this script as root (without sudo)"
    echo "Run it as a regular user: ./setup_ubuntu.sh"
    exit 1
fi

# Update package list
echo "[1/8] Updating package list..."
sudo apt update

# Install Python 2.7 and development tools
echo "[2/8] Installing Python 2.7..."
sudo apt install -y python2.7 python2.7-dev curl

# Install pip for Python 2.7
echo "[3/8] Installing pip for Python 2.7..."
if ! command -v pip2.7 &> /dev/null; then
    curl https://bootstrap.pypa.io/pip/2.7/get-pip.py -o /tmp/get-pip.py
    sudo python2.7 /tmp/get-pip.py
    rm /tmp/get-pip.py
else
    echo "pip2.7 already installed"
fi

# Install SQLite3 (usually pre-installed, but just in case)
echo "[4/8] Installing SQLite3..."
sudo apt install -y sqlite3

# Install Python dependencies
echo "[5/8] Installing Flask and dependencies..."
sudo pip2.7 install Flask==1.0.2 Werkzeug==0.14.1

# Configure firewall
echo "[6/8] Configuring firewall to allow port 3000..."
if command -v ufw &> /dev/null; then
    sudo ufw allow 3000/tcp
    echo "Firewall rule added for port 3000"
else
    echo "UFW not installed, skipping firewall configuration"
fi

# Get the current directory (where the script is located)
APP_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
APP_USER="$(whoami)"

# Create systemd service file
echo "[7/8] Creating systemd service..."
sudo tee /etc/systemd/system/flask-recipe-app.service > /dev/null <<EOF
[Unit]
Description=Flask Recipe App
After=network.target

[Service]
User=$APP_USER
WorkingDirectory=$APP_DIR
ExecStart=/usr/bin/python2.7 $APP_DIR/app.py
Restart=always
RestartSec=10
StandardOutput=journal
StandardError=journal

[Install]
WantedBy=multi-user.target
EOF

# Reload systemd and enable the service
echo "[8/8] Enabling and starting the service..."
sudo systemctl daemon-reload
sudo systemctl enable flask-recipe-app.service
sudo systemctl start flask-recipe-app.service

echo ""
echo "=========================================="
echo "Installation Complete!"
echo "=========================================="
echo ""
echo "The Flask Recipe App is now running as a systemd service."
echo ""
echo "Useful commands:"
echo "  - Check status:    sudo systemctl status flask-recipe-app"
echo "  - Stop service:    sudo systemctl stop flask-recipe-app"
echo "  - Start service:   sudo systemctl start flask-recipe-app"
echo "  - Restart service: sudo systemctl restart flask-recipe-app"
echo "  - View logs:       sudo journalctl -u flask-recipe-app -f"
echo ""
echo "Access the application at: http://$(hostname -I | awk '{print $1}'):3000"
echo ""
echo "=========================================="
echo "SECURITY WARNING"
echo "=========================================="
echo "Python 2.7 reached end-of-life in January 2020."
echo "Consider migrating to Python 3.x for production use."
echo "=========================================="
