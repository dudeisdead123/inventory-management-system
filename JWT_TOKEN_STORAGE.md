# JWT WEB TOKEN STORAGE & FLOW

## WHERE JWT TOKEN IS STORED

### **Client Side (Frontend) - localStorage**
**Location:** Browser's localStorage
**File:** `Frontend/inventory_management_system/src/contexts/AuthContext.js`

```javascript
// AFTER SUCCESSFUL LOGIN/REGISTRATION
localStorage.setItem('auth-token', data.authtoken);

// ON APP RELOAD/STARTUP
const token = localStorage.getItem('auth-token');

// ON LOGOUT
localStorage.removeItem('auth-token');
```

---

## JWT TOKEN STORAGE DIAGRAM

```
┌─────────────────────────────────────────────────────────────┐
│                    USER BROWSER                              │
│                                                              │
│  ┌──────────────────────────────────────────────────────┐   │
│  │          localStorage (Browser Storage)             │   │
│  │  ┌────────────────────────────────────────────────┐ │   │
│  │  │ Key: 'auth-token'                             │ │   │
│  │  │ Value: eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9 │ │   │
│  │  │        .eyJ1c2VyIjp7ImlkIjoiNTAwN2YxZjc3Ymd │ │   │
│  │  │        mM2NkNzk5NDM5MDExIn0sImlhdCI6MTcwNDAxMjM │ │   │
│  │  │        3N9.abc123xyz789...                     │ │   │
│  │  └────────────────────────────────────────────────┘ │   │
│  └──────────────────────────────────────────────────────┘   │
│                          │                                   │
│                          │ Token persists across:            │
│                          ├─ Page refreshes                   │
│                          ├─ Browser tabs                     │
│                          └─ Browser restart (until logout)   │
│                                                              │
└─────────────────────────────────────────────────────────────┘
```

---

## COMPLETE JWT TOKEN FLOW

### **Step 1: User Registration/Login**
```
User enters email and password
       ↓
Frontend sends POST /login (or /createuser)
       ↓
Backend authenticates credentials
       ↓
Backend generates JWT token:
  jwt.sign({user: {id: user._id}}, JWT_SECRET)
       ↓
Backend returns token in response:
  { success: true, authtoken: "eyJhbGciOiJIUzI1NiIs..." }
       ↓
Frontend receives token
```

**Backend Code (Backend/Routes/router.js):**
```javascript
const authtoken = jwt.sign({user: {id: user.id}}, JWT_SECRET);
res.json({ success: true, authtoken });
```

---

### **Step 2: Token Stored in localStorage**
```
Response arrives at frontend
       ↓
AuthContext.js stores token:
  localStorage.setItem('auth-token', data.authtoken)
       ↓
Token now available in browser storage
       ↓
AuthContext updates user state
       ↓
User redirected to dashboard/products
```

**Frontend Code (Frontend/inventory_management_system/src/contexts/AuthContext.js):**
```javascript
const login = async (email, password) => {
    const response = await fetch('http://localhost:3001/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password })
    });

    const data = await response.json();
    
    if (data.success) {
        // STORE TOKEN IN localStorage
        localStorage.setItem('auth-token', data.authtoken);
        
        // VERIFY TOKEN WITH BACKEND
        await fetchUser(data.authtoken);
        return { success: true };
    }
};
```

---

### **Step 3: Token Used in API Requests**
```
Component needs to fetch user's products
       ↓
Retrieves token from localStorage
       ↓
Includes token in HTTP request header:
  headers: {
    'auth-token': token,
    'Content-Type': 'application/json'
  }
       ↓
Backend receives request with token
```

**Frontend API Call Example:**
```javascript
const fetchUser = async (token) => {
    const response = await fetch('http://localhost:3001/getuser', {
        method: 'POST',
        headers: {
            'auth-token': token,  // TOKEN SENT HERE
            'Content-Type': 'application/json'
        }
    });
    // ...
};
```

---

### **Step 4: Token Verification on Backend**
```
Backend receives API request with token
       ↓
fetchuser middleware extracts token from header:
  const token = req.header('auth-token')
       ↓
Verifies token signature:
  jwt.verify(token, JWT_SECRET)
       ↓
If valid:
  ├─ Decode token to get user ID
  ├─ Attach user to req.user
  └─ Continue to route handler
       ↓
If invalid/missing:
  └─ Return 401 Unauthorized
```

