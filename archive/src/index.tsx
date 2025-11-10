import { Hono } from 'hono'
import { cors } from 'hono/cors'
import { serveStatic } from 'hono/cloudflare-workers'
import { renderer } from './renderer'
import { StaticAppV2 } from './components/StaticAppV2'
import communityApi from './api/community-api'
// Temporary: Comment out database-dependent routes for production deployment
// import { communityRoutes } from './routes/community'
// import { schedulesRoutes } from './routes/schedules'
// import resultsRoutes from './routes/results'

// Temporary: Comment out database bindings for production deployment
// type Bindings = {
//   DB: D1Database;
// }

const app = new Hono()

// Enable CORS for API routes
app.use('/api/*', cors())

// Serve static files
app.use('/static/*', serveStatic({ root: './public' }))
app.use('/app', serveStatic({ root: './public/static', path: '/app.html' }))

// Let Cloudflare Pages serve static HTML files directly
// These routes are removed because static files should be served by Pages, not Workers

// Community page route
app.get('/community', (c) => {
  return c.redirect('/community-mobile.html')
})

// Use JSX renderer for HTML pages
app.use(renderer)

// Temporary API routes (without database)
app.get('/api/community/categories', (c) => {
  return c.json({
    success: true,
    categories: [
      { id: 1, name: '초등부', description: '초등학생 육상인들의 공간' },
      { id: 2, name: '중등부', description: '중학생 육상인들의 공간' },
      { id: 3, name: '고등부', description: '고등학생 육상인들의 공간' },
      { id: 4, name: '대학부', description: '대학생 육상인들의 공간' },
      { id: 5, name: '실업부', description: '실업팀 육상인들의 공간' },
      { id: 6, name: '마스터즈', description: '마스터즈 육상인들의 공간' },
      { id: 7, name: '자유게시판', description: '자유로운 소통 공간' }
    ]
  })
})

app.get('/api/results/rankings/:eventName', (c) => {
  const eventName = c.req.param('eventName')
  return c.json({
    success: true,
    event_name: eventName,
    message: '데이터베이스 연결 준비 중입니다. 곧 실제 기록이 표시됩니다!'
  })
})

// Community API Routes (in-memory for beta)
app.route('/api/community', communityApi)

// API Routes (commented out for production deployment)
// app.route('/api/schedules', schedulesRoutes)  
// app.route('/api/results', resultsRoutes)

// Main landing page - serve index.html that redirects to mobile
app.get('/', (c) => {
  const html = `<!DOCTYPE html>
<html lang="ko">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <meta http-equiv="refresh" content="0; url=/index-mobile.html">
  <title>애슬리트타임 - 육상 선수들을 위한 커뮤니티</title>
</head>
<body>
  <script>window.location.replace('/index-mobile.html');</script>
</body>
</html>`
  return c.html(html)
})

// Original desktop version (kept as fallback)
app.get('/desktop', (c) => {
  // Fallback HTML with React mounting point
  return c.html(`
    <!DOCTYPE html>
    <html lang="ko">
    <head>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>애슬리트 타임 | 한국 육상인 통합 플랫폼</title>
      <meta name="description" content="초중고대실업마스터즈 육상 경기 시간표와 익명 커뮤니티">
      
      <!-- Tailwind CSS -->
      <script src="https://cdn.tailwindcss.com"></script>
      
      <!-- Font Awesome -->
      <link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/@fortawesome/fontawesome-free@6.4.0/css/all.min.css">
      
      <!-- React -->
      <script crossorigin src="https://unpkg.com/react@18/umd/react.production.min.js"></script>
      <script crossorigin src="https://unpkg.com/react-dom@18/umd/react-dom.production.min.js"></script>
      
      <style>
        @keyframes gradient {
          0% { background-position: 0% 50%; }
          50% { background-position: 100% 50%; }
          100% { background-position: 0% 50%; }
        }
        .animate-gradient {
          animation: gradient 3s ease infinite;
          background-size: 300% 300%;
        }
        .bg-300\\% { background-size: 300% 300%; }
        .animation-delay-2000 { animation-delay: 2s; }
        .animation-delay-4000 { animation-delay: 4s; }
      </style>
    </head>
    <body>
      <div id="root">
        <!-- React app will be mounted here -->
        <div class="min-h-screen bg-gradient-to-br from-blue-50 via-purple-50 to-pink-50 flex items-center justify-center">
          <div class="text-center">
            <h1 class="text-4xl font-bold mb-4 bg-gradient-to-r from-red-500 to-blue-500 bg-clip-text text-transparent animate-pulse">
              애슬리트 타임
            </h1>
            <p class="text-gray-600">로딩 중...</p>
          </div>
        </div>
      </div>
      
      <!-- Interactive App Bundle -->
      <script type="module">
        // Dynamically import and render the React app
        import('/static/app.js').then(module => {
          console.log('App module loaded');
        }).catch(err => {
          console.error('Failed to load app:', err);
          // Fallback: Load directly
          loadReactApp();
        });
        
        function loadReactApp() {
          // Wait for React to be available
          if (typeof React === 'undefined' || typeof ReactDOM === 'undefined') {
            setTimeout(loadReactApp, 100);
            return;
          }
          
          // Import components directly (bundled version)
          const script = document.createElement('script');
          script.src = '/static/bundle.js';
          script.onload = () => {
            if (window.AthletimeApp) {
              const root = ReactDOM.createRoot(document.getElementById('root'));
              root.render(React.createElement(window.AthletimeApp));
            }
          };
          document.body.appendChild(script);
        }
        
        // Auto-load after delay
        setTimeout(loadReactApp, 1000);
      </script>
    </body>
    </html>
  `)
})

export default app
