# SVG Gallery - Frontend

This folder contains the web gallery interface for the svag Chrome extension.

## 📁 Structure

```
Gallery/
├── login.ejs       # Login/authentication page
├── gallery.ejs     # Main gallery page (requires authentication)
├── styles.css      # Shared CSS styles for both pages
├── script.js       # JavaScript logic for both pages
└── README.md       # This file
```

## 🎯 Pages

### `/gallery/login`
- Email-based authentication
- OTP code verification
- Account activation flow
- Automatic redirect to gallery after login

### `/gallery`
- Requires authentication (redirects to login if not logged in)
- Displays all saved SVG icons
- Search and sort functionality
- Click to download SVG
- Usage stats and tier badge (Free/Pro)
- Upgrade to Pro banner

## 🎨 Features

- **Search**: Filter icons by name
- **Sort Options**:
  - Newest / Oldest
  - A-Z / Z-A
  - Largest / Smallest (by file size)
- **Auto-recolor**: Single-color SVGs are automatically converted to black for consistency
- **Tooltips**: Hover over icons to see name and file size
- **Responsive Design**: Works on desktop, tablet, and mobile

## 🔧 Technical Details

### Authentication Flow

1. User enters email on `/gallery/login`
2. Server checks if user exists:
   - **Existing user**: Sends OTP code (8 digits)
   - **New user**: Sends activation link
3. User verifies and is redirected to `/gallery`
4. Token is stored in `localStorage`

### State Management

- `token`: JWT access token
- `userEmail`: User's email address
- `allItems`: Array of all SVG icons
- `currentSort`: Current sort option
- `userStats`: Usage statistics (current/limit/tier)

### API Endpoints Used

- `POST /api/auth/initiate` - Start login/registration
- `POST /api/auth/verify` - Verify OTP code
- `GET /api/gallery` - Get all user's icons
- `GET /api/gallery/stats` - Get usage statistics
- `POST /api/create-checkout-session` - Upgrade to Pro

## 🚀 Usage

The Gallery is automatically served by the server when running:

```bash
node server.js
```

Access it at:
- **Landing page**: `https://svag.vercel.app/` (production) / `http://localhost:3000/` (local)
- **User gallery**: `https://svag.vercel.app/gallery` (production) / `http://localhost:3000/gallery` (local)

## 🎨 Customization

### Styling
Edit `styles.css` to change colors, layout, or typography.

### Functionality
Edit `script.js` to modify behavior, add features, or change logic.

### Templates
Edit `.ejs` files to change HTML structure or add new elements.

## 📝 Notes

- EJS templates are rendered server-side
- Static files (CSS, JS) are served from `/Gallery` route
- Authentication state persists in `localStorage`
- Logout clears `localStorage` and redirects to login
- All icons are automatically recolored to black if single-color

