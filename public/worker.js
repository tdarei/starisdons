/* global Response, Headers */

export default {
    async fetch(request, env) {
        const url = new URL(request.url);
        const key = url.pathname.slice(1); // Remove leading slash

        const origin = request.headers.get('Origin') || '';
        const nodeEnv = (env && env.NODE_ENV ? String(env.NODE_ENV) : 'production').toLowerCase();
        const allowed = (env && env.ALLOWED_ORIGINS ? String(env.ALLOWED_ORIGINS) : '')
            .split(',')
            .map((s) => s.trim())
            .filter(Boolean);
        let allowOrigin = '';
        if (origin) {
            if (allowed.length > 0) {
                if (allowed.includes(origin)) allowOrigin = origin;
            } else if (nodeEnv !== 'production') {
                allowOrigin = origin;
            }
        }

        if (request.method === 'OPTIONS') {
            if (!allowOrigin) {
                return new Response('Forbidden', { status: 403 });
            }
            const headers = new Headers();
            headers.set('Access-Control-Allow-Origin', allowOrigin);
            headers.set('Access-Control-Allow-Methods', 'GET, HEAD, OPTIONS');
            headers.set('Access-Control-Allow-Headers', 'Content-Type, Authorization');
            headers.set('Vary', 'Origin');
            return new Response(null, { status: 204, headers });
        }

        if (!key) {
            return new Response('Welcome to StarIsDons SWF Host', { status: 200 });
        }

        if (key === 'list') {
            const listToken = (env && (env.LIST_TOKEN || env.API_TOKEN)) ? String(env.LIST_TOKEN || env.API_TOKEN) : '';
            if (!listToken) {
                return new Response('Forbidden', { status: 403 });
            }

            const auth = request.headers.get('Authorization') || '';
            const provided = auth.startsWith('Bearer ') ? auth.slice('Bearer '.length).trim() : auth.trim();
            if (!provided || provided !== listToken) {
                return new Response('Unauthorized', { status: 401 });
            }

            const list = await env.SWF_BUCKET.list();
            const headers = new Headers();
            headers.set('Content-Type', 'application/json');
            if (allowOrigin) {
                headers.set('Access-Control-Allow-Origin', allowOrigin);
                headers.set('Vary', 'Origin');
            }
            headers.set('Access-Control-Allow-Methods', 'GET, HEAD, OPTIONS');
            headers.set('Access-Control-Allow-Headers', 'Content-Type, Authorization');
            return new Response(JSON.stringify(list, null, 2), { status: 200, headers });
        }

        // Try to get the object from the bucket
        const object = await env.SWF_BUCKET.get(key);

        if (object === null) {
            return new Response('Object Not Found', { status: 404 });
        }

        const headers = new Headers();
        object.writeHttpMetadata(headers);
        headers.set('etag', object.httpEtag);
        // CORS Headers
        if (allowOrigin) {
            headers.set('Access-Control-Allow-Origin', allowOrigin);
            headers.set('Vary', 'Origin');
        }
        headers.set('Access-Control-Allow-Methods', 'GET, HEAD, OPTIONS');
        headers.set('Access-Control-Allow-Headers', 'Content-Type, Authorization');

        return new Response(object.body, {
            headers,
        });
    },
};
