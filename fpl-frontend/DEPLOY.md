# Frontend deployment

## Vercel (recommended)

1. Import the `fpl-frontend` directory as a project.
2. Set build command: `npm run build`
3. Set output directory: `dist`
4. Add environment variable from `.env.production.example`:
   - `VITE_API_BASE_URL` → your backend URL
   - `VITE_CURRENT_SEASON` → active season string

## CI

GitHub Actions workflow: `.github/workflows/frontend-ci.yml` (lint, test, build on push).

## Post-deploy

- Confirm CORS on backend includes your frontend origin.
- Smoke test: login, squad builder, transfers, fixtures, live socket connection.
