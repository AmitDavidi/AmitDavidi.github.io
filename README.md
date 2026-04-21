# amitdavidi.github.io

Personal portfolio, entirely static. Hosted on GitHub Pages.

## Pages

| File              | Purpose                                                      |
|-------------------|--------------------------------------------------------------|
| `index.html`      | Main portfolio, renders projects from `projects.json`        |
| `about.html`      | About page — bio, experience, toolbox                        |
| `project.html`    | Detail page — opens any project via `?id=<slug-or-id>`       |
| `404.html`        | Custom themed 404                                            |
| `dashboard.html`  | Browser-side CMS for editing `projects.json` (no backend)    |
| `projects.json`   | Single source of truth for all project data                  |

## Editing content

1. Open `dashboard.html` in a browser (drop it on a local file server or GitHub Pages URL).
2. Add / edit / reorder projects and categories. Changes are auto-saved to `localStorage`.
3. Click **Preview** to see the site rendered with your unsaved changes.
4. When happy, click **Export JSON** to download the new `projects.json`.
5. Replace the repo's `projects.json`, commit, push.

Dashboard features:

- Live Markdown preview for long descriptions
- Drag-and-drop to reorder categories and projects
- Duplicate projects
- Undo / redo (`Ctrl+Z` / `Ctrl+Shift+Z`)
- Import existing `projects.json`

## Scripts

```bash
# Validate projects.json against the schema (no deps)
node validate.js

# Pre-render projects.json into index.html for SEO
# (client-side script still runs on top — this is additive)
node build.js
```

## Keyboard Easter eggs

- `Shift+C` — toggle cyberpunk theme
- `↑ ↑ ↓ ↓ ← → ← → B A` — Konami code activates cyberpunk mode with a boot animation

## Schema

```jsonc
{
  "hero": { "badge": "...", "title": "...", "subtitle": "..." },
  "meta": { "name": "...", "siteUrl": "...", ... },
  "categories": [
    {
      "id": "chess",
      "number": "01",
      "label": "Chess",
      "title": "Chess Engines",
      "description": "...",
      "projects": [
        {
          "id": "unique-id",
          "slug": "url-friendly-slug",
          "type": "video",                    // "video" | "image" | "text"
          "size": "half",                     // "full" | "half"
          "tag": "Algorithm",
          "tagColor": "purple",               // "purple"|"cyan"|"pink"|"orange"
          "title": "Knight's Tour",
          "description": "HTML-allowed card blurb",
          "longDescription": "## Markdown\n\nDetail-page deep dive.",
          "date": "2024",
          "techStack": ["Python", "CUDA"],
          "github": "https://github.com/...",
          "demoUrl": "https://...",
          "media": { "youtubeId": "...", "title": "..." }
        }
      ]
    }
  ]
}
```

## CI

`.github/workflows/validate.yml` runs `validate.js` on every push / PR and does a light HTML smoke check.

## Conventions

- No build step required. Plain HTML/CSS/JS.
- No dependencies (`validate.js` and `build.js` are plain Node, no npm install).
- All data lives in `projects.json`. Never hand-edit HTML to add a project — use the dashboard.
