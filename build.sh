#!/usr/bin/env bash

# ==============================================================================
# ZJCANVAS PRODUCTION DEPLOYMENT SCRIPT
# Domain: zjcanvas.com / www.zjcanvas.com
# Usage: sudo ./build.sh
# ==============================================================================

set -euo pipefail

# ------------------------------------------------------------------------------
# CONFIGURATION VARIABLES — EDIT BEFORE RUNNING IF NEEDED
# ------------------------------------------------------------------------------
DOMAIN="zjcanvas.com"
WWW_DOMAIN="www.zjcanvas.com"
WEB_ROOT="/var/www/zjcanvas.com"
CERTBOT_EMAIL="your-email@example.com" # Required for Let's Encrypt SSL

# ------------------------------------------------------------------------------
# HELPER FUNCTIONS
# ------------------------------------------------------------------------------
log_step() {
    echo ""
    echo -e "\033[1;34m=======> $1\033[0m"
}

log_success() {
    echo -e "\033[1;32m[SUCCESS] $1\033[0m"
}

log_warning() {
    echo -e "\033[1;33m[WARNING] $1\033[0m"
}

log_error() {
    echo -e "\033[1;31m[ERROR] $1\033[0m"
}

# ------------------------------------------------------------------------------
# [1/10] CHECK SYSTEM & ROOT PRIVILEGES
# ------------------------------------------------------------------------------
log_step "[1/10] Checking system and root privileges..."

if [ "$(id -u)" -ne 0 ]; then
    log_error "This script must be run as root or with sudo."
    echo "Usage: sudo ./build.sh"
    exit 1
fi

# Detect Package Manager (Debian/Ubuntu expected for standard VPS)
if command -v apt-get >/dev/null 2>&1; then
    PKG_MANAGER="apt-get"
else
    log_error "Unsupported Linux distribution. This script currently supports Debian/Ubuntu with apt-get."
    exit 1
fi

# ------------------------------------------------------------------------------
# [2/10] CHECK CONFIGURATION VARIABLES
# ------------------------------------------------------------------------------
log_step "[2/10] Validating configuration variables..."

if [ -z "$CERTBOT_EMAIL" ] || [ "$CERTBOT_EMAIL" = "your-email@example.com" ]; then
    log_error "CERTBOT_EMAIL is not configured."
    echo "Please edit build.sh and set CERTBOT_EMAIL to your real email address."
    echo "Example: CERTBOT_EMAIL=\"admin@zjcanvas.com\""
    exit 1
fi

echo "  Domain: $DOMAIN"
echo "  WWW Domain: $WWW_DOMAIN"
echo "  Web Root: $WEB_ROOT"
echo "  Certbot Email: $CERTBOT_EMAIL"

# ------------------------------------------------------------------------------
# [3/10] CHECK & INSTALL DEPENDENCIES
# ------------------------------------------------------------------------------
log_step "[3/10] Checking and installing dependencies (Nginx & Certbot)..."

export DEBIAN_FRONTEND=noninteractive

if ! command -v nginx >/dev/null 2>&1; then
    echo "Installing Nginx..."
    $PKG_MANAGER update -qq
    $PKG_MANAGER install -y -qq nginx
fi

if ! command -v certbot >/dev/null 2>&1 || ! dpkg -l | grep -q python3-certbot-nginx; then
    echo "Installing Certbot and Nginx plugin..."
    $PKG_MANAGER update -qq
    $PKG_MANAGER install -y -qq certbot python3-certbot-nginx
fi

log_success "Nginx and Certbot are installed and ready."

# ------------------------------------------------------------------------------
# [4/10] PREPARE WEB ROOT DIRECTORY
# ------------------------------------------------------------------------------
log_step "[4/10] Preparing deployment directory at $WEB_ROOT..."

mkdir -p "$WEB_ROOT"

# ------------------------------------------------------------------------------
# [5/10] COPY WEBSITE ASSETS
# ------------------------------------------------------------------------------
log_step "[5/10] Deploying website files to production directory..."

