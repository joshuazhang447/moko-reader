// --- JS/UIController.js ---

(function() {
    document.addEventListener('DOMContentLoaded', () => {
        const body = document.body;
        const hoverZones = document.querySelectorAll('.hover-zone');
        const readerHeader = document.querySelector('.reader-header');
        const readerFooter = document.querySelector('.reader-footer');

        // Exit if the necessary elements aren't on the page
        if (hoverZones.length === 0 || !readerHeader || !readerFooter) {
            return;
        }
        
        // Define all elements that should keep the UI visible
        const safeElements = [...hoverZones, readerHeader, readerFooter];
        let hideTimeout;

        const showUI = () => {
            clearTimeout(hideTimeout); // Cancel any pending action to hide the UI
            body.classList.add('ui-visible');
        };

        const hideUI = () => {
            // Set a short timeout to hide the UI. This prevents it from disappearing
            // if the user's mouse briefly leaves and re-enters a safe zone.
            hideTimeout = setTimeout(() => {
                body.classList.remove('ui-visible');
            }, 100); 
        };

        // Attach the listeners to all safe elements
        safeElements.forEach(el => {
            el.addEventListener('mouseenter', showUI);
            el.addEventListener('mouseleave', hideUI);
        });
    });
})();