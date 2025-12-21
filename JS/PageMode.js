// --- JS/PageMode.js ---

// Create a global object for our app if it doesn't exist
window.MokoReader = window.MokoReader || {};

(function() {
    const ONE_PAGE_CLASS = 'one-page-view';

    const twoPageIcon = `<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="3" width="7" height="18"></rect><rect x="14" y="3" width="7" height="18"></rect></svg>`;
    const onePageIcon = `<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path><polyline points="14 2 14 8 20 8"></polyline></svg>`;

    /**
     * Applies the selected mode to the UI and fires an event.
     * @param {string} mode - The mode to apply ('one-page' or 'two-page').
     */
    const applyMode = (mode) => {
        document.body.classList.toggle(ONE_PAGE_CLASS, mode === 'one-page');
        
        const btn = document.getElementById('page-mode-toggle');
        if (btn) {
            btn.innerHTML = mode === 'one-page' ? onePageIcon : twoPageIcon;
            btn.title = `Switch to ${mode === 'one-page' ? 'Two Page' : 'One Page'} View`;
        }
        
        const event = new CustomEvent('pagemodechange', { 
            detail: { mode: mode } 
        });
        document.dispatchEvent(event);
    };

    // Expose the applyMode function to be callable from other scripts
    window.MokoReader.applyPageMode = applyMode;

    document.addEventListener('DOMContentLoaded', () => {
        const toggleBtn = document.getElementById('page-mode-toggle');
        if (toggleBtn) {
            toggleBtn.addEventListener('click', () => {
                const newMode = document.body.classList.contains(ONE_PAGE_CLASS) ? 'two-page' : 'one-page';
                applyMode(newMode); 
            });
        }
    });

})();