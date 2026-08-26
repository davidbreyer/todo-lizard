# To Do Lizard

To Do Lizard is a small, browser-only task list for creating, prioritizing, searching, sorting, and completing everyday tasks.

## Features

- Tasks persist between visits using browser `localStorage`
- Optional due dates and low, normal, or high priority
- All, active, and completed views
- Search and multiple sort orders
- Inline editing and completed-task cleanup
- JSON backup export and restore
- Cross-tab list refresh
- Responsive, accessible static interface

## Browser storage

Task data is stored under the namespaced key `todo-lizard:v1` for the current site, browser, and browser profile. It is not sent to a server by this app.

Browser storage is not encrypted. Do not use the task list for passwords, secrets, regulated data, or other sensitive information. Clearing site data, using a different browser/profile, or changing the site's origin can make the saved list unavailable. Export a JSON backup for anything important.

## Run locally

Serve the folder with any static file server. For example:

```powershell
python -m http.server 8000
```

Then visit `http://localhost:8000`.

## Deployment

The project is designed for GitHub Pages. The `master` branch contains the source and `gh-pages` is the published branch. The pre-commit hook updates the release stamp in the static assets.

## Privacy

To Do Lizard runs entirely in the browser and does not intentionally transmit task contents. Hosting providers or analytics configured outside this repository may still process normal request metadata.