**Backend Middleware Code (Backend/middleware/fetchuser.js):**
```javascript
const fetchuser = (req, res, next) => {
    const token = req.header('auth-token');  // EXTRACT FROM HEADER
    
    if (!token) {
        return res.status(401).send({ error: "Please authenticate" });
    }
    
    try {
        // VERIFY TOKEN WITH SECRET
        const data = jwt.verify(token, JWT_SECRET);
        req.user = data.user;  // ATTACH USER INFO
        next();  // PROCEED TO ROUTE
    } catch (error) {
        res.status(401).send({ error: "Invalid token" });
    }
};
```

---

### **Step 5: App Reload/Refresh**
```
User refreshes the page
       ↓
React component mounts
       ↓
AuthProvider useEffect runs
       ↓
Checks localStorage for token:
  const token = localStorage.getItem('auth-token')
       ↓
If token exists:
  ├─ Verify token with backend (/getuser)
  └─ Restore user session
       ↓
If no token:
  └─ Stay logged out
```

**Frontend Code (AuthContext.js):**
```javascript
useEffect(() => {
    const token = localStorage.getItem('auth-token');  // RETRIEVE TOKEN
    if (token) {
        fetchUser(token);  // VERIFY TOKEN
    } else {
        setLoading(false);
    }
}, []);
```

---

### **Step 6: Logout**
```
User clicks logout button
       ↓
Frontend removes token from localStorage:
  localStorage.removeItem('auth-token')
       ↓
Frontend clears user state:
  setUser(null)
       ↓
User redirected to login page
       ↓
Token no longer available (deleted from browser)
```

**Frontend Code:**
```javascript
const logout = () => {
    localStorage.removeItem('auth-token');
    setUser(null);
};
```

---

## localStorage vs Alternatives

