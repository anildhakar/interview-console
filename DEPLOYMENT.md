# Deploying Interview Console to a staging server

This guide sets up the app on a fresh Linux VPS (Ubuntu/Debian assumed) behind
nginx, reachable by the server's **IP address** (no domain needed). There is no
separate backend or database service to run — Next.js is the whole app and it
stores everything in a local SQLite file plus an uploads folder.

Throughout, replace `SERVER_IP` with your server's public IP.

---

## 0. What you're deploying

- **App**: a single Next.js process listening on `localhost:3000`.
- **Data**: one directory (`DATA_DIR`) containing `app.db` (SQLite) and
  `uploads/` (resumes). This is the **only** thing you need to back up.
- **nginx**: reverse proxy on port 80 → `localhost:3000`, so users hit
  `http://SERVER_IP/`.

---

## Quick setup (automated script)

If you just want it running, copy the project to the server, make sure **Node 20+**
is installed, then run the bundled setup script — it installs pm2, builds, creates
the data dir + `.env`, starts the app under pm2, and configures nginx:

```bash
cd /opt/interview-console          # wherever you put the project
sudo bash scripts/server-setup.sh  # or: npm run setup
```

When it finishes it prints the URL (`http://SERVER_IP/`). Re-run the same command
any time to redeploy after pulling new code. The sections below explain each step
if you'd rather do it by hand or need to customize.

You can tune it with env vars, e.g. `PORT=4000 DATA_DIR=/srv/ic sudo -E bash scripts/server-setup.sh`.

---

## 1. Install prerequisites

```bash
# Node.js 20 LTS (or newer)
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt-get install -y nodejs

# Build tools — needed to compile better-sqlite3 (a native module)
sudo apt-get install -y build-essential python3 git nginx

# Process manager
sudo npm install -g pm2

node -v   # should print v20.x or newer
```

---

## 2. Get the code and build

```bash
# Pick a location for the app
sudo mkdir -p /opt/interview-console
sudo chown "$USER" /opt/interview-console
cd /opt/interview-console

# Copy the project here (git clone, scp, or rsync). Then:
npm ci                 # installs deps and compiles better-sqlite3 for this machine
```

Create the data directory (kept **outside** the app folder so redeploys never
touch it):

```bash
sudo mkdir -p /var/lib/interview-console/data
sudo chown -R "$USER" /var/lib/interview-console
```

Create `.env` in the project root:

```bash
cat > .env <<'EOF'
DATA_DIR=/var/lib/interview-console/data
HTTPS=false
EOF
```

Build:

```bash
npm run build
```

> **Note on `HTTPS`**: leave it `false` for plain-IP HTTP. The session cookie is
> only marked `Secure` when `HTTPS=true`; setting it `true` without real HTTPS
> would make logins fail because the browser would refuse to send the cookie.

---

## 3. Run it with pm2

```bash
cd /opt/interview-console
pm2 start npm --name interview-console -- start
pm2 save                       # remember this process across reboots
pm2 startup                    # prints a command — run it to enable boot startup
```

The app is now on `http://localhost:3000` on the server. Check it:

```bash
curl -I http://localhost:3000/login    # expect HTTP 200
pm2 logs interview-console              # view logs
```

<details>
<summary>Alternative: systemd instead of pm2</summary>

Create `/etc/systemd/system/interview-console.service`:

```ini
[Unit]
Description=Interview Console
After=network.target

[Service]
Type=simple
WorkingDirectory=/opt/interview-console
EnvironmentFile=/opt/interview-console/.env
ExecStart=/usr/bin/npm start
Restart=on-failure
User=YOUR_USER

[Install]
WantedBy=multi-user.target
```

Then:

```bash
sudo systemctl daemon-reload
sudo systemctl enable --now interview-console
```
</details>

---

## 4. nginx reverse proxy (bare IP)

Create `/etc/nginx/sites-available/interview-console`:

```nginx
server {
    listen 80 default_server;
    server_name _;                     # matches the IP / anything

    # Resumes can be up to 10MB — allow room for the multipart request.
    client_max_body_size 15M;

    location / {
        proxy_pass http://127.0.0.1:3000;
        proxy_http_version 1.1;
        proxy_set_header Host              $host;
        proxy_set_header X-Real-IP         $remote_addr;
        proxy_set_header X-Forwarded-For   $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_set_header Upgrade           $http_upgrade;
        proxy_set_header Connection        "upgrade";
    }
}
```

Enable it and reload:

```bash
sudo ln -s /etc/nginx/sites-available/interview-console /etc/nginx/sites-enabled/
sudo rm -f /etc/nginx/sites-enabled/default      # remove the default welcome page
sudo nginx -t                                    # test config
sudo systemctl reload nginx
```

Open the firewall if one is active:

```bash
sudo ufw allow 80/tcp
```

Now browse to **`http://SERVER_IP/`**.

---

## 5. First login & the admin account

**How the admin account is created:** on first run the app auto-seeds a single
admin:

- **Username:** `admin`
- **Password:** `admin123`

Log in with that and you'll be forced to set a new password immediately.

If you'd rather create the admin explicitly (or you ever get locked out), use the
bundled CLI — it can create a new admin, promote an existing user to admin, or
reset an admin password:

```bash
node scripts/admin.mjs        # or: npm run admin
```

Once you're in, add accounts from **Settings → Users**, or let people
self-register from the login page. On the registration form each person picks an
**account type**:

- **Human Resources** → HR role
- **Developer** → Interviewer role
- **Product** → Interviewer role

Roles and what they can do:
- **Admin** — everything, including user management and settings.
- **Interviewer** (Developer / Product) — add candidates, conduct rounds, assign
  the next round to a teammate.
- **HR** — add candidates (with an optional initial-impression note), upload
  resumes, assign rounds to interviewers, view all results and reports (cannot
  score interviews or edit the question bank).

---

## 6. Backups

Everything that matters lives in `DATA_DIR`. To back it up, stop writes briefly
and copy the folder (SQLite is in WAL mode, so copy the whole directory, not just
`app.db`):

```bash
pm2 stop interview-console
tar czf ic-backup-$(date +%F).tar.gz -C /var/lib/interview-console data
pm2 start interview-console
```

Restore by extracting that archive back into `/var/lib/interview-console`.

---

## 7. Updating to a new version

```bash
cd /opt/interview-console
# pull/copy the new code, then:
npm ci
npm run build
pm2 restart interview-console
```

Database schema changes are applied automatically on startup (the app runs
idempotent `CREATE TABLE IF NOT EXISTS` migrations), so no manual DB step is
needed. `DATA_DIR` is untouched by redeploys.

---

## Troubleshooting

| Symptom | Likely cause / fix |
|---|---|
| `better-sqlite3` errors on start | Native module not built for this machine. Run `npm rebuild better-sqlite3` (needs `build-essential` + `python3`). |
| Login succeeds but immediately bounces back | `HTTPS=true` set without real HTTPS — the Secure cookie is dropped. Set `HTTPS=false`. |
| Resume upload fails with 413 | nginx `client_max_body_size` too low — it must be ≥ 10M (set to 15M above). |
| 502 Bad Gateway | App process isn't running. Check `pm2 status` / `pm2 logs interview-console`. |
| Changes to `data/` lost on redeploy | `DATA_DIR` points inside the app folder. Point it at `/var/lib/interview-console/data`. |
