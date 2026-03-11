// Global state
window.videosData = [];

// Fuzzy search utility
window.fuzzyMatch = function(text, query) {
    if (!text || !query) return false;
    text = text.toLowerCase();
    query = query.toLowerCase().trim();
    if (text.includes(query)) return true;

    // Subsequence match
    let qIdx = 0;
    let tIdx = 0;
    while (qIdx < query.length && tIdx < text.length) {
        if (query[qIdx] === text[tIdx]) qIdx++;
        tIdx++;
    }
    if (qIdx === query.length) return true;

    // Levenshtein distance
    const distance = (a, b) => {
        if (a.length === 0) return b.length;
        if (b.length === 0) return a.length;
        const matrix = [];
        for (let i = 0; i <= b.length; i++) matrix[i] = [i];
        for (let j = 0; j <= a.length; j++) matrix[0][j] = j;
        for (let i = 1; i <= b.length; i++) {
            for (let j = 1; j <= a.length; j++) {
                if (b.charAt(i - 1) === a.charAt(j - 1)) {
                    matrix[i][j] = matrix[i - 1][j - 1];
                } else {
                    matrix[i][j] = Math.min(matrix[i - 1][j - 1] + 1, Math.min(matrix[i][j - 1] + 1, matrix[i - 1][j] + 1));
                }
            }
        }
        return matrix[b.length][a.length];
    };

    if (query.length > 3) {
        if (distance(query, text) <= 2) return true;
        const textWords = text.split(/[\s\-_]+/);
        const queryWords = query.split(/[\s\-_]+/);
        for (let qw of queryWords) {
            if (qw.length < 3) continue;
            for (let tw of textWords) {
                if (distance(qw, tw) <= 1) return true;
                if (tw.includes(qw)) return true;
            }
        }
    }
    return false;
};

// Fetch videos
async function fetchVideos() {
    try {
        const res = await fetch('/data/videos.json');
        window.videosData = await res.json();
        populateCategories();
        // Dispatch event when data is loaded
        document.dispatchEvent(new Event('videosLoaded'));
    } catch (error) {
        console.error('Error loading videos:', error);
    }
}

function populateCategories() {
    const container = document.getElementById('dynamic-categories');
    const chipsContainer = document.getElementById('category-chips');
    
    // Get unique categories
    const allCategories = window.videosData.flatMap(v => Array.isArray(v.category) ? v.category : [v.category]);
    const categories = [...new Set(allCategories)].filter(Boolean).sort();

    if (container) {
        container.innerHTML = categories.map(cat => `
            <a href="/?search=${encodeURIComponent(cat)}" class="nav-item" data-category="${cat}">
                <span>${cat}</span>
            </a>
        `).join('');
    }

    if (chipsContainer) {
        chipsContainer.innerHTML = `
            <a href="/" class="chip active" data-chip="All">All</a>
            ${categories.map(cat => `
                <a href="/?search=${encodeURIComponent(cat)}" class="chip" data-chip="${cat}">${cat}</a>
            `).join('')}
        `;
    }
}

// Sidebar toggle
const menuBtn = document.getElementById('menu-btn');
const sidebar = document.getElementById('sidebar');
const sidebarOverlay = document.getElementById('sidebar-overlay');

function toggleSidebar() {
    sidebar.classList.toggle('open');
    if (window.innerWidth <= 768 && sidebarOverlay) {
        sidebarOverlay.classList.toggle('active', sidebar.classList.contains('open'));
    }
}

function closeSidebar() {
    sidebar.classList.remove('open');
    if (sidebarOverlay) {
        sidebarOverlay.classList.remove('active');
    }
}
window.closeSidebar = closeSidebar;

if (menuBtn && sidebar) {
    menuBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        toggleSidebar();
    });

    if (sidebarOverlay) {
        sidebarOverlay.addEventListener('click', closeSidebar);
    }

    document.addEventListener('click', (e) => {
        if (window.innerWidth <= 768 && sidebar.classList.contains('open')) {
            if (!sidebar.contains(e.target) && !menuBtn.contains(e.target)) {
                closeSidebar();
            }
        }
    });
}

// Search functionality
const searchInput = document.getElementById('search-input');
const searchBtn = document.getElementById('search-btn');
const suggestionsBox = document.getElementById('search-suggestions');

