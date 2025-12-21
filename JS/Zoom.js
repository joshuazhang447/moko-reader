// --- JS/Zoom.js ---

(function() {
    // This script now only manages the UI and emits an event.
    // Reader.js will listen for this event and decide how to apply the zoom.
    
    document.addEventListener('DOMContentLoaded', () => {
        const zoomToggleBtn = document.getElementById('zoom-toggle');
        const zoomControls = document.getElementById('zoom-controls');
        const zoomSlider = document.getElementById('zoom-slider');
        const zoomValueDisplay = document.getElementById('zoom-value');

        if (!zoomToggleBtn || !zoomControls || !zoomSlider || !zoomValueDisplay) {
            return; 
        }

        // --- Event Listeners ---
        zoomToggleBtn.addEventListener('click', (e) => {
            e.stopPropagation(); 
            const isHidden = zoomControls.style.display === 'none';
            zoomControls.style.display = isHidden ? 'flex' : 'none';
        });

        zoomSlider.addEventListener('input', () => {
            const newLevel = parseFloat(zoomSlider.value);
            
            // Update the display value
            zoomValueDisplay.textContent = `${newLevel.toFixed(1)}x`;

            // Dispatch a custom event with the new zoom level.
            // Reader.js will listen for this and apply the change.
            const event = new CustomEvent('zoomchange', { 
                detail: { level: newLevel } 
            });
            document.dispatchEvent(event);
        });

        // --- Initial Load ---
        // Always reset the slider to 1.0x on page load.
        const initialZoom = 1.0;
        zoomSlider.value = initialZoom;
        zoomValueDisplay.textContent = `${initialZoom.toFixed(1)}x`;
    });
})()