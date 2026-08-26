# To Do Lizard Brand and Deployment

## Product identity

- Product name: To Do Lizard
- Tool symbol: `[ ]`
- Purpose: a fast, browser-stored task list
- Voice: direct, practical, and calm

## Visual system

To Do Lizard belongs to the Lizard tool family. It uses the shared green brand foundation, yelling-lizard artwork, compact operational layout, and shared Tools menu.

Its secondary accent is plum:

- Accent: `#76518f`
- Strong accent: `#553a68`
- Soft accent: `#f1eaf5`

Green remains the primary action color. Plum identifies the tool through the header rule, tool badge, active filters, focus treatments, and task markers.

## Storage model

- Tasks: `localStorage` key `todo-lizard:v1`
- View settings: `localStorage` key `todo-lizard:settings:v1`
- No task data is sent to an application server
- Export and import provide user-controlled JSON backup and restore

The app must continue to avoid injecting task text as HTML. User content is rendered with DOM text properties.

## Deployment model

- `master` is the development branch
- `gh-pages` is the published branch
- GitHub Pages serves the static application
- `.githooks/pre-commit` invokes `scripts/update-release.ps1`
- The release script updates matching version tokens in `index.html` and `script.js`

After the GitHub repository exists, add its remote, push `master`, create `gh-pages` from the same commit, and configure GitHub Pages to publish from `gh-pages` at the repository root.
