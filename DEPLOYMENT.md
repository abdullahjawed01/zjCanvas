# Deployment Guide — zjCanvas Production Server

This guide explains how to deploy **zjCanvas** on a VPS (Ubuntu/Debian) with domain **https://zjcanvas.com** using the automated `build.sh` script.

The site is a static frontend, plus a small Node/Express backend (`server/`) that powers the admin panel at `/admin` — the place to add/edit/delete reels, posters, logos, carousels, brochures, testimonials, tools, the contact email, social links and hero stats without touching code. Nginx serves static files directly and reverse-proxies `/admin` and `/api/` to that Node process, which `systemd` keeps running as `zjcanvas-admin.service`.

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

At the end of a **first-time** run, the script prints an admin password — copy it immediately, it is never shown again. Log in at `https://zjcanvas.com/admin` and change it from the Settings tab. To choose your own password instead of a generated one, run the first deploy as:
```bash
sudo ADMIN_PASSWORD='a-strong-password' ./build.sh
```

---

## What `build.sh` Does Automatically

1. **System Check**: Verifies root/sudo privileges.
2. **Dependencies**: Installs `nginx`, `certbot`, `python3-certbot-nginx`, `nodejs` (20.x LTS, needed for the admin backend) and `ffmpeg` (used to generate reel poster thumbnails) via `apt-get`/NodeSource if missing.
3. **Web Root**: Copies code files (HTML/CSS/JS + `server/`) into `/var/www/zjcanvas.com` on every run. Copies `public/`, `content/` and `content-data.js` **only if they don't already exist there** — once live, that content is owned by the admin panel (uploads + `content/data.json`), so a redeploy never overwrites edits you've made through `/admin`.
4. **Permissions**: Sets directory permissions to `755`, file permissions to `644`, and ownership to `www-data`.
5. **Admin Server**: Runs `npm install` in `server/`, initializes `server/.env` on first run (session secret + admin password, generated or from `$ADMIN_PASSWORD`), and installs/starts `zjcanvas-admin.service` under systemd.
6. **Nginx Configuration**: Creates and enables `/etc/nginx/sites-available/zjcanvas.com` with:
   - Gzip compression enabled
   - Cache-Control headers for media (1 year) & CSS/JS (30 days) — `content-data.js` is explicitly excluded from that cache so admin edits show up immediately
   - Reverse proxy for `/admin` and `/api/` to the Node service on `127.0.0.1:3000`
   - Deny rules for `server/`, `content/` and dotfiles (never publicly served)
   - Security HTTP headers (HSTS, CSP, X-Frame-Options, X-Content-Type-Options, Referrer-Policy, Permissions-Policy)
   - Custom `404.html` error page
7. **SSL Certificate**: Runs Certbot to obtain free SSL certificates from Let's Encrypt for `zjcanvas.com` & `www.zjcanvas.com` and sets up HTTP -> HTTPS redirect.
8. **Service Reload**: Tests Nginx configuration and reloads Nginx safely.
9. **Health Checks**: Tests local HTTP response and the admin API, and outputs final status.

---

## The Admin Panel (`/admin`)

- **Editable**: reels, posters, logos (add/edit/delete/reorder + upload new files), carousels & brochures (add a group, then upload/reorder/delete its pages), testimonials (with logo upload or initials), tools list, contact email, social links, and the three homepage stats.
- **Not covered**: hero headline/paragraph copy, SEO meta tags and structured data, and overall page layout/design — those still live in the HTML/CSS and are edited as code.
- **Storage**: everything you edit is written to `content/data.json` on the server and regenerated into `content-data.js` (the file every page's `<script>` tag loads) instantly. Uploaded files land in the matching `public/...` folder using the same naming convention the site already uses (`poster-08.jpg`, `reel-05.mp4`, etc.).
- **Backups**: the previous version of `content/data.json` is kept as `content/data.json.bak` before every save.

### Managing the admin service
```bash
sudo systemctl status zjcanvas-admin      # is it running?
sudo systemctl restart zjcanvas-admin     # restart (e.g. after manually editing .env)
sudo journalctl -u zjcanvas-admin -f      # live logs
```

### Changing the password later
Log in to `/admin` → Settings → Change Password. There's no separate CLI step needed; `server/.env` is rewritten automatically.

### Redeploying code changes
```bash
cd /path/to/zjCanvas
git pull
sudo ./build.sh
```
This updates the site's HTML/CSS/JS and the admin server's code, reinstalls Node dependencies if `package.json` changed, and restarts `zjcanvas-admin` — without touching your live `public/` uploads or `content/data.json`.

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
