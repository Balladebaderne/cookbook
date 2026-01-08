# Ubuntu VM Setup Guide - Flask Recipe App

This guide explains how to run the Flask Recipe App directly on an Ubuntu VM without Docker.

## Quick Setup (Automated)

1. Upload the entire project folder to your Ubuntu VM
2. Navigate to the project directory:
   ```bash
   cd /path/to/demoprojekt
   ```
3. Make the setup script executable:
   ```bash
   chmod +x setup_ubuntu.sh
   ```
4. Run the setup script:
   ```bash
   ./setup_ubuntu.sh
   ```

The script will:
- Install Python 2.7 and pip
- Install Flask and dependencies
- Configure the firewall
- Create and start a systemd service
- Set up automatic restart on boot

## Manual Setup (Step by Step)

### 1. Update System
```bash
sudo apt update
```

### 2. Install Python 2.7
```bash
sudo apt install -y python2.7 python2.7-dev curl
```

### 3. Install pip for Python 2.7
```bash
curl https://bootstrap.pypa.io/pip/2.7/get-pip.py -o get-pip.py
sudo python2.7 get-pip.py
rm get-pip.py
```

### 4. Install SQLite3
```bash
sudo apt install -y sqlite3
```

### 5. Install Python Dependencies
```bash
sudo pip2.7 install Flask==1.0.2 Werkzeug==0.14.1
```

### 6. Configure Firewall
```bash
sudo ufw allow 3000/tcp
```

### 7. Run the Application

**Option A: Run directly (for testing)**
```bash
cd /path/to/demoprojekt
python2.7 app.py
```

**Option B: Run as systemd service (recommended for production)**

Create service file:
```bash
sudo nano /etc/systemd/system/flask-recipe-app.service
```

Add this content (replace `/path/to/demoprojekt` and `your-username`):
```ini
[Unit]
Description=Flask Recipe App
After=network.target

[Service]
User=your-username
WorkingDirectory=/path/to/demoprojekt
ExecStart=/usr/bin/python2.7 /path/to/demoprojekt/app.py
Restart=always
RestartSec=10
StandardOutput=journal
StandardError=journal

[Install]
WantedBy=multi-user.target
```

Enable and start the service:
```bash
sudo systemctl daemon-reload
sudo systemctl enable flask-recipe-app.service
sudo systemctl start flask-recipe-app.service
```

## Service Management Commands

```bash
# Check service status
sudo systemctl status flask-recipe-app

# Start the service
sudo systemctl start flask-recipe-app

# Stop the service
sudo systemctl stop flask-recipe-app

# Restart the service
sudo systemctl restart flask-recipe-app

# View logs
sudo journalctl -u flask-recipe-app -f

# Disable auto-start on boot
sudo systemctl disable flask-recipe-app
```

## Accessing the Application

Once running, access the application at:
```
http://your-vm-ip-address:3000
```

To find your VM's IP address:
```bash
hostname -I
```

## Troubleshooting

### Application won't start
```bash
# Check if port 3000 is already in use
sudo netstat -tulpn | grep 3000

# Check service logs
sudo journalctl -u flask-recipe-app -n 50
```

### Can't access from browser
```bash
# Check if firewall is blocking
sudo ufw status

# Verify the app is listening on all interfaces
sudo netstat -tulpn | grep 3000
# Should show: 0.0.0.0:3000
```

### Database errors
```bash
# Check if database file has correct permissions
ls -la /path/to/demoprojekt/app.db

# If needed, fix permissions
chmod 644 /path/to/demoprojekt/app.db
```

## Azure-Specific Configuration

### Network Security Group (NSG)
In Azure Portal, ensure your VM's NSG allows inbound traffic on port 3000:
1. Go to your VM → Networking → Add inbound port rule
2. Destination port ranges: 3000
3. Protocol: TCP
4. Action: Allow

### Public IP
If you need external access:
1. Ensure your VM has a public IP assigned
2. Use the public IP to access: `http://your-public-ip:3000`

## Important Security Notes

⚠️ **WARNING**: Python 2.7 reached end-of-life in January 2020 and no longer receives security updates.

**For production use, you should:**
- Migrate to Python 3.x
- Use a production WSGI server (gunicorn, uWSGI)
- Set up a reverse proxy (nginx, Apache)
- Use HTTPS with SSL certificates
- Implement proper authentication
- Use environment variables for configuration
- Set DEBUG=False in production

## Files Created/Modified

The application will create:
- `app.db` - SQLite database file (auto-created on first run)
- Database will be initialized with sample recipes on first run

## Uninstalling

To remove the application and service:
```bash
# Stop and disable service
sudo systemctl stop flask-recipe-app
sudo systemctl disable flask-recipe-app

# Remove service file
sudo rm /etc/systemd/system/flask-recipe-app.service
sudo systemctl daemon-reload

# Remove firewall rule
sudo ufw delete allow 3000/tcp

# Optionally remove Python packages
sudo pip2.7 uninstall Flask Werkzeug
```
