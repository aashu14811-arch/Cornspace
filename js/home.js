function handleNavigation() {
    const urlParams = new URLSearchParams(window.location.search);
    const searchQuery = urlParams.get('search');
    const videoId = urlParams.get('v');
    
    document.getElementById('home-sections').classList.add('hidden');
    document.getElementById('search-results-section').classList.add('hidden');
    document.getElementById('watch-section').classList.add('hidden');
    
    const chipsContainer = document.getElementById('category-chips');
    if (chipsContainer) {
        if (videoId) {
            chipsContainer.classList.add('hidden');
        } else {
            chipsContainer.classList.remove('hidden');
        }
    }

    if (window.innerWidth <= 768) {
        document.getElementById('sidebar').classList.remove('open');
        const overlay = document.getElementById('sidebar-overlay');
        if (overlay) overlay.classList.remove('active');
    }

    window.scrollTo(0, 0);

    // Sync active states
    document.querySelectorAll('.nav-item').forEach(n => {
        n.classList.remove('active');
        if (searchQuery && n.dataset.category === searchQuery) n.classList.add('active');
    });
    document.querySelectorAll('.chip').forEach(c => {
        c.classList.remove('active');
        if (searchQuery && c.dataset.chip === searchQuery) c.classList.add('active');
    });

    if (!searchQuery && !videoId) {
        const homeNav = document.querySelector('.nav-item[data-nav="Home"]');
        if (homeNav) homeNav.classList.add('active');
        
        const allChip = document.querySelector('.chip[data-chip="All"]');
        if (allChip) allChip.classList.add('active');
    }

    if (videoId) {
        renderWatchPage(videoId);
    } else if (searchQuery) {
        handleSearch(searchQuery);
    } else {
        renderHomeSections();
    }
}

document.addEventListener('videosLoaded', handleNavigation);
document.addEventListener('navigate', handleNavigation);
window.addEventListener('popstate', handleNavigation);

function renderHomeSections() {
    document.getElementById('home-sections').classList.remove('hidden');

    const videos = window.videosData;
    
    // Simple logic for sections
    const latest = [...videos].sort((a, b) => new Date(b.publishDate) - new Date(a.publishDate)).slice(0, 8);

    renderGrid('latest-grid', latest);
}

function renderGrid(containerId, videos) {
    const container = document.getElementById(containerId);
    if (!container) return;
    container.innerHTML = '';
    videos.forEach(v => {
        container.appendChild(createVideoCard(v));
    });
}

function handleSearch(query) {
    const searchSection = document.getElementById('search-results-section');
    searchSection.classList.remove('hidden');
    
    const q = query.toLowerCase();
    
    // Fuzzy match
    let results = window.videosData.filter(v => {
        const cats = Array.isArray(v.category) ? v.category : [v.category];
        return (v.title && window.fuzzyMatch(v.title, q)) ||
        (v.videoCode && window.fuzzyMatch(v.videoCode, q)) ||
        (v.credits && window.fuzzyMatch(v.credits, q)) ||
        cats.some(c => c && window.fuzzyMatch(c, q)) ||
        (v.actors && v.actors.some(a => a && window.fuzzyMatch(a, q))) ||
        (v.description && window.fuzzyMatch(v.description, q));
    });

    const titleEl = document.getElementById('search-results-title');
    
    if (results.length === 0) {
        titleEl.textContent = `No exact matches for "${query}". Showing related videos:`;
        // Fallback to related (just random for now)
        results = [...window.videosData].sort(() => 0.5 - Math.random()).slice(0, 8);
    } else {
        titleEl.textContent = `Search Results for "${query}"`;
    }

    renderGrid('search-grid', results);
}

