# svag v1.2.0 - Bulk Download Release Notes

## 🎉 Major New Feature: Bulk Download

### What's New?

**Bulk Download** - Download all SVG icons on a page with a single click into a ZIP archive!

### Features

- ✅ **Automatic detection** - Extension automatically detects all SVG icons on the page (including shadow DOM)
- ✅ **One-click download** - "Download all (X)" button in popup shows the number of detected icons
- ✅ **ZIP archive** - All icons download as a ZIP file named after the domain (e.g., `example-com.zip`)
- ✅ **Smart naming** - Files are named based on icon name or `icon-1.svg`, `icon-2.svg`, etc.
- ✅ **Clean SVG** - Uses the same extraction system as individual downloads (v1.2.0 rewrite)
- ✅ **Deduplication** - Automatically filters duplicate icons
- ✅ **Security limits** - Maximum ZIP size of 50MB

### How to Use?

1. Open the extension popup on a page with icons
2. The button to the right of "⌘ cmd and hover any svg" shows the count of detected icons
3. Click the button to download all icons as a ZIP
4. ZIP automatically downloads to your Downloads folder

### UI/UX

- **Location**: Button is positioned to the right of the helper text in the popup
- **Design**: Small black rounded button with download icon + count
- **Loading states**: "..." when loading, "✓" on success
- **Notifications**: On-page notification after download completes

### Technical Details

#### Modified/Added Files:
- `jszip.min.js` - JSZip 3.10.1 library (NEW)
- `manifest.json` - Added JSZip to content_scripts, version 1.2.0
- `popup.html` - Added #downloadAllBtn button
- `popup.css` - Styling for .download-all-btn
- `popup.js` - Functions attachDownloadAllListeners() and detectIconsOnPage()
- `content.js` - Functions detectAllSvgsOnPage() and downloadAllSvgs()

#### API:
```javascript
// Detect icons
chrome.tabs.sendMessage(tab.id, { action: 'detectAllSvgs' })
// Response: { success: true, count: 15 }

// Download as ZIP
chrome.tabs.sendMessage(tab.id, { action: 'downloadAllSvgs' })
// Response: { success: true, count: 15, filename: 'example-com.zip' }
```

#### File Naming:
- **Priority 1**: Use detected icon name (from `data-icon`, `aria-label`, `id`, etc.)
- **Priority 2**: Fallback to `icon-{number}.svg`
- **Uniqueness**: Automatically adds `-1`, `-2`, etc. on name collision

#### ZIP Naming:
- Extracted from `window.location.hostname`
- Dots replaced with dashes: `example.com` → `example-com.zip`

### Testing

Recommended test pages:
- [Lucide Icons](https://lucide.dev/icons) - ~1000 icons
- [Heroicons](https://heroicons.com) - ~200 icons
- [Feather Icons](https://feathericons.com) - ~280 icons
- [Font Awesome](https://fontawesome.com/icons) - thousands of icons

### Limits

- **Max ZIP size**: 50MB
- **Timeout**: No explicit timeout, but browser may limit long operations
- **Page types**: Does not work on `chrome://` and extension pages

### Known Issues

- On pages with thousands of icons, ZIP generation may take a few seconds
- Some complex SVGs (with external sprite files) may not be extracted correctly

### Breaking Changes

None! V1.2 is fully backward compatible with v1.1.

### Additional Improvements in v1.2

- **Tooltips in popup UI** - All action buttons now have tooltips describing their function
  - Gallery button: "Save to Gallery"
  - Download button: "Download SVG"
  - Switch order: "Switch Button Order"
  - Color scheme: "White Background" / "Black Background"
  - Download All: "Download all X SVGs" (dynamic count)
  - Open Gallery: "Open Gallery"
  - Resend code: "Resend Code"
- Updated description in manifest.json
- Improved console logs with `[svag v1.2]` prefix
- Better error handling for bulk operations

---

**Installation**: Upload the extension to Chrome or use Developer Mode for local testing.

**Documentation**: See [README.md](./README.md) and [QUICK-START.md](./QUICK-START.md)

