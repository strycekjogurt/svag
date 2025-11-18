# 🔧 Authentication Flow - Senior Developer Analysis & Fix

## 🐛 CURRENT PROBLEM

**Symptom:** API vrací `{"error":"No token provided"}` i když extension posílá token.

**Evidence:**
```
✅ Token is valid (60 minutes)
✅ Token length: 762
✅ Authorization header sent: Bearer eyJhbGci...
❌ API Response: 401 Unauthorized {"error":"No token provided"}
```

---

## 🔍 ROOT CAUSE ANALYSIS

### 1. Token Flow Check

**Login (popup.js:547-599):**
```javascript
// ✅ Token se ukládá správně
await chrome.storage.sync.set({ 
  apiToken: data.token,
  refreshToken: data.refreshToken,
  userEmail: currentEmail,
  apiUrl: apiUrl
});
```

**Init (popup.js:127-134):**
```javascript
// ✅ Token se načítá správně
const validToken = await getValidToken(result.apiToken, result.refreshToken);
if (validToken) {
  showLoggedIn(result.userEmail, validToken);
}
```

**API Call (popup.js:814-815):**
```javascript
// ✅ Token se posílá správně
fetch(`${apiUrl}/api/gallery`, {
  headers: { 'Authorization': `Bearer ${token}` }
})
```

### 2. Where It Breaks

**Issue:** Server dostává request, ale **nevidí Authorization header**.

**Possible Causes:**
1. **CORS Preflight** - server nepovoluje Authorization header v CORS
2. **Server Middleware** - nesprávně parsuje Authorization header
3. **API Route** - endpoint neexistuje nebo má jiný path
4. **Content-Type Missing** - některé servery vyžadují Content-Type i pro GET

---

## 💡 PROPOSED SOLUTION

### Fix 1: Add Content-Type Header

```javascript
// popup.js:814-819
const [iconsResponse, statsResponse] = await Promise.all([
  fetch(`${apiUrl}/api/gallery`, {
    headers: { 
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json'  // ✅ PŘIDAT
    }
  }),
  fetch(`${apiUrl}/api/gallery/stats`, {
    headers: { 
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json'  // ✅ PŘIDAT
    }
  })
]);
```

### Fix 2: Debug Logging

```javascript
// Před fetch přidat:
console.log('📤 Request details:', {
  url: `${apiUrl}/api/gallery`,
  method: 'GET',
  headers: {
    'Authorization': `Bearer ${token.substring(0, 20)}...`,
    'Content-Type': 'application/json'
  }
});
```

### Fix 3: Check Server Middleware

**Server (server.js nebo routes)** musí mít správný middleware:

```javascript
// Správné parsování Authorization headeru
app.use((req, res, next) => {
  const authHeader = req.headers.authorization;
  console.log('🔍 Authorization header:', authHeader ? 'present' : 'MISSING');
  
  if (authHeader && authHeader.startsWith('Bearer ')) {
    req.token = authHeader.substring(7);
    console.log('✅ Token extracted:', req.token.substring(0, 20) + '...');
  } else {
    console.warn('⚠️  No token in Authorization header');
  }
  
  next();
});

// V route handleru:
app.get('/api/gallery', authenticate, async (req, res) => {
  // authenticate middleware musí správně validovat req.token
});
```

### Fix 4: CORS Configuration

**Server musí povolit Authorization header:**

```javascript
app.use(cors({
  origin: true,
  credentials: true,
  exposedHeaders: ['Authorization'],
  allowedHeaders: ['Content-Type', 'Authorization']  // ✅ DŮLEŽITÉ
}));
```

---

## 🎯 ACTION PLAN

### Step 1: Extension Fixes (Quick Win)

**File:** `popup.js`

