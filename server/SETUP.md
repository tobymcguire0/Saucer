# Saucer Server Setup Guide

The sync server runs as three Docker containers managed by Docker Compose: a PostgreSQL database, the Express API, and an nginx reverse proxy handling TLS. All user data lives in the `postgres_data` Docker volume.

## Prerequisites

- A Mac or Linux machine that stays on and is connected to the internet
- A domain managed by Cloudflare (tobymcguire.net)
- A Cloudflare API token (created below)
- Docker and Docker Compose installed
- AWS Cognito user pool and app client already configured
- AWS S3 bucket for hero image storage

### Install Docker

```bash
curl -fsSL https://get.docker.com | sh
```

### Install certbot and the Cloudflare DNS plugin

The server uses the Cloudflare DNS challenge to obtain TLS certificates. This works even when your domain is proxied through Cloudflare (orange cloud enabled) and never requires port 80 to be open.

**Linux (Ubuntu/Debian):**
```bash
apt install certbot python3-certbot-dns-cloudflare
```

**macOS:**
```bash
brew install certbot
pip3 install certbot-dns-cloudflare
```

**Windows:** Run these commands inside WSL (Windows Subsystem for Linux), then follow the Linux instructions above.

---

## DNS and Router Setup

Before starting the server, the outside world needs a way to find it. Traffic flows like this:

```
Internet → Cloudflare (api.tobymcguire.net) → your router → your machine → Docker → nginx → Node server
```

### 1. Find your public IP

This is the IP address your internet provider assigned to your router — it's what the outside world sees.

```bash
curl https://api.ipify.org
```

> **Note:** Home internet connections usually have a dynamic public IP that changes periodically. If yours does, you'll need to update the DNS A record whenever it changes, or look into a DDNS (Dynamic DNS) service to automate it.

### 2. Add a DNS A record in Cloudflare

