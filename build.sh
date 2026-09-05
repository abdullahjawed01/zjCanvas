#!/usr/bin/env bash

# ==============================================================================
# ZJCANVAS PRODUCTION DEPLOYMENT SCRIPT
# Domain: zjcanvas.com / www.zjcanvas.com
# Usage: sudo ./build.sh
#
# Deploys the static site AND the admin backend (Node/Express, at /admin) that
# powers content editing. Nginx serves static files directly and reverse
# proxies /admin and /api/ to the Node process, which systemd keeps running.
# ==============================================================================

set -euo pipefail

# ------------------------------------------------------------------------------
# CONFIGURATION VARIABLES — EDIT BEFORE RUNNING IF NEEDED
# ------------------------------------------------------------------------------
DOMAIN="zjcanvas.com"
WWW_DOMAIN="www.zjcanvas.com"
WEB_ROOT="/var/www/zjcanvas.com"
CERTBOT_EMAIL="your-email@example.com" # Required for Let's Encrypt SSL
ADMIN_PORT="3000"                      # Internal port the Node admin server listens on
# Optional: export ADMIN_PASSWORD=... before running to set the initial admin
# password yourself. Otherwise one is generated and printed at the end of
# this script (only on first install — it is never shown again).

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
# [1/13] CHECK SYSTEM & ROOT PRIVILEGES
# ------------------------------------------------------------------------------
log_step "[1/13] Checking system and root privileges..."

if [ "$(id -u)" -ne 0 ]; then
    log_error "This script must be run as root or with sudo."
    echo "Usage: sudo ./build.sh"
    exit 1
fi

if command -v apt-get >/dev/null 2>&1; then
    PKG_MANAGER="apt-get"
else
    log_error "Unsupported Linux distribution. This script currently supports Debian/Ubuntu with apt-get."
    exit 1
fi

# ------------------------------------------------------------------------------
# [2/13] CHECK CONFIGURATION VARIABLES
# ------------------------------------------------------------------------------
log_step "[2/13] Validating configuration variables..."

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
echo "  Admin server port (internal): $ADMIN_PORT"

# ------------------------------------------------------------------------------
# [3/13] CHECK & INSTALL DEPENDENCIES
# ------------------------------------------------------------------------------
log_step "[3/13] Checking and installing dependencies (Nginx, Certbot, Node.js, ffmpeg)..."

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

NODE_OK=0
if command -v node >/dev/null 2>&1; then
    NODE_MAJOR="$(node -v | sed 's/^v//' | cut -d. -f1)"
    if [ "$NODE_MAJOR" -ge 18 ] 2>/dev/null; then
        NODE_OK=1
    fi
fi
if [ "$NODE_OK" -eq 0 ]; then
    echo "Installing Node.js 20.x LTS (via NodeSource, needed for the admin server)..."
    curl -fsSL https://deb.nodesource.com/setup_20.x | bash -
    $PKG_MANAGER install -y -qq nodejs
fi

if ! command -v ffmpeg >/dev/null 2>&1; then
    echo "Installing ffmpeg (used to generate reel poster thumbnails)..."
    $PKG_MANAGER install -y -qq ffmpeg
fi

NODE_BIN="$(command -v node)"
log_success "Nginx, Certbot, Node.js ($(node -v)) and ffmpeg are installed and ready."

# ------------------------------------------------------------------------------
# [4/13] PREPARE WEB ROOT DIRECTORY
# ------------------------------------------------------------------------------
log_step "[4/13] Preparing deployment directory at $WEB_ROOT..."

mkdir -p "$WEB_ROOT"
FRESH_ADMIN_SETUP=0
if [ ! -f "$WEB_ROOT/server/.env" ]; then
    FRESH_ADMIN_SETUP=1
fi

# ------------------------------------------------------------------------------
# [5/13] DEPLOY WEBSITE FILES
# ------------------------------------------------------------------------------
log_step "[5/13] Deploying website files to production directory..."

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

# Code — always overwritten on every redeploy.
CODE_ITEMS=(
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
    "server"
)

# Content — only copied the first time. Once live, this is edited through
# /admin (uploads + content/data.json), so a redeploy must never overwrite it.
CONTENT_ITEMS=(
    "public"
    "content"
    "content-data.js"
)

for item in "${CODE_ITEMS[@]}"; do
    if [ -e "$SCRIPT_DIR/$item" ]; then
        cp -r "$SCRIPT_DIR/$item" "$WEB_ROOT/"
    else
        log_warning "Expected asset $item not found in source directory."
    fi
done

for item in "${CONTENT_ITEMS[@]}"; do
    if [ -e "$WEB_ROOT/$item" ]; then
        log_warning "$item already exists in $WEB_ROOT — leaving it untouched (admin-edited content persists across redeploys)."
    elif [ -e "$SCRIPT_DIR/$item" ]; then
        cp -r "$SCRIPT_DIR/$item" "$WEB_ROOT/"
    fi