function renderWatchPage(videoId) {
    const watchSection = document.getElementById('watch-section');
    watchSection.classList.remove('hidden');

    const video = window.videosData.find(v => v.id === videoId);
    if (!video) {
        document.getElementById('video-title').textContent = 'Video not found';
        return;
    }

    // Render player with a facade to improve load time
    const playerContainer = document.getElementById('player-container');
    const thumbSrc = video.thumbnail || `https://picsum.photos/seed/${video.id}/1280/720`;
    
    playerContainer.innerHTML = `
        <div class="video-facade" style="position: absolute; top: 0; left: 0; width: 100%; height: 100%; background: #000; cursor: pointer; display: flex; align-items: center; justify-content: center; border-radius: 12px; overflow: hidden;">
            <img id="watch-thumb" loading="lazy" style="position: absolute; width: 100%; height: 100%; object-fit: cover; opacity: 0.7;" src="${thumbSrc}" alt="Thumbnail">
            <div class="play-button" style="position: relative; z-index: 10; width: 68px; height: 48px; background: rgba(255,0,0,0.8); border-radius: 12px; display: flex; align-items: center; justify-content: center; transition: background 0.2s;" onmouseover="this.style.background='rgba(255,0,0,1)'" onmouseout="this.style.background='rgba(255,0,0,0.8)'">
                <svg viewBox="0 0 24 24" width="32" height="32" fill="white"><path d="M8 5v14l11-7z"/></svg>
            </div>
        </div>
    `;

    // Load iframe on click
    playerContainer.querySelector('.video-facade').addEventListener('click', () => {
        const embedUrlStr = video.embedUrl || video.odyseeEmbed;
        const embedUrl = new URL(embedUrlStr);
        // Add autoplay parameter. Voe usually supports ?autoplay=1 or ?a=1.
        embedUrl.searchParams.set('autoplay', '1');
        embedUrl.searchParams.set('a', '1');
        
        playerContainer.innerHTML = `<iframe id="video-iframe" style="width:100%; aspect-ratio:16 / 9; border: none; border-radius: 12px;" src="${embedUrl.toString()}" allow="autoplay" allowfullscreen></iframe>`;
    });

    // Render info
    document.getElementById('video-title').textContent = video.title;
    document.getElementById('video-date').textContent = video.publishDate;
    
    const cats = Array.isArray(video.category) ? video.category : [video.category];
    document.getElementById('video-category').textContent = cats.filter(Boolean).join(', ');
    
    const codeDisplay = document.getElementById('video-code-display');
    if (codeDisplay) {
        codeDisplay.textContent = video.videoCode ? ` • Code: ${video.videoCode}` : '';
    }
    
    document.getElementById('video-description').textContent = video.description;
    document.getElementById('video-actors').textContent = video.actors ? video.actors.join(', ') : '';
    document.getElementById('video-credits').textContent = video.credits;

    // Render related
    const related = window.videosData
        .filter(v => {
            if (v.id === video.id) return false;
            const vCats = Array.isArray(v.category) ? v.category : [v.category];
            return vCats.some(c => cats.includes(c));
        })
        .sort((a, b) => {
            let scoreA = 0;
            let scoreB = 0;
            
            const aCats = Array.isArray(a.category) ? a.category : [a.category];
            const bCats = Array.isArray(b.category) ? b.category : [b.category];
            
            aCats.forEach(c => { if (cats.includes(c)) scoreA += 1; });
            bCats.forEach(c => { if (cats.includes(c)) scoreB += 1; });
            
            return scoreB - scoreA;
        })
        .slice(0, 10);

    renderGrid('related-grid', related);
}

// Category navigation via event delegation
document.getElementById('sidebar').addEventListener('click', (e) => {
    const navItem = e.target.closest('.nav-item');
    if (!navItem) return;
    
    e.preventDefault();

    const category = navItem.dataset.category;
    const nav = navItem.dataset.nav;

    if (nav === 'Home') {
        window.history.pushState({}, '', '/');
        handleNavigation();
        if (window.innerWidth <= 768 && window.closeSidebar) window.closeSidebar();
        return;
    }

    if (category) {
        window.history.pushState({}, '', `/?search=${encodeURIComponent(category)}`);
        handleNavigation();
        if (window.innerWidth <= 768 && window.closeSidebar) window.closeSidebar();
    }
});

// Category chips navigation
const chipsContainer = document.getElementById('category-chips');
if (chipsContainer) {
    chipsContainer.addEventListener('click', (e) => {
        const chip = e.target.closest('.chip');
        if (!chip) return;
        
        e.preventDefault();

        const category = chip.dataset.chip;

        if (category === 'All') {
            window.history.pushState({}, '', '/');
            handleNavigation();
            return;
        }

        if (category) {
            window.history.pushState({}, '', `/?search=${encodeURIComponent(category)}`);
            handleNavigation();
        }
    });
}

// Logo click
document.querySelector('.logo').addEventListener('click', (e) => {
    e.preventDefault();
    window.history.pushState({}, '', '/');
    handleNavigation();
    if (window.innerWidth <= 768 && window.closeSidebar) window.closeSidebar();
});
