document.addEventListener('DOMContentLoaded', () => {
    // State management
    let releaseNotes = [];
    let currentCategoryFilter = 'all';
    let searchQuery = '';
    
    // DOM Elements
    const refreshBtn = document.getElementById('refresh-btn');
    const refreshIcon = document.getElementById('refresh-icon');
    const exportCsvBtn = document.getElementById('export-csv-btn');
    const themeToggleBtn = document.getElementById('theme-toggle-btn');
    const themeIcon = document.getElementById('theme-icon');
    const lastUpdatedText = document.getElementById('last-updated-text');
    const statusDot = document.querySelector('.status-dot');
    
    const searchInput = document.getElementById('search-input');
    const categoryFilters = document.getElementById('category-filters');
    
    const statTotal = document.getElementById('stat-total');
    const statFeatures = document.getElementById('stat-features');
    const statChanges = document.getElementById('stat-changes');
    const statDeprecations = document.getElementById('stat-deprecations');
    
    const feedContainer = document.getElementById('releases-feed');
    const loadingSkeleton = document.getElementById('loading-skeleton');
    const errorMessage = document.getElementById('error-message');
    const errorText = document.getElementById('error-text');
    const retryBtn = document.getElementById('retry-btn');
    const noResults = document.getElementById('no-results');
    
    // Modal Elements
    const tweetModal = document.getElementById('tweet-modal');
    const tweetTextarea = document.getElementById('tweet-textarea');
    const charCount = document.getElementById('char-count');
    const charWarning = document.getElementById('char-warning');
    const submitTweetBtn = document.getElementById('submit-tweet-btn');
    const cancelTweetBtn = document.getElementById('cancel-tweet-btn');
    const closeModalBtn = document.getElementById('close-modal-btn');
    
    // Toast Elements
    const toast = document.getElementById('toast');
    const toastMessage = document.getElementById('toast-message');

    // Fetch and render data
    async function loadReleases(forceRefresh = false) {
        setLoadingState(true);
        try {
            const url = `/api/releases${forceRefresh ? '?refresh=true' : ''}`;
            const response = await fetch(url);
            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }
            const data = await response.json();
            
            if (data.error) {
                throw new Error(data.error);
            }
            
            releaseNotes = data.releases || [];
            lastUpdatedText.textContent = `Sync: ${data.last_updated || 'Just now'}`;
            
            if (data.source === 'cache_error') {
                showToast(`Loaded cached notes. Refresh error: ${data.error}`, 'warning');
            }
            
            updateStats();
            renderFeed();
            setLoadingState(false);
        } catch (error) {
            console.error('Error fetching release notes:', error);
            errorText.textContent = error.message || 'Check your network connection and try again.';
            setLoadingState(false, true);
        }
    }

    function setLoadingState(isLoading, hasError = false) {
        if (isLoading) {
            refreshIcon.classList.add('spin');
            refreshBtn.disabled = true;
            statusDot.className = 'status-dot loading';
            loadingSkeleton.classList.remove('hidden');
            feedContainer.classList.add('hidden');
            errorMessage.classList.add('hidden');
            noResults.classList.add('hidden');
        } else {
            refreshIcon.classList.remove('spin');
            refreshBtn.disabled = false;
            statusDot.className = 'status-dot green';
            loadingSkeleton.classList.add('hidden');
            
            if (hasError) {
                errorMessage.classList.remove('hidden');
                feedContainer.classList.add('hidden');
            } else {
                errorMessage.classList.add('hidden');
                feedContainer.classList.remove('hidden');
            }
        }
    }

    // Process stats
    function updateStats() {
        let total = 0;
        let features = 0;
        let changes = 0;
        let deprecations = 0;

        releaseNotes.forEach(release => {
            release.items.forEach(item => {
                total++;
                const cat = item.category.toLowerCase();
                if (cat.includes('feature')) features++;
                else if (cat.includes('change')) changes++;
                else if (cat.includes('deprecat')) deprecations++;
            });
        });

        statTotal.textContent = total;
        statFeatures.textContent = features;
        statChanges.textContent = changes;
        statDeprecations.textContent = deprecations;
    }

    // Filter and Render Feed
    function renderFeed() {
        feedContainer.innerHTML = '';
        
        let visibleEntriesCount = 0;
        
        releaseNotes.forEach(release => {
            // Filter items in this release entry
            const filteredItems = release.items.filter(item => {
                const matchesCategory = currentCategoryFilter === 'all' || 
                    item.category.toLowerCase().includes(currentCategoryFilter);
                
                const matchesSearch = searchQuery === '' || 
                    item.text.toLowerCase().includes(searchQuery) ||
                    item.category.toLowerCase().includes(searchQuery) ||
                    release.date.toLowerCase().includes(searchQuery);
                    
                return matchesCategory && matchesSearch;
            });

            if (filteredItems.length > 0) {
                visibleEntriesCount += filteredItems.length;
                
                // Create Date Group Container
                const dateGroup = document.createElement('div');
                dateGroup.className = 'date-group';
                
                // Date Header
                const dateHeader = document.createElement('h2');
                dateHeader.className = 'date-header';
                dateHeader.textContent = release.date;
                dateGroup.appendChild(dateHeader);
                
                // Render each card inside this date group
                filteredItems.forEach(item => {
                    const card = document.createElement('div');
                    card.className = 'update-card';
                    
                    const header = document.createElement('div');
                    header.className = 'card-header';
                    
                    const catBadge = document.createElement('span');
                    const normalizedCat = item.category.toLowerCase();
                    let badgeClass = 'general';
                    
                    if (normalizedCat.includes('feature')) badgeClass = 'feature';
                    else if (normalizedCat.includes('change')) badgeClass = 'changed';
                    else if (normalizedCat.includes('deprecat')) badgeClass = 'deprecated';
                    else if (normalizedCat.includes('fix')) badgeClass = 'fixed';
                    
                    catBadge.className = `badge ${badgeClass}`;
                    catBadge.textContent = item.category;
                    
                    const actionsContainer = document.createElement('div');
                    actionsContainer.className = 'card-actions';
                    
                    const copyBtn = document.createElement('button');
                    copyBtn.className = 'card-action-btn copy-btn';
                    copyBtn.innerHTML = '<i class="fa-solid fa-copy"></i> Copy';
                    copyBtn.addEventListener('click', () => {
                        const copyText = `BigQuery Release Note (${release.date}) - [${item.category}]:\n${item.text}\n\nRead more: ${release.link}`;
                        navigator.clipboard.writeText(copyText).then(() => {
                            showToast('Copied to clipboard!', 'success');
                        }).catch(err => {
                            console.error('Failed to copy: ', err);
                            showToast('Failed to copy text', 'error');
                        });
                    });

                    const tweetBtn = document.createElement('button');
                    tweetBtn.className = 'card-action-btn tweet-btn';
                    tweetBtn.innerHTML = '<i class="fa-brands fa-x-twitter"></i> Tweet';
                    tweetBtn.addEventListener('click', () => {
                        openTweetComposer(release.date, item.category, item.text, release.link);
                    });
                    
                    actionsContainer.appendChild(copyBtn);
                    actionsContainer.appendChild(tweetBtn);
                    
                    header.appendChild(catBadge);
                    header.appendChild(actionsContainer);
                    card.appendChild(header);
                    
                    const body = document.createElement('div');
                    body.className = 'card-body';
                    body.innerHTML = item.html;
                    card.appendChild(body);
                    
                    dateGroup.appendChild(card);
                });
                
                feedContainer.appendChild(dateGroup);
            }
        });

        if (visibleEntriesCount === 0) {
            noResults.classList.remove('hidden');
        } else {
            noResults.classList.add('hidden');
        }
    }

    // Tweet Composer Modal Management
    function openTweetComposer(date, category, text, link) {
        // Construct high-quality, professional pre-filled tweet content within X bounds
        const prefix = `📢 BigQuery Update (${date}):\n\n`;
        const tags = `\n\n#GCP #BigQuery #GoogleCloud`;
        const linkStr = `\n\nRead more: ${link}`;
        
        // Compute available space for the core text details
        const reservedLen = prefix.length + tags.length + linkStr.length;
        const maxTextLen = 280 - reservedLen;
        
        let cleanedText = text.replace(/\s+/g, ' ').trim();
        if (cleanedText.length > maxTextLen) {
            cleanedText = cleanedText.slice(0, maxTextLen - 3) + '...';
        }
        
        const fullTweetText = `${prefix}[${category}] ${cleanedText}${linkStr}${tags}`;
        
        tweetTextarea.value = fullTweetText;
        updateCharCount();
        
        tweetModal.classList.remove('hidden');
        tweetTextarea.focus();
    }

    function closeTweetComposer() {
        tweetModal.classList.add('hidden');
    }

    function updateCharCount() {
        const len = tweetTextarea.value.length;
        charCount.textContent = len;
        
        if (len > 280) {
            charCount.classList.add('text-deprecated');
            charWarning.classList.remove('hidden');
            submitTweetBtn.disabled = true;
        } else {
            charCount.classList.remove('text-deprecated');
            charWarning.classList.add('hidden');
            submitTweetBtn.disabled = false;
        }
    }

    // Open X Sharing Intent
    function submitTweet() {
        const text = encodeURIComponent(tweetTextarea.value);
        const url = `https://x.com/intent/tweet?text=${text}`;
        window.open(url, '_blank', 'width=550,height=420');
        
        closeTweetComposer();
        showToast('Redirected to X / Twitter composer!', 'success');
    }

    // Toast notifications
    function showToast(message, type = 'success') {
        toastMessage.textContent = message;
        
        const icon = document.getElementById('toast-icon');
        if (type === 'success') {
            toast.style.borderColor = 'var(--color-feature)';
            icon.className = 'fa-solid fa-circle-check text-feature';
        } else {
            toast.style.borderColor = 'var(--color-deprecated)';
            icon.className = 'fa-solid fa-circle-exclamation text-deprecated';
        }
        
        toast.classList.remove('hidden');
        setTimeout(() => {
            toast.classList.add('hidden');
        }, 4000);
    }

    function exportToCSV() {
        if (!releaseNotes || releaseNotes.length === 0) {
            showToast('No data to export', 'error');
            return;
        }

        const rows = [
            ["Date", "Category", "Description", "Link"]
        ];

        let count = 0;
        releaseNotes.forEach(release => {
            release.items.forEach(item => {
                const matchesCategory = currentCategoryFilter === 'all' || 
                    item.category.toLowerCase().includes(currentCategoryFilter);
                
                const matchesSearch = searchQuery === '' || 
                    item.text.toLowerCase().includes(searchQuery) ||
                    item.category.toLowerCase().includes(searchQuery) ||
                    release.date.toLowerCase().includes(searchQuery);
                    
                if (matchesCategory && matchesSearch) {
                    rows.push([release.date, item.category, item.text, release.link]);
                    count++;
                }
            });
        });

        if (count === 0) {
            showToast('No matching records found to export', 'error');
            return;
        }

        const csvContent = rows.map(row => 
            row.map(value => `"${value.replace(/"/g, '""')}"`).join(",")
        ).join("\r\n");

        const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement("a");
        link.setAttribute("href", url);
        
        const timestamp = new Date().toISOString().slice(0, 10);
        link.setAttribute("download", `bigquery_release_notes_${timestamp}.csv`);
        document.body.appendChild(link);
        
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(url);
        
        showToast(`Successfully exported ${count} records to CSV!`, 'success');
    }

    // Theme Management
    const currentTheme = localStorage.getItem('theme');
    if (currentTheme === 'light') {
        document.body.classList.add('light-theme');
        themeIcon.className = 'fa-solid fa-moon';
    } else {
        themeIcon.className = 'fa-solid fa-sun';
    }

    function toggleTheme() {
        if (document.body.classList.contains('light-theme')) {
            document.body.classList.remove('light-theme');
            themeIcon.className = 'fa-solid fa-sun';
            localStorage.setItem('theme', 'dark');
            showToast('Swapped to dark theme!', 'success');
        } else {
            document.body.classList.add('light-theme');
            themeIcon.className = 'fa-solid fa-moon';
            localStorage.setItem('theme', 'light');
            showToast('Swapped to light theme!', 'success');
        }
    }

    // Event Listeners
    refreshBtn.addEventListener('click', () => loadReleases(true));
    retryBtn.addEventListener('click', () => loadReleases(true));
    exportCsvBtn.addEventListener('click', exportToCSV);
    themeToggleBtn.addEventListener('click', toggleTheme);
    
    searchInput.addEventListener('input', (e) => {
        searchQuery = e.target.value.toLowerCase().trim();
        renderFeed();
    });

    categoryFilters.addEventListener('click', (e) => {
        const target = e.target.closest('.filter-chip');
        if (!target) return;
        
        // Remove active class from other chips
        document.querySelectorAll('.filter-chip').forEach(chip => {
            chip.classList.remove('active');
        });
        
        target.classList.add('active');
        currentCategoryFilter = target.getAttribute('data-category');
        renderFeed();
    });

    // Modal Events
    closeModalBtn.addEventListener('click', closeTweetComposer);
    cancelTweetBtn.addEventListener('click', closeTweetComposer);
    submitTweetBtn.addEventListener('click', submitTweet);
    tweetTextarea.addEventListener('input', updateCharCount);

    // Close modal when clicking outside content
    window.addEventListener('click', (e) => {
        if (e.target === tweetModal) {
            closeTweetComposer();
        }
    });

    // Initial Load
    loadReleases();
});
