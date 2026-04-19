# Saucer Server Setup Guide

The sync server runs as three Docker containers managed by Docker Compose: a PostgreSQL database, the Express API, and an nginx reverse proxy handling TLS. All user data lives in the `postgres_data` Docker volume.

## Prerequisites

- A Linux server (Ubuntu/Debian recommended)
- A domain with an A record pointing to your server's IP — `api.tobymcguire.net` → `<your-server-ip>`
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