done

log_success "Website files copied to $WEB_ROOT."

# ------------------------------------------------------------------------------
# [6/13] SET FILE PERMISSIONS & OWNERSHIP
# ------------------------------------------------------------------------------
log_step "[6/13] Setting secure ownership and file permissions..."

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
# [7/13] INSTALL ADMIN SERVER DEPENDENCIES
# ------------------------------------------------------------------------------
log_step "[7/13] Installing admin server dependencies..."

if [ -f "$WEB_ROOT/server/package.json" ]; then
    (cd "$WEB_ROOT/server" && npm install --omit=dev --no-audit --no-fund)
    log_success "Node dependencies installed."
else
    log_error "server/package.json not found — admin backend will not run."
    exit 1
fi

GENERATED_PASSWORD=""
if [ "$FRESH_ADMIN_SETUP" -eq 1 ]; then
    echo "First-time setup: initializing server/.env..."
    if [ -n "${ADMIN_PASSWORD:-}" ]; then
        GENERATED_PASSWORD="$ADMIN_PASSWORD"
    else
        GENERATED_PASSWORD="$(node -e "const c=require('crypto');const s='ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnpqrstuvwxyz23456789';const b=c.randomBytes(14);process.stdout.write([...b].map(x=>s[x%s.length]).join(''));")"
    fi
    {
        echo "NODE_ENV=production"
        echo "PORT=$ADMIN_PORT"
        echo "ADMIN_PASSWORD=$GENERATED_PASSWORD"
    } > "$WEB_ROOT/server/.env"
    chown "$NGINX_USER:$NGINX_USER" "$WEB_ROOT/server/.env"
    chmod 600 "$WEB_ROOT/server/.env"
fi

chown -R "$NGINX_USER:$NGINX_USER" "$WEB_ROOT/server/node_modules" 2>/dev/null || true

# ------------------------------------------------------------------------------
# [8/13] CREATE / UPDATE SYSTEMD SERVICE FOR THE ADMIN SERVER
# ------------------------------------------------------------------------------
log_step "[8/13] Configuring the zjcanvas-admin systemd service..."

cat <<EOF > /etc/systemd/system/zjcanvas-admin.service
[Unit]
Description=zjCanvas Admin Server (content API + uploads)
After=network.target

[Service]
Type=simple
WorkingDirectory=$WEB_ROOT/server
ExecStart=$NODE_BIN $WEB_ROOT/server/index.js
EnvironmentFile=$WEB_ROOT/server/.env
Restart=always
RestartSec=3
User=$NGINX_USER
Group=$NGINX_USER
NoNewPrivileges=true

[Install]
WantedBy=multi-user.target
EOF

systemctl daemon-reload
log_success "systemd unit written to /etc/systemd/system/zjcanvas-admin.service."

