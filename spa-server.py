#!/usr/bin/env python3
"""
SPA Server for AthleTime Frontend
- Serves static files from /home/user/webapp/community
- Falls back to index.html for SPA routing
"""

import os
import mimetypes
from http.server import HTTPServer, SimpleHTTPRequestHandler

DIST_DIR = '/home/user/webapp/community'

class SPAHandler(SimpleHTTPRequestHandler):
    def __init__(self, *args, **kwargs):
        super().__init__(*args, directory=DIST_DIR, **kwargs)

    def do_GET(self):
        # Check if the requested file exists
        file_path = os.path.join(DIST_DIR, self.path.lstrip('/'))
        
        # If it's a real file (assets, etc.), serve it normally
        if os.path.isfile(file_path):
            super().do_GET()
        else:
            # SPA fallback: serve index.html for all routes
            self.path = '/index.html'
            super().do_GET()

    def end_headers(self):
        # Add CORS and cache headers
        self.send_header('Access-Control-Allow-Origin', '*')
        self.send_header('Cache-Control', 'no-cache')
        super().end_headers()

    def log_message(self, format, *args):
        # Suppress noisy logs, only print errors
        if '404' in str(args) or '500' in str(args):
            super().log_message(format, *args)

if __name__ == '__main__':
    port = 5173
    server = HTTPServer(('0.0.0.0', port), SPAHandler)
    print(f'SPA Server running on http://0.0.0.0:{port}')
    print(f'Serving files from: {DIST_DIR}')
    server.serve_forever()
