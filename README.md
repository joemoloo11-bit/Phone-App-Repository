# Phone-App-Repository

PWA build pipeline for the Vault budgeting app's iPhone version.

## Structure

| Folder | What it is | How it's maintained |
|---|---|---|
| `vault-source/` | Auto-mirrored from the [Vault-App](https://github.com/joemoloo11-bit/Vault-App) repo | Auto, via GitHub Action in Vault repo |
| `pwa/` | Phone-only files: manifest, icons, service worker, Google Drive sync, JSON adapter for `window.api` | Manual, in this repo |

## How it works

| Step | What happens |
|---|---|
| You push to Vault | GitHub Action mirrors changes to a `vault-sync` branch here |
| Review and merge `vault-sync` → `main` | PWA rebuilds and deploys to GitHub Pages |
| Phone PWA picks up the update on next launch | — |

Data syncs separately via Google Drive — that path is real-time, two-way, untouched by app code updates.
