# 🚨 CRITICAL URLS - DO NOT MODIFY

## ⚠️ FRONTEND URL (MUST HAVE HYPHEN!)

### ✅ CORRECT URL:
```
https://athlete-time.netlify.app
```

### ❌ WRONG URL (DO NOT USE!):
```
https://athletetime.netlify.app
```

---

## 🔧 Environment Variables

**FRONTEND_URL:**
```
https://athlete-time.netlify.app
```

**CORS_ORIGIN:**
```
https://athlete-time.netlify.app
```

---

## 📝 Notes

- The URL **MUST** include a hyphen (`-`) between "athlete" and "time"
- This is the deployed Netlify URL
- Used for CORS configuration
- Used for frontend API calls
- **NEVER** use `athletetime` (without hyphen)

---

## 🔍 Where This URL Is Used:

1. `.env.production.template` - CORS_ORIGIN, FRONTEND_URL
2. `.env.render.setup` - FRONTEND_URL, CORS_ORIGIN
3. `render.yaml` - CORS_ORIGIN environment variable (if configured)
4. `server-postgres.js` - CORS configuration
5. All future deployment configurations

---

## ⚠️ WARNING TO ALL DEVELOPERS:

**This URL has been corrected multiple times. Please ensure you ALWAYS use:**

```
https://athlete-time.netlify.app
```

**WITH THE HYPHEN (`-`) between athlete and time!**

Any deviation will cause CORS errors and frontend-backend communication failures.

---

Last Updated: 2024 (After multiple corrections)
Priority: CRITICAL - DO NOT MODIFY
