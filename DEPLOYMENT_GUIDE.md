# 🚀 Athlete Time 배포 가이드

## 📋 목차
1. [배포 아키텍처](#배포-아키텍처)
2. [Frontend 배포 (Netlify)](#frontend-배포-netlify)
3. [Backend 배포 (Render)](#backend-배포-render)
4. [도메인 설정](#도메인-설정)
5. [환경 변수 관리](#환경-변수-관리)
6. [CI/CD 설정](#cicd-설정)
7. [모니터링](#모니터링)
8. [트러블슈팅](#트러블슈팅)

## 배포 아키텍처

```mermaid
graph LR
    User[사용자] --> CF[Cloudflare CDN]
    CF --> NF[Netlify Frontend]
    CF --> RB[Render Backend]
    RB --> PG[(PostgreSQL)]
    RB --> RD[(Redis)]
```

### 서비스 구성
- **Frontend**: Netlify (무료 플랜)
- **Backend**: Render (Starter $7/월)
- **Database**: PostgreSQL (Render 포함)
- **Cache**: Redis (선택사항)
- **CDN**: Cloudflare (무료)

## Frontend 배포 (Netlify)

### 1. Netlify 계정 설정
```bash
# Netlify CLI 설치
npm install -g netlify-cli

# 로그인
netlify login
```

### 2. 프로젝트 연결
```bash
# 프로젝트 디렉토리에서
cd athletetime
netlify init
```

### 3. 배포 설정 (netlify.toml)
```toml
[build]
  command = "cd community-new && npm run build"
  publish = "community-new/dist"

[build.environment]
  NODE_VERSION = "18"

[[redirects]]
  from = "/api/*"
  to = "https://athletetime-backend.onrender.com/api/:splat"
  status = 200

[[headers]]
  for = "/*"
  [headers.values]
    X-Frame-Options = "DENY"
    X-XSS-Protection = "1; mode=block"
    X-Content-Type-Options = "nosniff"
```

### 4. 자동 배포
```bash
# 수동 배포
netlify deploy --prod

# GitHub 연동 (자동 배포)
# Netlify 대시보드에서 설정
```

## Backend 배포 (Render)

### 1. Render.yaml 설정
```yaml
services:
  - type: web
    name: athletetime-backend
    env: node
    region: oregon
    plan: starter # $7/month
    buildCommand: npm install
    startCommand: node server.js
    envVars:
      - key: NODE_ENV
        value: production
      - key: DATABASE_URL
        fromDatabase:
          name: athletetime-db
          property: connectionString

databases:
  - name: athletetime-db
    region: oregon
    plan: starter # included
    databaseName: athletetime
    user: athletetime
```

### 2. 환경 변수 설정
```env
# .env.production
NODE_ENV=production
PORT=3000
DATABASE_URL=postgresql://user:pass@host:5432/dbname
JWT_SECRET=your-secret-key
CORS_ORIGIN=https://athletetime.netlify.app
```

### 3. 데이터베이스 마이그레이션
```bash
# 초기 스키마 설정
npm run migrate:up

# 시드 데이터 (선택사항)
npm run seed
```

## 도메인 설정

### 1. 도메인 구매 (Namecheap/Google Domains)
- athletetime.com
- athletetime.kr

### 2. Cloudflare DNS 설정
```
# A 레코드
@     A     192.0.2.1  (Netlify IP)
www   CNAME @

# API 서브도메인
api   CNAME athletetime-backend.onrender.com
```

### 3. SSL 인증서
- Netlify: 자동 Let's Encrypt
- Render: 자동 제공
- Cloudflare: Full (Strict) SSL

## 환경 변수 관리

### Frontend (.env.production)
```env
VITE_API_URL=https://api.athletetime.com
VITE_WS_URL=wss://api.athletetime.com
VITE_GA_ID=G-XXXXXXXXXX
```

### Backend (.env.production)
```env
NODE_ENV=production
PORT=3000

# Database
DATABASE_URL=postgresql://...
REDIS_URL=redis://...

# Auth
JWT_SECRET=...
JWT_EXPIRES_IN=7d

# Email
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=...
SMTP_PASS=...

# Storage
AWS_ACCESS_KEY_ID=...
AWS_SECRET_ACCESS_KEY=...
AWS_BUCKET=athletetime-uploads
```

## CI/CD 설정

### GitHub Actions (.github/workflows/deploy.yml)
```yaml
name: Deploy

on:
  push:
    branches: [main]

jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: actions/setup-node@v3
        with:
          node-version: '18'
      - run: npm ci
      - run: npm test
      - run: npm run build

  deploy-frontend:
    needs: test
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: netlify/actions/cli@master
        with:
          args: deploy --prod
        env:
          NETLIFY_AUTH_TOKEN: ${{ secrets.NETLIFY_AUTH_TOKEN }}
          NETLIFY_SITE_ID: ${{ secrets.NETLIFY_SITE_ID }}

  deploy-backend:
    needs: test
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: render-deploy/action@v1
        with:
          service-id: ${{ secrets.RENDER_SERVICE_ID }}
          api-key: ${{ secrets.RENDER_API_KEY }}
```

## 모니터링

### 1. 성능 모니터링
```javascript
// Sentry 설정
import * as Sentry from "@sentry/node";

Sentry.init({
  dsn: process.env.SENTRY_DSN,
  environment: process.env.NODE_ENV,
  tracesSampleRate: 0.1,
});
```

### 2. 로깅
```javascript
// Winston 설정
const winston = require('winston');

const logger = winston.createLogger({
  level: 'info',
  format: winston.format.json(),
  transports: [
    new winston.transports.File({ filename: 'error.log', level: 'error' }),
    new winston.transports.Console()
  ]
});
```

### 3. 헬스체크
```javascript
// Health check endpoint
app.get('/health', (req, res) => {
  res.json({
    status: 'healthy',
    timestamp: new Date().toISOString(),
    uptime: process.uptime()
  });
});
```

## 트러블슈팅

### 일반적인 문제 해결

#### 1. Build 실패
```bash
# 캐시 클리어
npm cache clean --force
rm -rf node_modules package-lock.json
npm install
```

#### 2. 환경 변수 누락
```bash
# Render CLI로 확인
render config:get

# Netlify CLI로 확인
netlify env:list
```

#### 3. CORS 에러
```javascript
// server.js
app.use(cors({
  origin: process.env.CORS_ORIGIN || 'http://localhost:5173',
  credentials: true
}));
```

#### 4. 데이터베이스 연결 실패
```bash
# PostgreSQL 연결 테스트
psql $DATABASE_URL -c "SELECT 1"

# 연결 풀 설정
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false },
  max: 20,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 2000,
});
```

### 성능 최적화

#### 1. Frontend 최적화
- Code splitting
- Lazy loading
- Image optimization
- CDN 캐싱

#### 2. Backend 최적화
- Database indexing
- Query optimization
- Redis caching
- Rate limiting

### 백업 및 복구

#### 1. 데이터베이스 백업
```bash
# 일일 백업 스크립트
pg_dump $DATABASE_URL > backup_$(date +%Y%m%d).sql

# 복구
psql $DATABASE_URL < backup_20250116.sql
```

#### 2. 자동 백업 설정
- Render: Daily automatic backups (Starter plan)
- 추가 백업: AWS S3 또는 Google Cloud Storage

---

## 📞 지원

배포 관련 문의:
- GitHub Issues: [문제 제기](https://github.com/hojune0330/athletetime/issues)
- Discord: [개발자 커뮤니티](https://discord.gg/athletetime)

---

*Last Updated: 2025-01-16*