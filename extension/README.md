# Muongozo Browser Extension

Works on Chrome, Edge, and any Chromium browser. No code changes needed in your org's apps.

## Load for testing (Developer Mode)

1. Open `chrome://extensions`
2. Enable **Developer mode** (top-right toggle)
3. Click **Load unpacked** → select this `extension/` folder
4. Pin the Muongozo icon to your toolbar
5. Click it → enter your Org ID, API Key, and Server URL → Save

## Enterprise deployment (IT — no user action needed)

### Google Workspace (Chrome Enterprise)

1. Publish the extension to the Chrome Web Store (or use internal hosting)
2. In **Google Workspace Admin** → *Devices → Chrome → Apps & Extensions*
3. Add the extension by ID and set `Installation Policy` to **Force install**
4. Under **Managed configuration**, paste:

```json
{
  "orgId": "your-org-id",
  "apiKey": "your-widget-api-key",
  "serverUrl": "https://your-muongozo-deployment.com",
  "position": "bottom-right"
}
```

All managed Chrome browsers will silently receive the extension pre-configured.
Users see the guide immediately — no installs, no prompts.

### Microsoft Intune / Edge

Same flow via *Intune → Apps → Browser extensions* with the same managed config JSON.

### Jamf (macOS Safari)

Use the Safari extension build and deploy via Jamf profile.

## Files

| File | Purpose |
|------|---------|
| `manifest.json` | Extension config (Manifest V3) |
| `background.js` | Service worker — config relay, tab injection |
| `content.js` | Injected into every page — creates the widget |
| `popup/popup.html` | Extension popup UI |
| `popup/popup.js` | Popup logic + snippet generators |
| `managed_schema.json` | Schema for IT-managed configuration |
| `icons/` | Extension icons (replace with branded versions) |