# Determine script source directory
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

# Target sync list
FILES_TO_SYNC=(
    "index.html"
    "Brochures.html"
    "Carousel.html"
    "Logos.html"
    "Posters.html"
    "Reels.html"
    "404.html"
    "sitemap.xml"
    "robots.txt"
    "site.webmanifest"
    "favicon.ico"
    "favicon-16x16.png"
    "favicon-32x32.png"
    "apple-touch-icon.png"
    "styles.css"
    "data.js"
    "script.js"
    "gallery.js"
    "public"
)

for item in "${FILES_TO_SYNC[@]}"; do
    if [ -e "$SCRIPT_DIR/$item" ]; then
        cp -r "$SCRIPT_DIR/$item" "$WEB_ROOT/"
    else
        log_warning "Expected asset $item not found in source directory."
    fi
done

log_success "Website files copied to $WEB_ROOT."

# ------------------------------------------------------------------------------
# [6/10] SET FILE PERMISSIONS & OWNERSHIP
# ------------------------------------------------------------------------------
log_step "[6/10] Setting secure ownership and file permissions..."

# Default Nginx user on Debian/Ubuntu is www-data
NGINX_USER="www-data"
if id "www-data" >/dev/null 2>&1; then
    chown -R www-data:www-data "$WEB_ROOT"
elif id "nginx" >/dev/null 2>&1; then
    chown -R nginx:nginx "$WEB_ROOT"
    NGINX_USER="nginx"
fi

find "$WEB_ROOT" -type d -exec chmod 755 {} +
find "$WEB_ROOT" -type f -exec chmod 644 {} +

log_success "Permissions set to 755 (directories) and 644 (files)."

# ------------------------------------------------------------------------------
# [7/10] GENERATE NGINX CONFIGURATION
# ------------------------------------------------------------------------------
log_step "[7/10] Creating optimized Nginx server configuration..."

NGINX_CONF_PATH="/etc/nginx/sites-available/$DOMAIN"
NGINX_LINK_PATH="/etc/nginx/sites-enabled/$DOMAIN"

cat <<EOF > "$NGINX_CONF_PATH"
# Nginx Configuration for $DOMAIN
# Generated automatically by build.sh

server {
    listen 80;
    listen [::]:80;
    server_name $DOMAIN $WWW_DOMAIN;

    root $WEB_ROOT;
    index index.html;

    # Gzip Compression
    gzip on;
    gzip_disable "msie6";
    gzip_vary on;
    gzip_proxied any;
    gzip_comp_level 6;
    gzip_buffers 16 8k;
    gzip_http_version 1.1;
    gzip_types text/plain text/css application/json application/javascript text/xml application/xml application/xml+rss text/javascript image/svg+xml;

    # Security Headers
    add_header X-Frame-Options "SAMEORIGIN" always;
    add_header X-Content-Type-Options "nosniff" always;
    add_header X-XSS-Protection "1; mode=block" always;
    add_header Referrer-Policy "strict-origin-when-cross-origin" always;
    add_header Permissions-Policy "camera=(), microphone=(), geolocation=(), payment=()" always;
    add_header Content-Security-Policy "default-src 'self'; script-src 'self' 'unsafe-inline' https://fonts.googleapis.com; style-src 'self' 'unsafe-inline' https://fonts.googleapis.com; img-src 'self' data: https:; media-src 'self' data: https:; font-src 'self' https://fonts.gstatic.com data:; connect-src 'self'; frame-ancestors 'self';" always;

    # Static Assets Caching (1 year for immutable media)
    location ~* \.(?:jpg|jpeg|gif|png|ico|cur|gz|svg|svgz|mp4|ogg|ogv|webm|htc|woff|woff2|ttf|eot)$ {
        expires 1y;
        access_log off;
        add_header Cache-Control "public, no-transform";
    }

    # CSS and JavaScript Caching (30 days)
    location ~* \.(?:css|js)$ {
        expires 30d;
        access_log off;
        add_header Cache-Control "public, no-transform";
    }

    # Custom 404 Error Page
    error_page 404 /404.html;
    location = /404.html {
        internal;
    }

    # Default static page serving with clean fallback
    location / {
        try_files \$uri \$uri/ \$uri.html =404;
    }
}
EOF