1. Log in to the [Cloudflare dashboard](https://dash.cloudflare.com) and select **tobymcguire.net**
2. Go to **DNS → Records → Add record**
3. Fill in:
   - **Type:** A
   - **Name:** `api`
   - **IPv4 address:** your public IP from step 1
   - **Proxy status:** Proxied (orange cloud on) — keep this enabled
   - **TTL:** Auto
4. Click **Save**

The full hostname `api.tobymcguire.net` will start resolving within a few minutes.

### 3. Set Cloudflare SSL mode to Full

Because Cloudflare proxies traffic (orange cloud), it makes its own HTTPS connection to your server. The SSL mode controls how it does that.

1. In the Cloudflare dashboard, go to **SSL/TLS → Overview**
2. Set the mode to **Full**

| Mode | What it does | Result |
|------|-------------|--------|
| Off | No HTTPS at all | Broken |
| Flexible | Cloudflare → your server over HTTP | nginx redirects back to HTTPS → infinite loop → 522 |
| **Full** | Cloudflare → your server over HTTPS | **Correct** |
| Full (strict) | Same as Full, validates cert chain | Also works |

### 4. Set up port forwarding on your router

Your router receives all inbound internet traffic. By default it blocks everything — you need to tell it to forward ports 80 and 443 to the machine running Docker.

**Find your machine's local IP:**

```bash
# macOS — Wi-Fi
ipconfig getifaddr en0

# macOS — Ethernet
ipconfig getifaddr en1

# Linux
hostname -I | awk '{print $1}'
```

It will look something like `192.168.1.42`. This is the address you'll forward traffic to.

**Add port forwarding rules in your router:**

Every router is different, but the steps are generally:

1. Open a browser and go to your router's admin panel. Common addresses:
   - `http://192.168.1.1`
   - `http://192.168.0.1`
   - `http://10.0.0.1`
   - Or check the label on the back of your router
2. Log in (credentials are often on the router label too)
3. Find the **Port Forwarding** section. It may be listed under:
   - NAT → Port Forwarding
   - Advanced → Virtual Servers
   - Firewall → Port Forwarding
4. Add two rules:

   | Name | External Port | Internal IP | Internal Port | Protocol |
   |------|-------------|-------------|---------------|----------|
   | saucer-http | 80 | 192.168.1.42 | 80 | TCP |
   | saucer-https | 443 | 192.168.1.42 | 443 | TCP |

   Replace `192.168.1.42` with your actual local IP from above.

5. Save and apply.

> **Tip:** Assign your machine a static local IP in the router's DHCP settings so the forwarding rules don't break if the local IP changes after a reboot.

### 5. Allow inbound connections through the macOS firewall

macOS has a built-in firewall that may block incoming connections to Docker.

**Via System Settings:**
1. Open **System Settings → Network → Firewall**
2. Make sure the firewall is not set to **Block all incoming connections**
3. Click **Options** and confirm Docker is in the list and set to **Allow incoming connections**

**Or check via terminal:**
```bash
/usr/libexec/ApplicationFirewall/socketfilterfw --getglobalstate
```

If it says `enabled`, add Docker explicitly:
```bash
sudo /usr/libexec/ApplicationFirewall/socketfilterfw --add /Applications/Docker.app/Contents/MacOS/Docker
sudo /usr/libexec/ApplicationFirewall/socketfilterfw --unblockapp /Applications/Docker.app/Contents/MacOS/Docker
```

### 6. Verify connectivity before continuing

Once DNS has propagated and port forwarding is set up, confirm the path is open end-to-end. Run this from a different network (e.g. your phone on cellular, not your home Wi-Fi):

```bash
curl https://api.tobymcguire.net/api/health
# Expected: {"status":"ok"}
```

If you get a 522, the connection is timing out — Cloudflare can reach the DNS record but not your machine. Double-check port forwarding and the firewall. If you get a 525 or SSL error, the SSL mode is wrong — go back to step 3.

---

## Cloudflare API Token

You need a Cloudflare API token scoped to your domain so certbot can create DNS records to prove domain ownership.

1. Go to [Cloudflare dashboard](https://dash.cloudflare.com) → **My Profile** → **API Tokens** → **Create Token**
2. Use the **"Edit zone DNS"** template
3. Under **Zone Resources**, set it to **Include → Specific zone → tobymcguire.net**
4. Click **Continue to summary** → **Create Token**
5. Copy the token — you won't see it again

Create the credentials file on your server:

**Linux:**
```bash
mkdir -p /etc/letsencrypt/cloudflare
cat > /etc/letsencrypt/cloudflare/credentials.ini << EOF
dns_cloudflare_api_token = <your-cloudflare-api-token>
EOF
chmod 600 /etc/letsencrypt/cloudflare/credentials.ini
```

**macOS:**
```bash
mkdir -p ~/.secrets/certbot
cat > ~/.secrets/certbot/cloudflare.ini << EOF
dns_cloudflare_api_token = <your-cloudflare-api-token>
EOF
chmod 600 ~/.secrets/certbot/cloudflare.ini
```

---

## First-Time Setup

### 1. Clone the repository

```bash
git clone <your-repo-url> /opt/saucer
cd /opt/saucer
```

### 2. Create your .env file

```bash
cp .env.example .env
```

Edit `.env` and fill in all values:

```env
# PostgreSQL
POSTGRES_HOST=db           # Always "db" when running in Docker Compose
POSTGRES_PORT=5432
POSTGRES_DB=saucer_db
POSTGRES_USER=saucer_user
POSTGRES_PASSWORD=<strong-random-password>

# AWS Cognito (server-side JWT verification)
COGNITO_USER_POOL_ID=<your-pool-id>
COGNITO_CLIENT_ID=<your-client-id>

# AWS S3
AWS_ACCESS_KEY_ID=<key>
AWS_SECRET_ACCESS_KEY=<secret>
AWS_REGION=<region>
S3_BUCKET_NAME=<bucket>

# API URL (used by the frontend build, not the server itself)
VITE_API_URL=https://api.tobymcguire.net

# Cognito OIDC (frontend)
VITE_COGNITO_USER_POOL_ID=<your-pool-id>
VITE_COGNITO_CLIENT_ID=<your-client-id>
VITE_COGNITO_REGION=<region>
VITE_COGNITO_DOMAIN=https://<your-domain-prefix>.auth.<region>.amazoncognito.com
```

### 3. Get a TLS certificate

The DNS A record must be propagated before this step. Run certbot using the Cloudflare DNS challenge — port 80 does not need to be open.

**Linux:**
```bash
certbot certonly \
  --dns-cloudflare \
  --dns-cloudflare-credentials /etc/letsencrypt/cloudflare/credentials.ini \
  -d api.tobymcguire.net
```

**macOS:**
```bash
certbot certonly \
  --dns-cloudflare \
  --dns-cloudflare-credentials ~/.secrets/certbot/cloudflare.ini \
  -d api.tobymcguire.net
```

Certbot installs a cron job (Linux) or launchd job (macOS) for automatic renewal. Verify it works:

```bash
certbot renew --dry-run
```

### 4. Start the server

```bash
cd /opt/saucer/server
docker compose up -d --build
```

Docker Compose starts all three services. The Express server calls `ensureSchema()` on boot, which creates all PostgreSQL tables automatically — no manual migrations needed.

### 5. Verify

```bash
curl https://api.tobymcguire.net/api/health
# Expected: {"status":"ok"}

docker compose logs --tail=50 server   # watch for errors
docker compose logs --tail=20 nginx
```

---

## Day-to-Day Operations

```bash
# View logs
docker compose logs -f server

# Restart after a code change
docker compose up -d --build server

# Stop everything
docker compose down

# Stop and delete all data (destructive — see migration section first)
docker compose down -v
```

---

## Updating the Server

```bash
cd /opt/saucer
git pull
cd server
docker compose up -d --build server
```

---

## Moving the Server to a New Machine

All user data is stored in the `postgres_data` Docker volume. The migration is: dump the database on the old server, restore it on the new server, then shut down the old one.

### Step 1 — On the old server: dump the database

```bash
cd /opt/saucer/server

# Dump to a file outside the container
docker compose exec db pg_dump -U saucer_user saucer_db > /tmp/saucer_backup.sql

# Verify the dump is non-empty
wc -l /tmp/saucer_backup.sql
```

### Step 2 — Copy files to the new server

```bash
# From your local machine (or old server), copy these three things:
scp /tmp/saucer_backup.sql  newserver:/tmp/saucer_backup.sql
scp /opt/saucer/.env        newserver:/tmp/saucer.env
```

The TLS certificate can be transferred or re-issued. Re-issuing is simpler:

**Option A — Re-issue (recommended):** Follow step 3 of First-Time Setup on the new server. No files to transfer.

**Option B — Transfer existing cert:**
```bash
# On old server
tar czf /tmp/letsencrypt.tar.gz /etc/letsencrypt
scp /tmp/letsencrypt.tar.gz newserver:/tmp/

# On new server
tar xzf /tmp/letsencrypt.tar.gz -C /
```

### Step 3 — On the new server: install and configure

Follow steps 1–3 of First-Time Setup (clone repo, create `.env`, get TLS cert).

Place the copied `.env`:
```bash
cp /tmp/saucer.env /opt/saucer/.env
```

### Step 4 — On the new server: start and restore

Start the database container only (so you can restore into it before the app connects):

```bash
cd /opt/saucer/server
docker compose up -d db
sleep 5   # wait for postgres to be healthy

# Restore the dump
docker compose exec -T db psql -U saucer_user saucer_db < /tmp/saucer_backup.sql
```

Then start the rest:

```bash
docker compose up -d --build
```

### Step 5 — Verify on the new server

```bash
curl https://api.tobymcguire.net/api/health
```

Open the Saucer app and confirm your recipes are present.

### Step 6 — Update DNS and shut down the old server

Update the A record for `api.tobymcguire.net` to point to the new server's IP. Once DNS propagates and the app is confirmed working, shut down the old server:

```bash
# On old server — stop containers but keep data in case you need to roll back
docker compose down
```

Delete the old server once you're confident the migration is complete.

---

## Building the Desktop App for Production

After deploying the server, rebuild the Tauri app so it points to the live API. On your development machine:

```bash
# In the project root (.env or .env.local)
VITE_API_URL=https://api.tobymcguire.net

npm run tauri build
```

The `ApiClient` reads `VITE_API_URL` at build time — no code changes needed.

---

## Troubleshooting

**nginx fails to start with "Permission denied" on fullchain.pem** — certbot sets the cert directories to mode `700`, which blocks the nginx process inside Docker from reading them. Fix it on the host and restart:
```bash
chmod 755 /etc/letsencrypt/live/api.tobymcguire.net
chmod 755 /etc/letsencrypt/archive/api.tobymcguire.net
chmod 644 /etc/letsencrypt/archive/api.tobymcguire.net/*.pem
docker compose restart nginx
```

**nginx logs "can not modify default.conf (read-only file system)"** — this is a harmless warning. nginx tries to add an IPv6 listen directive on startup but can't because the config is mounted read-only. It does not affect functionality.

**nginx fails to start with "cannot load certificate" — cert not found** — certbot didn't complete successfully. Check:
```bash
ls /etc/letsencrypt/live/api.tobymcguire.net/
```

**Server exits immediately** — missing env vars. Check:
```bash
docker compose logs server
```
Common culprits: `POSTGRES_PASSWORD`, `COGNITO_USER_POOL_ID`, `COGNITO_CLIENT_ID`.

**App shows "not connected"** — the `VITE_API_URL` in the frontend build doesn't match the deployed URL, or the cert is invalid. Test with `curl -v https://api.tobymcguire.net/api/health`.

**Cert renewal fails** — check that the Cloudflare credentials file still exists and the API token is valid:
```bash
certbot renew --dry-run
```
If the token expired, create a new one in the Cloudflare dashboard and update the credentials file.

**certbot "unauthorized" error with IP starting with 2606:47xx** — your domain is proxied through Cloudflare and you used `--standalone` instead of `--dns-cloudflare`. Re-run using the DNS challenge commands in step 3.

**Cloudflare 522 error** — Cloudflare can resolve the DNS but can't reach your machine. Work through this checklist:
1. Confirm the server is healthy locally: `curl http://localhost/api/health`
2. Confirm your public IP matches the DNS A record: `curl https://api.ipify.org` then check Cloudflare DNS dashboard
3. Confirm port forwarding is set up on your router for ports 80 and 443 pointing to your machine's local IP
4. Confirm macOS firewall is not blocking Docker (see DNS and Router Setup → step 5)
5. Test from a different network (phone on cellular) to rule out your own router hairpinning

**Cloudflare 525 or SSL handshake error** — the SSL/TLS mode in Cloudflare is set to Flexible instead of Full. Go to **SSL/TLS → Overview** in the Cloudflare dashboard and set it to **Full**.

**Server is reachable from home Wi-Fi but not from outside** — your router may not support NAT hairpinning (accessing your own public IP from inside your network). Always test public reachability from a different network, such as a phone on cellular.
