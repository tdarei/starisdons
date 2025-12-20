import http.server
import socketserver
import os

PORT = 8086

NODE_ENV = os.environ.get('NODE_ENV', '').lower()
CORS_ORIGINS = [o.strip() for o in os.environ.get('CORS_ORIGINS', '').split(',') if o.strip()]

class CustomHandler(http.server.SimpleHTTPRequestHandler):
    def end_headers(self):
        origin = self.headers.get('Origin')
        allow_origin = None
        if origin:
            if CORS_ORIGINS:
                if origin in CORS_ORIGINS:
                    allow_origin = origin
            elif NODE_ENV != 'production':
                allow_origin = origin

        if allow_origin:
            self.send_header('Access-Control-Allow-Origin', allow_origin)
            self.send_header('Vary', 'Origin')
        self.send_header('Access-Control-Allow-Methods', 'GET, OPTIONS')
        self.send_header("Access-Control-Allow-Headers", "X-Requested-With, Content-Type, Origin, Authorization, Accept, Client-Security-Token, Accept-Encoding")
        # self.send_header('Cross-Origin-Opener-Policy', 'same-origin')
        # self.send_header('Cross-Origin-Embedder-Policy', 'require-corp')
        # SimpleHTTPRequestHandler in Python 3 usually supports Range by default,
        # but we explicit advertise it just in case clients check HEAD first.
        self.send_header('Accept-Ranges', 'bytes')
        super().end_headers()

    # Ensure extensions map correctly if needed, though default usually fine.
    extensions_map = http.server.SimpleHTTPRequestHandler.extensions_map.copy()
    extensions_map.update({
        '': 'application/octet-stream', # Default
        '.js': 'application/javascript',
        '.wasm': 'application/wasm',
        '.jar': 'application/java-archive', 
        '.class': 'application/java-vm',
    })

print(f"Serving HTTP on 0.0.0.0 port {PORT} (http://localhost:{PORT}/) ...")
with socketserver.TCPServer(("", PORT), CustomHandler) as httpd:
    httpd.allow_reuse_address = True
    httpd.serve_forever()