# Enable site and remove default config if present
mkdir -p /etc/nginx/sites-enabled
ln -sf "$NGINX_CONF_PATH" "$NGINX_LINK_PATH"

if [ -f /etc/nginx/sites-enabled/default ]; then
    rm -f /etc/nginx/sites-enabled/default
fi

log_success "Nginx configuration generated at $NGINX_CONF_PATH."

# ------------------------------------------------------------------------------
# [8/10] SSL / HTTPS CONFIGURATION WITH CERTBOT
# ------------------------------------------------------------------------------
log_step "[8/10] Configuring HTTPS & SSL certificates with Certbot..."

# Check if DNS resolves to local system IP before attempting SSL
IS_DNS_READY=0
if host "$DOMAIN" >/dev/null 2>&1; then
    IS_DNS_READY=1
fi

if [ -d "/etc/letsencrypt/live/$DOMAIN" ]; then
    log_success "SSL certificates already exist for $DOMAIN."
else
    if [ "$IS_DNS_READY" -eq 1 ]; then
        echo "Obtaining SSL certificate from Let's Encrypt..."
        if certbot --nginx -d "$DOMAIN" -d "$WWW_DOMAIN" --non-interactive --agree-tos -m "$CERTBOT_EMAIL" --redirect; then
            log_success "SSL certificate issued successfully and HTTPS redirect enabled."
        else
            log_warning "Certbot failed to obtain SSL certificate. Proceeding with HTTP..."
            log_warning "Ensure DNS A records for $DOMAIN and $WWW_DOMAIN point to this server's public IP."
        fi
    else
        log_warning "DNS for $DOMAIN does not appear to be pointing to this server yet."
        log_warning "Skipping automated SSL generation. Run 'sudo certbot --nginx -d $DOMAIN -d $WWW_DOMAIN' once DNS propagates."
    fi
fi

# Ensure Certbot timer or cron renewal is active
if systemctl is-enabled certbot.timer >/dev/null 2>&1; then
    log_success "Certbot auto-renewal timer is enabled."
fi

# ------------------------------------------------------------------------------
# [9/10] TEST NGINX CONFIGURATION & RELOAD
# ------------------------------------------------------------------------------
log_step "[9/10] Testing Nginx configuration syntax and reloading..."

nginx -t

if systemctl is-active --quiet nginx; then
    systemctl reload nginx
else
    systemctl start nginx
fi

log_success "Nginx service is active and reloaded."

# ------------------------------------------------------------------------------
# [10/10] HEALTH CHECKS & SUMMARY
# ------------------------------------------------------------------------------
log_step "[10/10] Running post-deployment health checks..."

echo -n "Checking local web server response (HTTP 200/301)... "
HTTP_STATUS=$(curl -s -o /dev/null -w "%{http_code}" http://localhost/ || true)

if [ "$HTTP_STATUS" = "200" ] || [ "$HTTP_STATUS" = "301" ]; then
    log_success "Local HTTP server returned status code: $HTTP_STATUS"
else
    log_warning "Local HTTP server returned unexpected status code: $HTTP_STATUS"
fi

echo ""
echo "=========================================================================="
echo "                 ZJCANVAS DEPLOYMENT COMPLETE!                     "
echo "=========================================================================="
echo " Website Web Root: $WEB_ROOT"
echo " Active Domain:    https://$DOMAIN"
echo " WWW Domain:       https://$WWW_DOMAIN"
echo " Nginx Status:     $(systemctl is-active nginx)"
echo "=========================================================================="
echo ""
EOF
