# svag v1.2 - Bulk Download & Tooltips

## 🎉 Major New Features

### 1. 📦 Bulk Download - Download All Icons at Once

Download all SVG icons on a page with a single click into a ZIP archive!

**Features:**
- ✅ Automatic detection of all SVGs on the page
- ✅ One-click download to ZIP file
- ✅ Smart file naming
- ✅ Deduplication of duplicate icons
- ✅ ZIP named after domain (e.g., `example-com.zip`)

**How to use:**
1. Open extension popup on a page with icons
2. Button shows count of detected icons (e.g., "72")
3. Click button to download all as ZIP
4. ZIP automatically downloads to your Downloads folder

### 2. 💡 Tooltips in Popup UI

All action buttons now have helpful tooltips on hover:
- Gallery button: "Save to Gallery"
- Download button: "Download SVG"
- Switch order: "Switch Button Order"
- Color scheme: "White Background" / "Black Background"
- Download All: "Download all X SVGs" (dynamic count)
- Open Gallery: "Open Gallery"

## 📦 Installation

**Method 1: Developer Mode (Recommended)**
1. Download `svag-chrome-extension.zip`
2. Extract the file
3. Open `chrome://extensions/` in Chrome
4. Enable "Developer mode" (top right)
5. Click "Load unpacked"
6. Select the extracted folder

**Method 2: Chrome Web Store**
*Coming soon...*

## 🚀 Usage

**Basic usage:**
1. Hold **⌘ (Cmd)** or **Ctrl**
2. Hover over any SVG icon
3. Click to download or save to gallery

**Bulk download:**
1. Open extension popup
2. Click "Download all" button in the top right
3. All icons download as ZIP

## 🔧 Technical Details

- JSZip 3.10.1 for creating ZIP archives
- SVG detection including shadow DOM
- Maximum ZIP size: 50MB
- Deduplication based on SVG content

## 🐛 Known Issues

- On pages with thousands of icons, ZIP generation may take a few seconds
- Does not work on `chrome://` pages

## 🔗 Links

- **Website**: https://svag.pro
- **Documentation**: [README.md](https://github.com/strycekjogurt/svag#readme)
- **Full Release Notes**: [RELEASE-NOTES-v1.2-EN.md](https://github.com/strycekjogurt/svag/blob/main/RELEASE-NOTES-v1.2-EN.md)

---

**Backward Compatibility**: v1.2 is fully compatible with v1.1 - no breaking changes!