if (searchInput && searchBtn && suggestionsBox) {
    searchInput.addEventListener('input', (e) => {
        const query = e.target.value.toLowerCase().trim();
        if (query.length < 2) {
            suggestionsBox.classList.add('hidden');
            return;
        }

        const suggestions = new Set();
        window.videosData.forEach(v => {
            if (v.title && typeof window.fuzzyMatch === 'function' && window.fuzzyMatch(v.title, query)) suggestions.add(v.title);
            if (v.videoCode && typeof window.fuzzyMatch === 'function' && window.fuzzyMatch(v.videoCode, query)) suggestions.add(v.videoCode);
            if (v.credits && typeof window.fuzzyMatch === 'function' && window.fuzzyMatch(v.credits, query)) suggestions.add(v.credits);
            
            const cats = Array.isArray(v.category) ? v.category : [v.category];
            cats.forEach(c => {
                if (c && typeof window.fuzzyMatch === 'function' && window.fuzzyMatch(c, query)) suggestions.add(c);
            });

            if (v.actors) {
                v.actors.forEach(a => {
                    if (a && typeof window.fuzzyMatch === 'function' && window.fuzzyMatch(a, query)) suggestions.add(a);
                });
            }
        });

        const html = Array.from(suggestions).slice(0, 8).map(s => 
            `<div class="suggestion-item">${s}</div>`
        ).join('');

        if (html) {
            suggestionsBox.innerHTML = html;
            suggestionsBox.classList.remove('hidden');
        } else {
            suggestionsBox.classList.add('hidden');
        }
    });

    suggestionsBox.addEventListener('click', (e) => {
        if (e.target.classList.contains('suggestion-item')) {
            searchInput.value = e.target.textContent;
            suggestionsBox.classList.add('hidden');
            performSearch(searchInput.value);
        }
    });

    searchBtn.addEventListener('click', () => {
        performSearch(searchInput.value);
    });

    searchInput.addEventListener('keypress', (e) => {
        if (e.key === 'Enter') {
            performSearch(searchInput.value);
            suggestionsBox.classList.add('hidden');
        }
    });

    document.addEventListener('click', (e) => {
        if (!e.target.closest('.search-container')) {
            suggestionsBox.classList.add('hidden');
        }
    });
}

function performSearch(query) {
    if (!query.trim()) return;
    window.history.pushState({}, '', `/?search=${encodeURIComponent(query)}`);
    const event = new CustomEvent('navigate');
    document.dispatchEvent(event);
}

// Odysee API integration
function embedToLbryUrl(embedUrl) {
    const path = embedUrl.split('/$/embed/')[1].split('?')[0];
    return 'lbry://' + path.replace(/:/g, '#');
}

async function getOdyseeMeta(embedUrl) {
    const lbryUrl = embedToLbryUrl(embedUrl);
    
    const res = await fetch('https://api.na-backend.odysee.com/api/v1/proxy', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
            method: 'resolve',
            params: { urls: [lbryUrl] }
        })
    });
    const data = await res.json();
    const meta = data.result[lbryUrl].value;

    if (!meta) {
        throw new Error('Video not found or invalid response');
    }

    return {
        thumbnail: meta.thumbnail?.url,
        duration: meta.video?.duration,
        title: meta.title
    };
}

function formatDuration(seconds) {
    if (!seconds) return '';
    const h = Math.floor(seconds / 3600);
    const m = Math.floor((seconds % 3600) / 60);
    const s = seconds % 60;
    if (h > 0) {
        return `${h}:${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
    }
    return `${m}:${s.toString().padStart(2, '0')}`;
}

// Utility to create video card
function createVideoCard(video) {
    const card = document.createElement('a');
    card.href = `/?v=${video.id}`;
    card.className = 'video-card';
    card.addEventListener('click', (e) => {
        e.preventDefault();
        window.history.pushState({}, '', `/?v=${video.id}`);
        const event = new CustomEvent('navigate');
        document.dispatchEvent(event);
    });
    
    // Fallback to video.duration if meta fails
    const durationHtml = `<div class="video-duration duration">${video.duration || ''}</div>`;
    const actorsHtml = video.actors && video.actors.length > 0 ? `<div class="video-actors">${video.actors.join(', ')}</div>` : '';

    card.innerHTML = `
        <div class="video-preview">
            <img class="thumb" loading="lazy" alt="Video thumbnail">
            <div class="video-overlay"></div>
            ${durationHtml}
        </div>
        <div class="video-details">
            <div class="video-info">
                <h3 class="title">${video.title}</h3>
                ${actorsHtml}
            </div>
        </div>
    `;

    // Inject Metadata
    getOdyseeMeta(video.odyseeEmbed).then(meta => {
        if (meta.thumbnail) card.querySelector('.thumb').src = meta.thumbnail;
        if (meta.duration) card.querySelector('.duration').textContent = formatDuration(meta.duration);
        // Do not update the title from metadata to keep the admin title
    }).catch(err => {
        console.error('Failed to fetch Odysee meta for', video.id, err);
        // Fallback to a placeholder if thumbnail fails
        card.querySelector('.thumb').src = 'https://picsum.photos/seed/' + video.id + '/640/360';
    });

    return card;
}

// Start fetching
fetchVideos();
