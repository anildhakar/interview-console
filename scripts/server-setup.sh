#!/usr/bin/env bash
#
# One-shot server setup for Interview Console on nginx + pm2 (bare IP, HTTP).
#
# Run this ON YOUR SERVER from the project directory, e.g.:
#
#   cd /opt/interview-console
#   sudo bash scripts/server-setup.sh
#
# It will: install pm2 if needed, build the app, create the data directory,
# write an .env, start the app under pm2, and configure nginx to proxy port 80
# to the app. Re-running it is safe (idempotent) and doubles as an updater.
#
# Override any of these by exporting them before running:
#   APP_NAME   pm2 process name         (default: interview-console)
#   PORT       app port                 (default: 3000)
#   DATA_DIR   database + uploads dir    (default: /var/lib/interview-console/data)
#   HTTP_PORT  nginx listen port         (default: 80)
#   SKIP_NGINX set to 1 to skip nginx    (default: unset)
set -euo pipefail

APP_NAME="${APP_NAME:-interview-console}"
PORT="${PORT:-3000}"
DATA_DIR="${DATA_DIR:-/var/lib/interview-console/data}"
HTTP_PORT="${HTTP_PORT:-80}"
APP_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"

say()  { printf "\033[1;36m==>\033[0m %s\n" "$*"; }
warn() { printf "\033[1;33m!!\033[0m %s\n" "$*"; }

# --- sudo helper (works whether or not you're already root) ---
if [ "$(id -u)" -eq 0 ]; then SUDO=""; else SUDO="sudo"; fi

# --- 1. Node check ---
if ! command -v node >/dev/null 2>&1; then
  warn "Node.js is not installed. Install Node 20+ first, e.g.:"
  echo "    curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash - && sudo apt-get install -y nodejs"
  exit 1
fi
NODE_MAJOR="$(node -p 'process.versions.node.split(".")[0]')"
if [ "$NODE_MAJOR" -lt 20 ]; then
  warn "Node $(node -v) found, but 20+ is required."
  exit 1
fi
say "Node $(node -v) OK"

# --- 2. Install dependencies + build ---
say "Installing dependencies (this compiles better-sqlite3)…"
cd "$APP_DIR"
npm ci
say "Building…"
npm run build

# --- 3. Data directory ---
say "Ensuring data directory at $DATA_DIR"
$SUDO mkdir -p "$DATA_DIR"
# Make it writable by the user that will run the app (the invoking user).
RUN_USER="${SUDO_USER:-$(whoami)}"
$SUDO chown -R "$RUN_USER" "$(dirname "$DATA_DIR")"

# --- 4. .env ---
if [ ! -f "$APP_DIR/.env" ]; then
  say "Writing .env"
  cat > "$APP_DIR/.env" <<EOF
DATA_DIR=$DATA_DIR
HTTPS=false
EOF
else
  say ".env already exists — leaving it as is"
fi

# --- 5. pm2 ---
if ! command -v pm2 >/dev/null 2>&1; then
  say "Installing pm2 globally"
  $SUDO npm install -g pm2
fi
say "Starting/reloading app under pm2 as '$APP_NAME'"
if pm2 describe "$APP_NAME" >/dev/null 2>&1; then
  pm2 restart "$APP_NAME" --update-env
else
  PORT="$PORT" pm2 start npm --name "$APP_NAME" -- start
fi
pm2 save
# Enable pm2 on boot (prints a command if it needs manual completion).
pm2 startup 2>/dev/null | grep -E '^sudo' | bash || warn "If the app doesn't survive reboot, run 'pm2 startup' and follow its instructions."

# --- 6. nginx ---
if [ "${SKIP_NGINX:-}" = "1" ]; then
  say "SKIP_NGINX=1 — skipping nginx configuration"
else
  if ! command -v nginx >/dev/null 2>&1; then
    say "Installing nginx"
    $SUDO apt-get update -y && $SUDO apt-get install -y nginx
  fi
  say "Writing nginx site config"
  NGINX_CONF="/etc/nginx/sites-available/$APP_NAME"
  $SUDO tee "$NGINX_CONF" >/dev/null <<EOF
server {
    listen $HTTP_PORT default_server;
    server_name _;

    # Resumes can be up to 10MB.
    client_max_body_size 15M;

    location / {
        proxy_pass http://127.0.0.1:$PORT;
        proxy_http_version 1.1;
        proxy_set_header Host              \$host;
        proxy_set_header X-Real-IP         \$remote_addr;
        proxy_set_header X-Forwarded-For   \$proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto \$scheme;
        proxy_set_header Upgrade           \$http_upgrade;
        proxy_set_header Connection        "upgrade";
    }
}
EOF
  $SUDO ln -sf "$NGINX_CONF" "/etc/nginx/sites-enabled/$APP_NAME"
  $SUDO rm -f /etc/nginx/sites-enabled/default
  say "Testing nginx config"
  $SUDO nginx -t
  $SUDO systemctl reload nginx
fi

IP="$(hostname -I 2>/dev/null | awk '{print $1}')"
echo
say "Done!"
echo "   App:   http://${IP:-<server-ip>}${HTTP_PORT:+$( [ "$HTTP_PORT" = 80 ] && echo "" || echo ":$HTTP_PORT" )}/"
echo "   Logs:  pm2 logs $APP_NAME"
echo "   Admin: log in as  admin / admin123  (you'll be asked to change it),"
echo "          or run:  node scripts/admin.mjs"