1. **Přidat Content-Type header** k fetch requestům
2. **Přidat debug logging** před odesláním
3. **Ověřit že apiUrl je správné** (https://svag.pro ne www)

### Step 2: Server Verification

**File:** `server.js`

1. **Zkontrolovat CORS config** - povoluje Authorization?
2. **Zkontrolovat auth middleware** - správně parsuje token?
3. **Přidat server-side logging** - co server skutečně dostává?

### Step 3: Testing

1. **Test s curl:**
   ```bash
   curl -H "Authorization: Bearer YOUR_TOKEN" \\
        -H "Content-Type: application/json" \\
        https://svag.pro/api/gallery
   ```
   
2. **Test v Postman:**
   - GET https://svag.pro/api/gallery
   - Header: Authorization: Bearer TOKEN
   - Header: Content-Type: application/json

3. **Sledovat Network tab:**
   - F12 → Network
   - Kliknout na request
   - Zkontrolovat Request Headers → vidí se Authorization?

---

## 🔥 IMMEDIATE FIX (Extension Side)

```javascript
// popup.js - replace loadRecentIcons() fetch calls

async function loadRecentIcons(token) {
  try {
    console.log('🔄 Loading recent icons from API...');
    console.log('🔑 Token length:', token?.length);
    console.log('🔑 Token preview:', token?.substring(0, 30) + '...');
    console.log('📍 API URL:', apiUrl);
    
    // Clear icons list and show loading state
    iconsList.innerHTML = '<div class="loading-state">Loading...</div>';
    
    // PŘIDAT debug před fetch
    const requestDetails = {
      url: `${apiUrl}/api/gallery`,
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      }
    };
    console.log('📤 Sending request:', requestDetails);
    
    // Načíst ikony přímo z API
    const [iconsResponse, statsResponse] = await Promise.all([
      fetch(`${apiUrl}/api/gallery`, {
        method: 'GET',
        headers: { 
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        credentials: 'include'  // ✅ PŘIDAT pro CORS
      }),
      fetch(`${apiUrl}/api/gallery/stats`, {
        method: 'GET',
        headers: { 
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        credentials: 'include'  // ✅ PŘIDAT pro CORS
      })
    ]);
    
    console.log('📥 API responses:', {
      icons: iconsResponse.status,
      stats: statsResponse.status
    });
    
    // Rest of the function...
  }
}
```

---

## 🎁 BONUS: Alternative Solution

Pokud API nadále odmítá tokeny, můžeme použít **localStorage synchronizaci**:

```javascript
// Místo volání API z popup, číst z localStorage gallery page
async function loadRecentIcons(token) {
  try {
    // Otevřít gallery page v hidden iframe
    const iframe = document.createElement('iframe');
    iframe.style.display = 'none';
    iframe.src = `${apiUrl}/gallery`;
    document.body.appendChild(iframe);
    
    // Po načtení, číst localStorage
    iframe.onload = async () => {
      try {
        // Číst token z iframe localStorage
        const galleryToken = iframe.contentWindow.localStorage.getItem('token');
        
        if (galleryToken) {
          // Fetch data s gallery tokenem (který funguje)
          const response = await fetch(`${apiUrl}/api/gallery`, {
            headers: { 'Authorization': `Bearer ${galleryToken}` }
          });
          
          if (response.ok) {
            const icons = await response.json();
            displayIcons(icons);
          }
        }
      } finally {
        document.body.removeChild(iframe);
      }
    };
  } catch (error) {
    console.error('Error:', error);
  }
}
```

---

## 📊 COMPARISON: Before vs After

| Aspect | Before | After |
|--------|---------|-------|
| Headers | Only Authorization | + Content-Type + credentials |
| Logging | Basic | Detailed request/response |
| Error Handling | Generic | Specific with causes |
| Fallback | None | localStorage sync option |
| Server Check | Assumed working | Verified with logs |

---

## ✅ SUCCESS CRITERIA

After implementing fixes:

1. ✅ API returns 200 OK instead of 401
2. ✅ Icons load in popup
3. ✅ Server logs show token received
4. ✅ Network tab shows Authorization header sent
5. ✅ curl test works with same token

---

**Version:** 1.2.0  
**Date:** 18.11.2025  
**Status:** Ready for implementation

