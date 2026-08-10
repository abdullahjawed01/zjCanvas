# Deployment Guide — zjCanvas Production Server

This guide explains how to deploy **zjCanvas** on a VPS (Ubuntu/Debian) with domain **https://zjcanvas.com** using the automated `build.sh` script.

---

## One-Command Quick Start

### Step 1: Configure DNS
Follow [DNS_SETUP.md](DNS_SETUP.md) to point `zjcanvas.com` and `www.zjcanvas.com` to your VPS IP address.

### Step 2: Upload/Clone Repository to VPS
```bash
git clone https://github.com/yourusername/zjCanvas.git /tmp/zjCanvas
cd /tmp/zjCanvas
```

### Step 3: Configure Certbot Email
Open `build.sh` and edit the `CERTBOT_EMAIL` variable near the top:
```bash
CERTBOT_EMAIL="your-email@example.com"
```

### Step 4: Execute Automated Deployment
```bash
chmod +x build.sh
sudo ./build.sh
```

---

## What `build.sh` Does Automatically

1. **System Check**: Verifies root/sudo privileges.
2. **Dependencies**: Automatically installs `nginx`, `certbot`, and `python3-certbot-nginx` via `apt-get` if missing.
3. **Web Root**: Copies static files into `/var/www/zjcanvas.com`.
4. **Permissions**: Sets directory permissions to `755`, file permissions to `644`, and ownership to `www-data`.
5. **Nginx Configuration**: Creates and enables `/etc/nginx/sites-available/zjcanvas.com` with:
   - Gzip compression enabled
   - Cache-Control headers for media (1 year) & CSS/JS (30 days)
   - Security HTTP headers (HSTS, CSP, X-Frame-Options, X-Content-Type-Options, Referrer-Policy, Permissions-Policy)
   - Custom `404.html` error page
6. **SSL Certificate**: Runs Certbot to obtain free SSL certificates from Let's Encrypt for `zjcanvas.com` & `www.zjcanvas.com` and sets up HTTP -> HTTPS redirect.
7. **Service Reload**: Tests Nginx configuration and reloads Nginx safely.
8. **Health Checks**: Tests local HTTP response and outputs final status.

---

## Redeploying & Updating the Site

Whenever you make changes to the repository, push them to GitHub and pull on your VPS, then re-run:

```bash
cd /path/to/zjCanvas
git pull
sudo ./build.sh
```

---

## Operational Commands & Troubleshooting

### Check Nginx Status & Logs
```bash
# Check service status
sudo systemctl status nginx

# View access logs
sudo tail -f /var/log/nginx/access.log

# View error logs
sudo tail -f /var/log/nginx/error.log
```

### Test & Reload Nginx Manually
```bash
sudo nginx -t
sudo systemctl reload nginx
```

### Check SSL Certificate Status & Auto-Renewal
```bash
# Check certificate status
sudo certbot certificates

# Test dry-run auto renewal
sudo certbot renew --dry-run
```