| Storage | Pros | Cons | Used? |
|---------|------|------|-------|
| **localStorage** | Persistent across sessions, simple API, accessible | Vulnerable to XSS attacks | ✅ YES |
| **sessionStorage** | More secure, clears on tab close | Lost on page refresh | ❌ NO |
| **Cookies (httpOnly)** | Most secure (can't access via JS) | Complex setup | ❌ NO |
| **Memory (State)** | Fast, lost on refresh | Lost on page reload | ❌ NO (only used during session) |

**Current Implementation:** localStorage (simplest, but consider httpOnly cookies for production)

---

## TOKEN STRUCTURE

### JWT Token Format
```
eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.
eyJ1c2VyIjp7ImlkIjoiNTA3ZjFmNzdiY2Y4NmNkNzk5NDM5MDExIn0sImlhdCI6MTcwNDAxMjMzN9.
abc123xyz789...

│─────────────────────────────────┤ │────────────────────────────────────────┤ │──────────────────────┤
        Header                              Payload                           Signature
```

### Header
```json
{
  "alg": "HS256",
  "typ": "JWT"
}
```

### Payload (What's Stored)
```json
{
  "user": {
    "id": "507f1f77bcf86cd799439011"
  },
  "iat": 1704012337
}
```
**Contents:**
- `user.id` - MongoDB user ID
- `iat` - Issued At timestamp

### Signature
```
HMACSHA256(
  base64UrlEncode(header) + "." +
  base64UrlEncode(payload),
  JWT_SECRET
)
```
- Ensures token wasn't tampered with
- Created with secret key
- Cannot be forged without the secret

---

## TOKEN SECURITY FLOW

```
┌──────────────────────────────────────────────────┐
│          Frontend Sends Request with Token       │
└──────────┬───────────────────────────────────────┘
           │
           │ Headers: { 'auth-token': token }
           ↓
┌──────────────────────────────────────────────────┐
│        Backend Receives Request + Token          │
└──────────┬───────────────────────────────────────┘
           │
           │ Extract token from header
           ↓
┌──────────────────────────────────────────────────┐
│   Verify Token Signature with JWT_SECRET         │
└──────────┬───────────────────────────────────────┘
           │
      ┌────┴─────┐
      ↓          ↓
   VALID      INVALID
      │          │
      ↓          ↓
  ┌──────┐   ┌─────────┐
  │Allow │   │ 401     │
  │Req   │   │Reject   │
  └──────┘   └─────────┘
```

---

## HOW TOKEN IS USED IN API CALLS

### Example: Fetching Products

**Frontend (sends token in header):**
```javascript
const getProducts = async () => {
    const token = localStorage.getItem('auth-token');
    
    const response = await fetch('http://localhost:3001/products', {
        method: 'GET',
        headers: {
            'auth-token': token,  // ← TOKEN SENT HERE
            'Content-Type': 'application/json'
        }
    });
    
    const products = await response.json();
    setProductData(products);
};
```

**Backend Route (requires fetchuser middleware):**
```javascript
router.get('/products', fetchuser, async (req, res) => {
    // fetchuser middleware already verified token
    // req.user.id is now available
    
    const products = await Product.find({ 
        createdBy: req.user.id  // ← USER ID EXTRACTED FROM TOKEN
    });
    
    res.json(products);
});
```

---

## COMPLETE TOKEN LIFECYCLE

```
1. REGISTRATION/LOGIN
   └─ User credentials → Backend generates token → Sent to frontend

2. STORAGE
   └─ localStorage.setItem('auth-token', token)

3. PERSISTENCE
   └─ Token stays in localStorage until logout or manual deletion

4. ON PAGE RELOAD
   └─ localStorage.getItem('auth-token') → Token still available

5. IN API REQUESTS
   └─ Headers: { 'auth-token': token } → Sent with every request

6. BACKEND VERIFICATION
   └─ jwt.verify(token, JWT_SECRET) → Extract user ID

7. DATA FILTERING
   └─ Query database filtering by user ID → Only user's data

8. LOGOUT
   └─ localStorage.removeItem('auth-token') → Token deleted
```

---

## KEY POINTS ABOUT JWT STORAGE

✅ **Where:** Browser's localStorage (key: 'auth-token')

✅ **When Stored:** After successful login/registration

✅ **How Used:** Sent in 'auth-token' header of every API request

✅ **Verification:** Backend verifies signature with JWT_SECRET

✅ **Duration:** Persists until user logs out or manually cleared

✅ **User Isolation:** Token contains user ID, filters all queries

✅ **Security:** Token is stateless, cannot be forged

❌ **Not Stored:** Token is NOT stored on server (stateless API)

---

## COMMON JWT OPERATIONS

### Get Token from localStorage
```javascript
const token = localStorage.getItem('auth-token');
console.log(token);  // eyJhbGciOiJIUzI1NiIs...
```

### Store Token in localStorage
```javascript
localStorage.setItem('auth-token', authtoken);
```

### Remove Token from localStorage
```javascript
localStorage.removeItem('auth-token');
```

### Check if User is Logged In
```javascript
const isLoggedIn = localStorage.getItem('auth-token') !== null;
```

### Send Token in API Request
```javascript
const token = localStorage.getItem('auth-token');
fetch('http://localhost:3001/products', {
    headers: {
        'auth-token': token  // Send token here
    }
});
```

---

## TROUBLESHOOTING JWT ISSUES

### Issue: "Please authenticate using a valid token"
**Causes:**
- Token missing from localStorage
- Token expired (if expiration added)
- Wrong header name ('auth-token' must be exact)
- Token corrupted

**Solution:**
```javascript
// Check if token exists
console.log(localStorage.getItem('auth-token'));

// Log out and log back in to get new token
localStorage.removeItem('auth-token');
// Then login again
```

### Issue: Token Not Persisting After Page Refresh
**Causes:**
- Token not being saved to localStorage
- Browser privacy mode clears localStorage
- localStorage disabled in browser

**Solution:**
```javascript
// Ensure AuthContext saves token properly
localStorage.setItem('auth-token', data.authtoken);
```

### Issue: User Data Not Loading After Refresh
**Causes:**
- AuthProvider not running useEffect on mount
- Token verification failing
- User endpoint not responding

**Solution:**
```javascript
// Check browser console for errors
// Verify token still exists: localStorage.getItem('auth-token')
// Check network tab in DevTools for /getuser response
```

---

## PRODUCTION RECOMMENDATIONS

### Current (Development)
- ✅ Simple localStorage implementation
- ❌ Vulnerable to XSS attacks
- ❌ Token visible in browser dev tools

### Recommended for Production

**Use httpOnly Cookies instead:**
```javascript
// Backend: Set token in httpOnly cookie (can't access via JS)
res.cookie('authToken', token, {
    httpOnly: true,    // Can't access via JavaScript
    secure: true,      // Only sent over HTTPS
    sameSite: 'Strict' // CSRF protection
});

// Frontend: Cookies sent automatically with requests
// No need to manually add header
```

**Benefits:**
- Secure against XSS attacks
- CSRF protection with sameSite
- Automatic with every request
- Can't be accessed by malicious scripts

**Steps to migrate:**
1. Implement httpOnly cookie on backend
2. Remove localStorage.setItem calls
3. Remove 'auth-token' header from frontend requests
4. Cookies sent automatically by browser
