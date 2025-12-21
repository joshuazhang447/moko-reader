// This self-executing function runs immediately, without waiting for DOMContentLoaded.
(function() {
    // --- THEME DATA ---
    const THEME_KEY = 'theme';
    const LIGHT_THEME_CLASS = 'light-theme';
    const DARK_THEME_CLASS = 'dark-theme';

    const sunIcon = `<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="5"></circle><line x1="12" y1="1" x2="12" y2="3"></line><line x1="12" y1="21" x2="12" y2="23"></line><line x1="4.22" y1="4.22" x2="5.64" y2="5.64"></line><line x1="18.36" y1="18.36" x2="19.78" y2="19.78"></line><line x1="1" y1="12" x2="3" y2="12"></line><line x1="21" y1="12" x2="23" y2="12"></line><line x1="4.22" y1="19.78" x2="5.64" y2="18.36"></line><line x1="18.36" y1="5.64" x2="19.78" y2="4.22"></line></svg>`;
    const moonIcon = `<svg xmlns="http://www.w3.org/2000/svg" width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"></path></svg>`;

    /**
     * Applies the theme to the body and updates the toggle button icon.
     * @param {string} theme - 'light' or 'dark'.
     */
    const applyTheme = (theme) => {
        const isDark = theme === 'dark';
        document.body.classList.toggle(DARK_THEME_CLASS, isDark);
        document.body.classList.toggle(LIGHT_THEME_CLASS, !isDark);
        
        // The theme toggle button might not exist on every page, so check first.
        const themeToggleBtn = document.getElementById('theme-toggle');
        if (themeToggleBtn) {
            themeToggleBtn.innerHTML = isDark ? moonIcon : sunIcon;
            themeToggleBtn.title = `Switch to ${isDark ? 'Light' : 'Dark'} Mode`;
        }
    };

    // --- INITIAL THEME LOAD ---
    // Apply the saved theme immediately to prevent a "flash" of the wrong theme.
    const savedTheme = localStorage.getItem(THEME_KEY) || 'dark'; // Default to dark
    applyTheme(savedTheme);

    // --- WAIT FOR DOM TO BE READY FOR EVENT LISTENERS ---
    document.addEventListener('DOMContentLoaded', () => {
        const themeToggleBtn = document.getElementById('theme-toggle');
        if (themeToggleBtn) {
            themeToggleBtn.addEventListener('click', () => {
                const currentIsDark = document.body.classList.contains(DARK_THEME_CLASS);
                const newTheme = currentIsDark ? 'light' : 'dark';
                
                applyTheme(newTheme);
                localStorage.setItem(THEME_KEY, newTheme);
            });
        }
    });

})();