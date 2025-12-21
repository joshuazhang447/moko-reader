// --- JS/DragToScroll.js ---

document.addEventListener('DOMContentLoaded', () => {
    const readerContainer = document.querySelector('.reader-container');
    if (!readerContainer) return;

    let isSpaceDown = false;
    let isPanning = false;
    let startX, startY, scrollLeft, scrollTop;

    const onKeyDown = (e) => {
        // Activate pan mode ONLY if the spacebar is pressed and we aren't already in pan mode.
        if (e.key === ' ' && !isSpaceDown) {
            // Prevent the default browser action for the spacebar (scrolling down).
            e.preventDefault();
            isSpaceDown = true;
            readerContainer.classList.add('panning-active');
        }
    };

    const onKeyUp = (e) => {
        if (e.key === ' ') {
            isSpaceDown = false;
            // If the user was in the middle of a drag, ensure it stops.
            if (isPanning) {
                isPanning = false;
                readerContainer.classList.remove('is-panning');
            }
            readerContainer.classList.remove('panning-active');
        }
    };

    const onMouseDown = (e) => {
        // A pan can only begin if the spacebar is currently held down.
        if (isSpaceDown) {
            // This is crucial to stop the browser from trying to select text.
            e.preventDefault(); 
            isPanning = true;
            
            // Record the starting mouse position and scroll offset.
            startX = e.pageX - readerContainer.offsetLeft;
            startY = e.pageY - readerContainer.offsetTop;
            scrollLeft = readerContainer.scrollLeft;
            scrollTop = readerContainer.scrollTop;
            
            readerContainer.classList.add('is-panning');
        }
    };

    const onMouseMove = (e) => {
        // Only pan if a drag has been initiated.
        if (!isPanning) return;
        
        const x = e.pageX - readerContainer.offsetLeft;
        const y = e.pageY - readerContainer.offsetTop;
        
        // Calculate the distance the mouse has moved from the drag's start point.
        const walkX = x - startX;
        const walkY = y - startY;
        
        // Move the scroll position based on the initial scroll offset and the walk distance.
        readerContainer.scrollLeft = scrollLeft - walkX;
        readerContainer.scrollTop = scrollTop - walkY;
    };

    const stopPanning = () => {
        if (isPanning) {
            isPanning = false;
            readerContainer.classList.remove('is-panning');
        }
    };
    
    // Listen for key events globally to catch them anywhere on the page.
    window.addEventListener('keydown', onKeyDown);
    window.addEventListener('keyup', onKeyUp);
    
    // Listen for mouse events only on the designated container.
    readerContainer.addEventListener('mousedown', onMouseDown);
    readerContainer.addEventListener('mousemove', onMouseMove);
    readerContainer.addEventListener('mouseup', stopPanning);
    readerContainer.addEventListener('mouseleave', stopPanning);
});