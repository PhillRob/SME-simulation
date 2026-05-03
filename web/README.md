# SME pipeline dashboard (static build)

This folder is a **Vite + React** build of the SME SAR/mo dashboard so you can host it on **GitHub Pages** or any static file host.
Yep


## Local dev

```bash
cd web
npm install
npm run dev
```

## Production build

```bash
cd web
npm install
npm run build
```

Output: `web/dist/`.

## GitHub Pages (recommended)

1. Push this repository to GitHub (including the `web/` folder and `.github/workflows/deploy-pages.yml`).
2. In the repo on GitHub: **Settings → Pages → Build and deployment → Source: GitHub Actions**.
3. Push to `main` (or change the branch in the workflow file). The workflow builds `web/` and publishes `web/dist`.

The Vite config uses `base: './'` so asset URLs work for project pages like `https://<user>.github.io/<repo>/`.

## Manual upload (alternative)

Run `npm run build`, then upload the contents of `web/dist/` to your Pages branch or hosting provider.

## State

Inputs are persisted in **browser `localStorage`** under keys prefixed with `bpla-sme-dashboard:` (same logical keys as the Cursor canvas).
