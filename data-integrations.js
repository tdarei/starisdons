/**
 * Data Integrations: NASA Exoplanet Archive + NASA APOD
 * Lightweight fetchers with graceful fallback and simple UI render.
 */
(function () {
    const FEEDS_CACHE_KEY = 'ep_live_feeds_cache_v1';
    const CACHE_TTL_MS = 1000 * 60 * 30; // 30 minutes

    const notify = (msg, type = 'info') => {
        try {
            if (window.game && typeof window.game.notify === 'function') {
                window.game.notify(msg, type);
            } else {
                console.log(`[${type}] ${msg}`);
            }
        } catch (_) {
            // ignore
        }
    };

    async function fetchJSON(url) {
        const res = await fetch(url);
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        return res.json();
    }

    async function getExoplanetDiscoveries() {
        try {
            // Limit fields for lighter payload; include discovery year and name
            const url = 'https://exoplanetarchive.ipac.caltech.edu/TAP/sync?query=select+pl_name,disc_year,hostname,sy_dist,pl_rade,pl_bmasse+from+ps+order+by+disc_year+desc+limit+5&format=json';
            const data = await fetchJSON(url);
            return (data || []).map((p) => ({
                title: p.pl_name || 'Unknown planet',
                desc: `Discovered: ${p.disc_year || 'N/A'} | Host: ${p.hostname || 'N/A'} | Dist: ${p.sy_dist ? `${p.sy_dist} pc` : 'N/A'}`,
            }));
        } catch (e) {
            console.warn('ExoplanetArchive fetch failed', e);
            notify('Exoplanet archive feed unavailable.', 'warning');
            return [];
        }
    }

    async function getAPOD() {
        try {
            // APOD demo endpoint (no key) with HD disabled; CORS may still block.
            const url = 'https://api.nasa.gov/planetary/apod?api_key=DEMO_KEY';
            const data = await fetchJSON(url);
            if (!data || !data.title) return null;
            return {
                title: data.title,
                desc: data.explanation ? data.explanation.slice(0, 180) + '…' : 'NASA APOD',
                link: data.url,
            };
        } catch (e) {
            console.warn('APOD fetch failed', e);
            notify('APOD feed unavailable.', 'warning');
            return null;
        }
    }

    async function getUpcomingLaunches() {
        try {
            const url = 'https://ll.thespacedevs.com/2.2.0/launch/upcoming/?limit=5&mode=detailed';
            const data = await fetchJSON(url);
            const launches = data?.results || [];
            return launches.map((l) => ({
                title: `Launch: ${l.name || 'Unknown mission'}`,
                desc: `Window: ${l.window_start ? new Date(l.window_start).toUTCString() : 'TBD'} | Pad: ${l.pad?.name || 'TBD'}`,
                link: l.url,
            }));
        } catch (e) {
            console.warn('Launch Library fetch failed', e);
            notify('Launch feed unavailable.', 'warning');
            return [];
        }
    }

    async function getSpaceNews() {
        try {
            const url = 'https://api.spaceflightnewsapi.net/v4/articles/?limit=5';
            const data = await fetchJSON(url);
            const articles = data?.results || data?.articles || [];
            return articles.map((a) => ({
                title: a.title || 'Space news',
                desc: a.summary ? `${a.summary.slice(0, 160)}…` : a.newsSite || 'Article',
                link: a.url,
            }));
        } catch (e) {
            console.warn('Space news fetch failed', e);
            notify('Space news feed unavailable.', 'warning');
            return [];
        }
    }

    function loadCache() {
        try {
            const raw = localStorage.getItem(FEEDS_CACHE_KEY);
            if (!raw) return null;
            const parsed = JSON.parse(raw);
            if (!parsed || !parsed.expires || Date.now() > parsed.expires) return null;
            return parsed.payload;
        } catch (_) {
            return null;
        }
    }

    function saveCache(payload) {
        try {
            if (!payload) {
                localStorage.removeItem(FEEDS_CACHE_KEY);
                return;
            }
            localStorage.setItem(FEEDS_CACHE_KEY, JSON.stringify({
                expires: Date.now() + CACHE_TTL_MS,
                payload,
            }));
        } catch (_) { /* ignore */ }
    }

    function clearCache() {
        try {
            localStorage.removeItem(FEEDS_CACHE_KEY);
        } catch (_) { /* ignore */ }
    }

    async function fetchLiveFeeds() {
        const cached = loadCache();
        if (cached) return cached;

        const [exoplanets, apod, launches, news] = await Promise.all([
            getExoplanetDiscoveries(),
            getAPOD(),
            getUpcomingLaunches(),
            getSpaceNews(),
        ]);

        const feeds = [];
        if (apod) feeds.push({ title: `APOD: ${apod.title}`, desc: apod.desc, link: apod.link });
        exoplanets.forEach((p) => feeds.push(p));
        launches.forEach((l) => feeds.push(l));
        news.forEach((n) => feeds.push(n));

        const payload = feeds.slice(0, 6);
        saveCache(payload);
        return payload;
    }

    async function renderLiveFeeds() {
        const container = document.getElementById('ep-data-body') || document.body;
        if (!container) return;
        let card = document.getElementById('ep-live-feeds');
        if (!card) {
            card = document.createElement('div');
            card.id = 'ep-live-feeds';
            card.className = 'ep-card';
            card.style.marginTop = '0.5rem';
            container.appendChild(card);
        }
        card.innerHTML = `<h4 style="margin:0 0 6px 0; color:#ba944f;">Live Space Feeds</h4><div style="color:#cbd5e1; font-size:0.95rem;">Loading…</div>`;

        try {
            const feeds = await fetchLiveFeeds();
            if (!feeds.length) {
                card.innerHTML = `<h4 style="margin:0 0 6px 0; color:#ba944f;">Live Space Feeds</h4><div style="color:#cbd5e1; font-size:0.95rem;">No data available.</div>`;
                return;
            }
            card.innerHTML = `
                <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:6px;">
                    <h4 style="margin:0; color:#ba944f;">Live Space Feeds</h4>
                    <button id="ep-live-refresh" style="background:rgba(255,255,255,0.08);border:1px solid rgba(255,255,255,0.2);color:#fff;padding:4px 8px;border-radius:6px;cursor:pointer;">Refresh</button>
                </div>
                <ul style="list-style:none; padding:0; margin:0; color:#e5e7eb; font-size:0.95rem; display:grid; gap:6px;">
                    ${feeds.map(f => `<li style="padding:6px; background:rgba(255,255,255,0.04); border:1px solid rgba(255,255,255,0.07); border-radius:6px;">
                        <div style="font-weight:600; color:#f5f5f5;">${f.title}</div>
                        <div style="font-size:0.9rem; color:#cbd5e1;">${f.desc || ''}</div>
                        ${f.link ? `<a href="${f.link}" target="_blank" rel="noreferrer" style="color:#38bdf8; font-size:0.85rem;">View</a>` : ''}
                    </li>`).join('')}
                </ul>
            `;
            const btn = document.getElementById('ep-live-refresh');
            if (btn) btn.onclick = () => { clearCache(); renderLiveFeeds(); };
        } catch (e) {
            console.warn('Render feeds failed', e);
            notify('Live space feeds failed to load.', 'warning');
            card.innerHTML = `<h4 style="margin:0 0 6px 0; color:#ba944f;">Live Space Feeds</h4><div style="color:#cbd5e1; font-size:0.95rem;">Failed to load feeds.</div>`;
        }
    }

    window.renderLiveFeeds = renderLiveFeeds;
})();
