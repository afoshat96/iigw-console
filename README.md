# IIGW Capacity Console

Nokia IIGW QoS capacity dashboard (per gate, ISP, service and day, in Mb/s).

- **Live:** https://afoshat96.github.io/iigw-console/ (GitHub Pages, branch `main`)
- **Data and sign-in:** Firebase project `iigw-capacity-console` (Firestore collection `days`, Firebase Auth email/password)
- **Access:** `users/{uid}` in Firestore with `role` = `viewer` or `admin`, optional `mustChangePassword: true` for new accounts. Rules are in `firestore.rules` (publish them in the Firebase console).
- **App (PWA):** installable from the browser ("Add to Home Screen" / "Install app"). `sw.js` keeps the page fresh and works offline for the app shell.

## Deploying a change

1. Edit the files.
2. Bump the version in **both** places to the same value, e.g. `2026-11-22.1`:
   - `sw.js` → `const VERSION = '…'`
   - `index.html` → `const APP_VERSION='…'`
3. Commit and push to `main`. GitHub Pages publishes in 1–2 minutes.

Open copies then pick up the change by themselves: the page is always fetched fresh when online,
and the app checks for a new `sw.js` on open, on return to the foreground and every 30 minutes,
then shows "A new version of the console is ready · Update" (or updates silently when the app is in the background).

## Files

| File | What it is |
|---|---|
| `index.html` | The whole app (HTML, CSS, JS) |
| `sw.js` | Service worker: versioned cache and update flow |
| `manifest.webmanifest` | Install name, colours and icons |
| `firestore.rules` | Firestore security rules (copy into Firebase console) |
| `assets/icons/` | App icons from the Ministry of Communications emblem |
| `assets/logos/` | MOC and ISP logos |
