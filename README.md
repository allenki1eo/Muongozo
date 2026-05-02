# Muongozo Browser Extension MVP

Muongozo is a browser extension MVP that provides step-by-step in-page guidance and a local knowledge base for manuals.

## Features
- Side panel assistant UI
- Page-context detection (URL/title)
- Step-by-step guidance rendering
- Element highlighting
- Knowledge base page to upload PDF manuals and search extracted text

## Development
1. Open `chrome://extensions`
2. Enable Developer mode
3. Load unpacked and select this folder
4. Open extension **Details → Extension options** to access the knowledge base uploader

## Structure
- `manifest.json` - extension config
- `src/content.js` - page overlay + guidance logic
- `src/panel.css` - UI styling
- `src/workflows.js` - seeded workflow definitions
- `kb/index.html` - knowledge base UI
- `kb/kb.js` - PDF extraction + storage + search
- `kb/kb.css` - knowledge base styles
