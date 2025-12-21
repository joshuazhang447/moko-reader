// JS/LibraryLoader.js

document.addEventListener('DOMContentLoaded', () => {

    // --- ELEMENTS ---
    const gridContainer = document.querySelector('.grid-container');
    const breadcrumbNav = document.getElementById('breadcrumb');
    const backBtn = document.getElementById('back-btn');
    const homeBtn = document.getElementById('home-btn');
    const refreshBtn = document.getElementById('refresh-btn');
    const searchInput = document.querySelector('.search-bar');

    // --- STATE ---
    let currentPath = [];
    let isNavigating = false;

    // --- UTILITY: Debounce Function ---
    function debounce(func, delay = 300) {
        let timeoutId;
        return (...args) => {
            clearTimeout(timeoutId);
            timeoutId = setTimeout(() => {
                func.apply(this, args);
            }, delay);
        };
    }

    const getCurrentNode = () => {
        let node = libraryData;
        for (const folderName of currentPath) {
            if (!node || !node.items) return null;
            node = node.items.find(item => item.name === folderName && item.type === 'folder');
        }
        return node;
    };
    
    const updateBreadcrumbs = () => {
        breadcrumbNav.innerHTML = '';
        const rootLink = document.createElement('a');
        rootLink.textContent = libraryData.name || 'Library';
        rootLink.href = '#';
        rootLink.addEventListener('click', (e) => { e.preventDefault(); if (currentPath.length > 0) navigateBack(currentPath.length); });
        breadcrumbNav.appendChild(rootLink);
        currentPath.forEach((folderName, index) => {
            const separator = document.createElement('span');
            separator.className = 'separator';
            separator.textContent = '›';
            breadcrumbNav.appendChild(separator);
            if (index === currentPath.length - 1) {
                const currentSpan = document.createElement('span');
                currentSpan.className = 'current-folder';
                currentSpan.textContent = folderName;
                breadcrumbNav.appendChild(currentSpan);
            } else {
                const pathLink = document.createElement('a');
                pathLink.textContent = folderName;
                pathLink.href = '#';
                const levelsBack = currentPath.length - 1 - index;
                pathLink.addEventListener('click', (e) => { e.preventDefault(); navigateBack(levelsBack); });
                breadcrumbNav.appendChild(pathLink);
            }
        });
    };

    const createAndPopulateGrid = (items) => {
        const newGrid = document.createElement('section');
        newGrid.className = 'content-grid';
    
        if (!items || items.length === 0) {
            const messageKey = searchInput.value ? 'No results found.' : 'This folder is empty.';
            newGrid.innerHTML = `<p class="no-results-message">${messageKey}</p>`;
            return newGrid;
        }
    
        items.forEach(item => {
            const itemElement = document.createElement('div');
            itemElement.className = 'grid-item';
            
            const previewElement = document.createElement('div');
            previewElement.className = 'item-preview';
    
            const titleElement = document.createElement('div');
            titleElement.className = 'item-title';
            titleElement.textContent = item.name;
    
            if (item.type === 'folder') {
                itemElement.classList.add('folder-item');
                previewElement.classList.add('folder-preview-grid');
                for (let i = 0; i < 4; i++) {
                    const quadrant = document.createElement('div');
                    quadrant.className = 'quadrant';
                    if (item.previews && item.previews[i]) {
                        quadrant.style.backgroundImage = `url('${item.previews[i]}')`;
                    }
                    previewElement.appendChild(quadrant);
                }
                const countSpan = document.createElement('span');
                countSpan.className = 'item-count';
                countSpan.textContent = `(${item.items?.length || 0})`;
                titleElement.appendChild(countSpan);
                itemElement.addEventListener('click', () => navigateTo(item.name));
            } else { // It's a file
                itemElement.classList.add('file-item');
                if (item.preview_image) {
                    previewElement.style.backgroundImage = `url('${item.preview_image}')`;
                }
    
                itemElement.addEventListener('click', () => {
                    const bookUrlParam = encodeURIComponent(item.path);
                    window.location.href = `Reading.html?book=${bookUrlParam}`;
                });
            }
    
            itemElement.appendChild(previewElement);
            itemElement.appendChild(titleElement);
            newGrid.appendChild(itemElement);
        });
        return newGrid;
    };

    const renderAnimatedGrid = (nodeToShow, direction) => {
        if (isNavigating) return;
        isNavigating = true;

        const oldGrid = gridContainer.querySelector('.content-grid');
        const newGrid = createAndPopulateGrid(nodeToShow ? nodeToShow.items : []);
        
        const slideOutClass = direction === 'forward' ? 'grid-slide-out' : 'grid-slide-out-reverse';
        const slideInClass = direction === 'forward' ? 'grid-slide-in' : 'grid-slide-in-reverse';

        if (oldGrid) {
            oldGrid.classList.add('animating-out');
            oldGrid.classList.add(slideOutClass);
        }

        newGrid.classList.add(slideInClass);
        gridContainer.appendChild(newGrid);
        
        setTimeout(() => {
            if (oldGrid) oldGrid.remove();
            newGrid.classList.remove(slideInClass);
            isNavigating = false;
        }, 300);
    };
    
    const handleSearch = () => {
        const query = searchInput.value.toLowerCase().trim();
        const currentNode = getCurrentNode();
        if (!currentNode) return;

        const itemsToDisplay = query
            ? currentNode.items.filter(item => item.name.toLowerCase().includes(query))
            : currentNode.items;
        
        const oldGrid = gridContainer.querySelector('.content-grid');
        const newGrid = createAndPopulateGrid(itemsToDisplay);

        if (oldGrid) {
            gridContainer.replaceChild(newGrid, oldGrid);
        } else {
            gridContainer.appendChild(newGrid);
        }
    };


    const navigateTo = (folderName) => {
        searchInput.value = '';
        currentPath.push(folderName);
        const newNode = getCurrentNode();
        renderAnimatedGrid(newNode, 'forward');
        updateBreadcrumbs();
        backBtn.style.display = 'inline-flex';
    };

    const navigateBack = (levels = 1) => {
        searchInput.value = '';
        currentPath.splice(-levels, levels);
        const newNode = getCurrentNode();
        renderAnimatedGrid(newNode, 'backward');
        updateBreadcrumbs();
        if (currentPath.length === 0) {
            backBtn.style.display = 'none';
        }
    };
    
    const initializeLibrary = () => {
        if (typeof libraryData !== 'undefined' && libraryData.items) {
            const initialGrid = createAndPopulateGrid(libraryData.items);
            gridContainer.innerHTML = ''; // Clear any placeholders
            gridContainer.appendChild(initialGrid);
            updateBreadcrumbs();
        } else {
            console.error("Error: 'libraryData' is not defined or is empty. Please run the refresh command.");
            gridContainer.innerHTML = `<p class="error-message">Could not load library. Please add books to the 'Library' folder and click the refresh button.</p>`;
        }
    };
    
    // --- EVENT LISTENERS ---
    backBtn.addEventListener('click', () => navigateBack());
    homeBtn.addEventListener('click', () => { if (currentPath.length > 0) navigateBack(currentPath.length); });

    // --- THIS IS THE UPDATED REFRESH LISTENER ---
    refreshBtn.addEventListener('click', async () => {
        // Check if the Electron API is available
        if (window.electronAPI) {
            console.log("Requesting library refresh via Electron IPC...");
            refreshBtn.classList.add('spinning');

            try {
                // Call the function exposed in preload.js and wait for the result
                const result = await window.electronAPI.refreshLibrary();
                
                if (result.success) {
                    console.log("Main process confirmed refresh. Reloading page...");
                    // A short delay helps ensure the filesystem has written the new library-data.js
                    setTimeout(() => window.location.reload(), 300);
                } else {
                    // If the main process reported an error, show it.
                    console.error("Main process reported an error:", result.message);
                    alert(`Failed to refresh library: ${result.message}`);
                    refreshBtn.classList.remove('spinning');
                }
            } catch (error) {
                // This catches errors in the communication itself.
                console.error("Error invoking IPC for refresh:", error);
                alert(`An error occurred while refreshing: ${error.message}`);
                refreshBtn.classList.remove('spinning');
            }
        } else {
            // This fallback is useful if you ever want to run the app in a regular browser again.
            console.warn("Electron API not found. This button only works in the desktop app.");
            alert("This feature is only available in the installed desktop application.");
        }
    });

    searchInput.addEventListener('input', debounce(handleSearch));

    // --- INITIALIZE ---
    initializeLibrary();
});