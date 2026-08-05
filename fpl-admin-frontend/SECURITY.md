# Admin Panel Security — Production Access Plan

This document describes the infrastructure-level access controls planned for the FPL admin panel in production. Application-level admin auth now uses Supabase email/password sessions with backend role and suspension checks, audit logging, rate limits, and account lockout. Application-level MFA is no longer enforced by the FPL admin UI or API, so MFA should be required at the identity-provider or infrastructure access layer where available.

## Recommended approach: Cloudflare Access

Deploy the admin app to a dedicated subdomain, for example `admin.yourfplclone.com`, and protect it with **Cloudflare Access** before traffic reaches the application.

Why this is the primary recommendation:

- SSO integration (Google Workspace, GitHub, Okta, etc.)
- Per-user and per-group access policies
- Optional IP allowlists and geofencing
- Audit trail of who reached the admin surface at the edge
- Works cleanly with a static Vite build behind Cloudflare Pages or a reverse proxy

Suggested policy shape:

1. Allow only members of an `fpl-admin` identity group
2. Require MFA at the identity provider where available
3. Optionally restrict to office/home IP ranges for extra protection

## Alternative: VPN-only access

If the team already operates a corporate VPN or Tailscale mesh:

- Publish the admin subdomain only on the private network, or
- Restrict the origin/firewall to VPN egress IPs

This is a strong option for small teams with a fixed set of operators and no need for public DNS exposure.

## Alternative: Reverse-proxy basic auth

For early production or staging environments, place **HTTP basic authentication** in front of the admin static site using nginx, Caddy, or Traefik.

Example pattern:

- Browser basic auth gate at the edge
- Application admin login inside the app

Basic auth alone is not sufficient for production admin access; treat it as a supplemental gate, not a replacement for app-level auth, role checks, audit logging, and identity-provider MFA.

## Defense in depth summary

| Layer | Control | Owner |
| --- | --- | --- |
| DNS / edge | Cloudflare Access, VPN, or basic auth | Infrastructure (Phase 10) |
| Transport | HTTPS everywhere | Infrastructure (Phase 10) |
| Application | Admin-only login endpoint, JWT, role check on every `/api/admin/*` route | Backend (Phase 9) |
| Account | MFA at the identity provider or access gateway where available | Infrastructure / IdP |
| Abuse | Login rate limit (3 attempts / 15 min per IP) + temporary account lockout | Backend (Phase 9) |
| Accountability | Immutable audit log for mutating admin actions | Backend + admin UI (Phase 9) |

## Operational notes

- Keep the admin frontend in a **separate deployable** from the consumer app so admin code and routes never ship to regular users.
- Do not expose admin API routes through the public consumer frontend bundle or proxy.
- Retain audit logs according to your compliance needs; the default database retention applies until a dedicated archival policy is added.
- Rotate JWT secrets and review Cloudflare Access / VPN membership when admin staff changes.

## Phase 10 checklist

- [ ] Create `admin.yourfplclone.com` deployment target
- [ ] Apply Cloudflare Access (or chosen alternative) in front of the admin site
- [ ] Point admin frontend API base URL at the production backend
- [ ] Verify unauthenticated users cannot reach the admin UI or `/api/admin/*`
- [ ] Verify MFA is enforced by the identity provider or access gateway before go-live