# ------------------------------------------------------------------------------
# [9/13] GENERATE NGINX CONFIGURATION
# ------------------------------------------------------------------------------
log_step "[9/13] Creating optimized Nginx server configuration..."

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

    # Reel uploads through /admin can be large.
    client_max_body_size 130M;

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

    # Never serve server internals, the raw content store, or dotfiles
    # (including server/.env) directly.
    location ~ ^/(server|content)(/|\$) { deny all; return 404; }
    location ~ /\. { deny all; return 404; }

    # content-data.js is regenerated every time something is saved in
    # /admin — never let the 30-day JS cache rule below serve a stale copy.
    location = /content-data.js {
        add_header Cache-Control "no-cache";
        try_files /content-data.js =404;
    }

    # Admin UI + JSON API — proxied to the Node service kept running by
    # systemd (zjcanvas-admin.service). The ^~ modifier makes sure these
    # win over the generic .css/.js cache rule below for e.g. /admin/admin.js.
    location ^~ /admin {
        proxy_pass http://127.0.0.1:$ADMIN_PORT;
        proxy_http_version 1.1;
        proxy_set_header Host \$host;
        proxy_set_header X-Real-IP \$remote_addr;
        proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto \$scheme;
    }

    location ^~ /api/ {
        proxy_pass http://127.0.0.1:$ADMIN_PORT;
        proxy_http_version 1.1;
        proxy_set_header Host \$host;
        proxy_set_header X-Real-IP \$remote_addr;
        proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto \$scheme;
        proxy_read_timeout 120s;
    }

    # Static Assets Caching (1 year for immutable media)
    location ~* \.(?:jpg|jpeg|gif|png|ico|cur|gz|svg|svgz|mp4|ogg|ogv|webm|htc|woff|woff2|ttf|eot)\$ {
        expires 1y;
        access_log off;
        add_header Cache-Control "public, no-transform";
    }

    # CSS and JavaScript Caching (30 days)
    location ~* \.(?:css|js)\$ {
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

mkdir -p /etc/nginx/sites-enabled
ln -sf "$NGINX_CONF_PATH" "$NGINX_LINK_PATH"

if [ -f /etc/nginx/sites-enabled/default ]; then
    rm -f /etc/nginx/sites-enabled/default
fi

log_success "Nginx configuration generated at $NGINX_CONF_PATH."

# ------------------------------------------------------------------------------
# [10/13] SSL / HTTPS CONFIGURATION WITH CERTBOT
# ------------------------------------------------------------------------------
log_step "[10/13] Configuring HTTPS & SSL certificates with Certbot..."

IS_DNS_READY=0
if host "$DOMAIN" >/dev/null 2>&1; then
    IS_DNS_READY=1
fi

if [ -d "/etc/letsencrypt/live/$DOMAIN" ]; then
    # Certificate already exists (from a previous run) — but the nginx
    # config for $DOMAIN was just fully regenerated from scratch in step
    # [9/13] and is HTTP-only again. Re-run just the installer (no
    # reissuance) so the HTTPS server block and redirect always get
    # reapplied on every deploy, not only the first one.
    echo "SSL certificate already exists for $DOMAIN — reapplying nginx HTTPS config..."
    if certbot install --nginx --cert-name "$DOMAIN" --non-interactive; then
        log_success "HTTPS server block reapplied for $DOMAIN."
    else
        log_warning "Could not reapply the existing certificate to nginx. Run manually:"
        log_warning "  sudo certbot install --nginx --cert-name $DOMAIN"
    fi
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

if systemctl is-enabled certbot.timer >/dev/null 2>&1; then
    log_success "Certbot auto-renewal timer is enabled."
fi

# ------------------------------------------------------------------------------
# [11/13] TEST NGINX CONFIGURATION & RELOAD
# ------------------------------------------------------------------------------
log_step "[11/13] Testing Nginx configuration syntax and reloading..."

nginx -t

if systemctl is-active --quiet nginx; then
    systemctl reload nginx
else
    systemctl start nginx
fi

log_success "Nginx service is active and reloaded."

# ------------------------------------------------------------------------------
# [12/13] START / ENABLE THE ADMIN SERVICE
# ------------------------------------------------------------------------------
log_step "[12/13] Starting the zjcanvas-admin service..."

systemctl enable zjcanvas-admin >/dev/null 2>&1 || true
systemctl restart zjcanvas-admin
sleep 1

if systemctl is-active --quiet zjcanvas-admin; then
    log_success "zjcanvas-admin is running (proxied at /admin and /api/)."
else
    log_error "zjcanvas-admin failed to start. Check: journalctl -u zjcanvas-admin -n 50"
fi

# ------------------------------------------------------------------------------
# [13/13] HEALTH CHECKS & SUMMARY
# ------------------------------------------------------------------------------
log_step "[13/13] Running post-deployment health checks..."

echo -n "Checking local web server response (HTTP 200/301)... "
HTTP_STATUS=$(curl -s -o /dev/null -w "%{http_code}" http://localhost/ || true)
if [ "$HTTP_STATUS" = "200" ] || [ "$HTTP_STATUS" = "301" ]; then
    log_success "Local HTTP server returned status code: $HTTP_STATUS"
else
    log_warning "Local HTTP server returned unexpected status code: $HTTP_STATUS"
fi

echo -n "Checking admin proxy response (HTTP 200)... "
ADMIN_STATUS=$(curl -s -o /dev/null -w "%{http_code}" "http://localhost/api/admin/me" || true)
if [ "$ADMIN_STATUS" = "200" ]; then
    log_success "Admin API responded: $ADMIN_STATUS"
else
    log_warning "Admin API returned unexpected status code: $ADMIN_STATUS (check journalctl -u zjcanvas-admin)"
fi

echo ""
echo "=========================================================================="
echo "                 ZJCANVAS DEPLOYMENT COMPLETE!                     "
echo "=========================================================================="
echo " Website Web Root: $WEB_ROOT"
echo " Active Domain:    https://$DOMAIN"
echo " WWW Domain:       https://$WWW_DOMAIN"
echo " Nginx Status:     $(systemctl is-active nginx)"
echo " Admin Status:     $(systemctl is-active zjcanvas-admin)"
echo " Admin URL:        https://$DOMAIN/admin"
if [ -n "$GENERATED_PASSWORD" ]; then
echo ""
echo " Admin password (shown once — save it now):"
echo "   $GENERATED_PASSWORD"
echo " Change it any time from the Settings tab inside /admin."
fi
echo "=========================================================================="
echo ""
