# Production deployment — HTTPS / Nginx

This folder holds the production reverse-proxy config. It is **not** wired into
the dev `docker-compose.yml` (which runs the Vite dev server and the backend
directly). Use it when deploying behind a domain with TLS.

## 1. DNS + domain

Point your domain (e.g. `vortex.example.com`) at the server's public IP and
replace every `vortex.example.com` occurrence in [`nginx.conf`](nginx.conf).

## 2. TLS certificates (Let's Encrypt / Certbot)

```bash
# One-off issuance (HTTP-01). nginx must serve /.well-known/acme-challenge
certbot certonly --webroot -w /var/www/certbot -d vortex.example.com
# Auto-renew is installed by certbot's systemd timer / cron.
```

Mount `/etc/letsencrypt` and `/var/www/certbot` into the nginx container, and
mount the SPA build (`frontend/dist`, produced by `npm run build`) at
`/usr/share/nginx/html`.

## 3. Production environment

In `.env` (never commit it):

- `ENVIRONMENT=production`
- `JWT_SECRET_KEY=$(openssl rand -hex 32)`  ← strong, unique
- `GOOGLE_CLIENT_ID` / `GOOGLE_CLIENT_SECRET` (and `*_REDIRECT_URI` on your domain)
- `APPLE_*` if enabling Sign in with Apple (see `.env.example`)
- `FRONTEND_URL` / `BACKEND_CORS_ORIGINS` / `VITE_*` set to the https domain

## 4. Redis persistence

The token blacklist, refresh-token families and brute-force counters live in
Redis — enable persistence so they survive restarts:

```
# redis.conf
appendonly yes
appendfsync everysec
save 900 1
```

## 5. Notes / follow-ups

- The CSP in `nginx.conf` allows `'unsafe-inline'` for styles (needed by the
  login page's injected `<style>`). Tighten once styles are externalised.
- Token storage is still `localStorage` on the client. Moving to `HttpOnly`
  cookies (see `manual-actions-required.log` §4) is the recommended hardening.
