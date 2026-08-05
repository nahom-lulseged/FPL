# Admin frontend deployment

Deploy to a **separate subdomain** (e.g. `admin.yourfplclone.com`) from the consumer app.

## Vercel

1. Import `fpl-admin-frontend` as its own project.
2. Build: `npm run build`, output: `dist`
3. Set `VITE_API_BASE_URL` to the backend API URL.

## Infrastructure access gate (required in production)

App-level admin auth uses Supabase sessions plus backend role and suspension checks, but it no longer enforces application-level MFA. Add one of:

- Cloudflare Access in front of the admin subdomain
- VPN / IP allowlist at the load balancer
- Basic auth at the CDN edge

Require MFA in the identity provider or access gateway where available.

See `SECURITY.md` for the full checklist.

## CI

GitHub Actions: `.github/workflows/admin-ci.yml`
