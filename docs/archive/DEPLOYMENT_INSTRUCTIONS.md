# 🚀 Deployment Instructions for Render.com

## ⚠️ CRITICAL: New Server v3.0.0 Deployment

**Date**: 2025-10-29
**Status**: Code pushed to GitHub (commit: b83fed6, fcf3fba)
**Issue**: Old server still running on Render.com

---

## 🔥 IMMEDIATE ACTION REQUIRED

### Option 1: Manual Deploy via Render Dashboard (RECOMMENDED)

1. Go to: https://dashboard.render.com/
2. Select service: **athletetime-backend**
3. Click **"Manual Deploy"** → **"Deploy latest commit"**
4. Wait 2-3 minutes for build to complete
5. Verify deployment:
   ```bash
   curl https://athletetime-backend.onrender.com/health
   # Should return: {"status":"ok","version":"3.0.0","database":"connected",...}
   ```

### Option 2: Restart Service via Dashboard

1. Go to service settings
2. Click **"Restart Service"**
3. This will pick up latest code from GitHub

### Option 3: Clear Build Cache

Sometimes Render caches old builds:
1. Go to service settings
2. Click **"Clear Build Cache"**
3. Then click **"Manual Deploy"**

---

## ✅ Verification Checklist

After deployment, verify these endpoints:

### 1. Health Check
```bash
curl https://athletetime-backend.onrender.com/health
```
**Expected Response:**
```json
{
  "status": "ok",
  "version": "3.0.0",
  "database": "connected",
  "cloudinary": "configured",
  "websocket": "active",
  "timestamp": "2025-10-29T..."
}
```

### 2. Posts API (New Format)
```bash
curl 'https://athletetime-backend.onrender.com/api/posts?limit=1'
```
**Expected Response (PostgreSQL format):**
```json
[{
  "id": 1,
  "category_id": 1,
  "category_name": "공지사항",
  "category_icon": "📢",
  "title": "환영합니다",
  "content": "...",
  "user_id": "uuid-here",
  "username": "관리자",
  "images": [
    {
      "id": 1,
      "url": "https://res.cloudinary.com/...",
      "thumbnail_url": "..."
    }
  ],
  "images_count": 1,
  "views_count": 0,
  "comments_count": 0,
  "likes_count": 0,
  "created_at": "2025-10-29T..."
}]
```

**❌ OLD Format (should NOT see this):**
```json
{
  "success": true,
  "posts": [{
    "id": 1760074802774,
    "category": "테스트",  // ← OLD: string instead of category_id
    "title": "...",
    "password": "...",     // ← OLD: password exposed
    "likes": [],           // ← OLD: array instead of count
    "comments": []         // ← OLD: embedded instead of count
  }]
}
```

### 3. Categories API
```bash
curl https://athletetime-backend.onrender.com/api/categories
```
**Expected:**
```json
[
  {"id": 1, "name": "공지사항", "icon": "📢", "color": "#FF4444", "description": "..."},
  {"id": 2, "name": "자유게시판", "icon": "💬", ...},
  ...
]
```

---

## 🔧 Environment Variables Check

Ensure all 15 environment variables are set on Render.com:

```bash
# Database
✅ DATABASE_URL=postgresql://athletetime:***@dpg-ct9...

# Cloudinary
✅ CLOUDINARY_CLOUD_NAME=dedmfxtpa
✅ CLOUDINARY_API_KEY=374662414448121
✅ CLOUDINARY_API_SECRET=Z7aEbq9Ur538IGfk7q-A8QX72Ac

# Security
✅ JWT_SECRET=athletetime_jwt_secret_2024_production_***
✅ BCRYPT_ROUNDS=10

# CORS (CRITICAL - WITH HYPHEN!)
✅ FRONTEND_URL=https://athlete-time.netlify.app
✅ CORS_ORIGIN=https://athlete-time.netlify.app

# Rate Limiting
✅ RATE_LIMIT_ENABLED=true
✅ RATE_LIMIT_WINDOW=900000
✅ RATE_LIMIT_MAX_POSTS=5
✅ RATE_LIMIT_MAX_COMMENTS=10
✅ RATE_LIMIT_MAX_VOTES=50

# Server
✅ NODE_ENV=production
✅ PORT=10000 (auto-set by Render)
```

---

## 📁 Build Settings on Render

Verify these are correctly set:

- **Build Command**: `npm install`
- **Start Command**: `npm start` (which runs `node server.js`)
- **Auto-Deploy**: ✅ Enabled
- **Branch**: `main`
- **Root Directory**: `/` (or blank)

---

## 🐛 Troubleshooting

### Issue: Old server still running after deploy

**Symptom**: `/health` returns 404 or old posts format

**Solutions**:
1. Check Render logs for errors during build
2. Verify `package.json` has `"main": "server.js"`
3. Verify `start` script is `"node server.js"` (NOT community-server.js)
4. Clear build cache and redeploy
5. Check environment variables are all set

### Issue: Database connection fails

**Symptom**: Health check shows `"database": "error"`

**Solutions**:
1. Verify `DATABASE_URL` environment variable
2. Check PostgreSQL database is running
3. Run migration: Connect to Render Shell and run:
   ```bash
   psql $DATABASE_URL < database/schema.sql
   node database/seed.js
   ```

### Issue: Cloudinary upload fails

**Symptom**: Image upload returns 500 error

**Solutions**:
1. Verify all 3 Cloudinary env vars are set
2. Check Cloudinary dashboard for API limits
3. Verify folder `athlete-time/posts` exists (auto-created)

---

## 📊 Deployment Timeline

| Time | Event | Status |
|------|-------|--------|
| 05:40 UTC | Old server running (community-server.js) | ❌ |
| 06:15 UTC | Pushed v3.0.0 unified server.js (b83fed6) | ✅ |
| 06:30 UTC | Pushed empty commit to trigger deploy (fcf3fba) | ✅ |
| 06:31+ UTC | **Waiting for Render auto-deploy** | ⏳ |

---

## 🎯 Success Criteria

Deployment is successful when:

1. ✅ Health check returns version `3.0.0`
2. ✅ Database shows `connected`
3. ✅ Posts API returns PostgreSQL format (with `category_id`, `images` array)
4. ✅ Can create post with image upload via Cloudinary
5. ✅ WebSocket connects and shows "WebSocket connected" in console
6. ✅ Comments and voting work
7. ✅ Frontend displays posts correctly

---

## 📞 Need Help?

If deployment issues persist:
1. Check Render logs: Service → Logs tab
2. Check build logs for npm install errors
3. Check runtime logs for server startup errors
4. Verify GitHub repository has latest code
5. Contact Render support if infrastructure issue

**Latest GitHub Commits**:
- `fcf3fba` - Trigger deployment commit
- `b83fed6` - Complete v3.0.0 unified server
- `a44799b` - Fixed PostgreSQL schema
- `f0749e4` - Fixed frontend URL (with hyphen)

---

**Generated**: 2025-10-29T06:31:00Z
**By**: Claude (Sonnet) - Complete Rebuild Agent
