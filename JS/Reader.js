// --- JS/Reader.js ---

document.addEventListener('DOMContentLoaded', () => {

    // --- ELEMENTS & GLOBAL STATE ---
    const viewerMain = document.getElementById('viewer-main');
    const zoomToggle = document.getElementById('zoom-toggle');
    const bookTitle = document.getElementById('reader-book-title');
    const prevBtn = document.getElementById('prev');
    const nextBtn = document.getElementById('next');
    const chapterInfo = document.getElementById('footer-chapter-info');
    const pageInfo = document.getElementById('footer-page-info');
    const percentageInfo = document.getElementById('footer-percentage-info');
    const progressBarFill = document.getElementById('progress-bar-fill');

    const params = new URLSearchParams(window.location.search);
    const bookPath = params.get('book');
    const fileExtension = bookPath ? bookPath.split('.').pop().toLowerCase() : null;

    let currentPageMode;

    // --- EPUB Specific State ---
    let book, rendition, currentLocation, isBookReady = false;

    // --- CBZ Specific State ---
    let imageUrls = [], cbzPageIndex = 0;

    if (!bookPath) {
        viewerMain.innerHTML = `<p>Error: Book path not provided.</p>`;
        return;
    }

    // --- INITIALIZATION & EVENT LISTENERS ---
    bookTitle.textContent = bookPath.split('/').pop().replace(/\.[^/.]+$/, "");
    prevBtn.style.visibility = 'hidden';

    document.addEventListener('pagemodechange', (e) => {
        currentPageMode = e.detail.mode;
        if (fileExtension === 'epub' && rendition) {
            handleEpubModeChange();
        } else if (fileExtension.match(/cbz|zip/)) {
            handleCbzModeChange();
        }
    });

    document.addEventListener('keydown', (e) => {
        if (e.key !== 'ArrowLeft' && e.key !== 'ArrowRight') return;

        if (isPanning || zoomLevel > 1) {
            const isCbz = fileExtension.match(/cbz|zip/);
            if (isCbz) return;
        }

        const action = e.key === 'ArrowLeft' ? 'prev' : 'next';

        if (fileExtension === 'epub' && rendition) {
            rendition[action]();
        } else if (fileExtension.match(/cbz|zip/) && imageUrls.length > 0) {
            action === 'prev' ? goPrevCbz() : goNextCbz();
        }
    });

    // --- NEW: Central event listener for zoom ---
    document.addEventListener('zoomchange', (e) => {
        const level = e.detail.level;

        if (fileExtension === 'epub' && rendition) {
            // For EPUBs, change the font size
            const size = `${level * 100}%`;
            rendition.themes.fontSize(size);
        } else if (fileExtension.match(/cbz|zip/)) {
            // For CBZ, scale the container
            if (level > 1) {
                viewerMain.style.transform = `scale(${level})`;
                viewerMain.style.transformOrigin = 'center top';
            } else {
                viewerMain.style.transform = '';
                viewerMain.style.transformOrigin = '';
            }
        }
    });

    // --- READER ROUTER & INITIAL PAGE MODE SETUP ---
    const applyInitialMode = (mode) => {
        currentPageMode = mode;
        if (window.MokoReader && window.MokoReader.applyPageMode) {
            window.MokoReader.applyPageMode(mode);
        } else {
            console.error("PageMode.js did not load correctly.");
        }
    };

    // Zoom UI is now always visible by default
    zoomToggle.style.display = 'flex';

    if (fileExtension === 'epub') {
        applyInitialMode('two-page');
        loadEpub(bookPath);
    } else if (fileExtension === 'cbz' || fileExtension === 'zip') {
        applyInitialMode('one-page');
        loadCbz(bookPath);
    } else {
        viewerMain.innerHTML = `<p>Error: Unsupported file type.</p>`;
    }

    async function loadEpub(path, initialCfi) {
        isBookReady = false;
        viewerMain.innerHTML = '';

        try {
            book = ePub(path);
            await book.ready;
            // START LOADING LOCATIONS IN BACKGROUND (Non-blocking)
            // We do NOT await this. The book will open immediately.
            book.ready.then(() => {
                // Determine a reasonable split size. 1650 chars is a standard rough estimate for a "page".
                return book.locations.generate(1650);
            }).then(() => {
                console.log("Locations generated in background.");
                updateEpubUI(currentLocation); // Refresh UI now that we have page counts
            }).catch(err => console.error("Error generating locations:", err));

            isBookReady = true;
            bookTitle.textContent = book.packaging.metadata.title || 'Unknown Title';

            rendition = book.renderTo("viewer-main", {
                manager: "default",
                flow: "paginated",
                width: "100%",
                height: "100%",
                spread: currentPageMode === 'one-page' ? "none" : "always"
            });
            window.epubRendition = rendition;

            const applyRenditionTheme = () => {
                if (!rendition) return;
                const isDark = document.body.classList.contains('dark-theme');
                const theme = isDark ? "dark" : "light";

                // We need to re-register or select themes to ensure they apply correctly
                rendition.themes.register("dark", { "body": { "background": "#1e1e1e !important", "color": "#e0e0e0 !important" }, "a": { "color": "#e0e0e0 !important" } });
                rendition.themes.register("light", { "body": { "background": "#ffffff !important", "color": "#212121 !important" }, "a": { "color": "#212121 !important" } });

                rendition.themes.select(theme);
            };

            rendition.on('displayed', () => {
                applyRenditionTheme();
                const initialZoom = parseFloat(document.getElementById('zoom-slider').value);
                rendition.themes.fontSize(`${initialZoom * 100}%`);
            });

            document.getElementById('theme-toggle').addEventListener('click', () => {
                setTimeout(applyRenditionTheme, 10);
            });

            rendition.on('relocated', (location) => {
                currentLocation = location;
                updateEpubUI(location);
            });

            prevBtn.onclick = () => rendition.prev();
            nextBtn.onclick = () => rendition.next();

            rendition.display(initialCfi);

        } catch (error) {
            console.error("Error loading EPUB:", error);
            viewerMain.innerHTML = `<p>Failed to load book: ${error.message}</p>`;
        }
    }

    function handleEpubModeChange() {
        if (!book) return;
        const cfiToRestore = currentLocation ? currentLocation.start.cfi : undefined;
        if (rendition) {
            rendition.destroy();
        }
        loadEpub(bookPath, cfiToRestore);
    }

    function updateEpubUI(location) {
        if (!isBookReady || !location || !location.start) {
            pageInfo.textContent = '...'; percentageInfo.textContent = ''; progressBarFill.style.width = '0%';
            return;
        }
        const { start, atStart, atEnd } = location;
        const pageNum = book.locations.locationFromCfi(start.cfi);
        const totalPages = book.locations.length();
        const percentage = book.locations.percentageFromCfi(start.cfi);
        const chapter = book.navigation.get(start.href);
        chapterInfo.textContent = chapter ? chapter.label.trim() : '';
        pageInfo.textContent = (pageNum !== -1 && totalPages > 0) ? `Location ${pageNum} of ${totalPages}` : '';
        if (percentage !== null) {
            const percentString = `${Math.round(percentage * 100)}%`;
            percentageInfo.textContent = percentString;
            progressBarFill.style.width = percentString;
        } else {
            percentageInfo.textContent = ''; progressBarFill.style.width = '0%';
        }
        prevBtn.style.visibility = atStart ? 'hidden' : 'visible';
        nextBtn.style.visibility = atEnd ? 'hidden' : 'visible';
    }

    // --- CBZ LOGIC ---
    let zoomLevel = 1; let minZoom = 1; let maxZoom = 10;
    let pan = { x: 0, y: 0 }; let isPanning = false; let panStart = { x: 0, y: 0 };

    function setupInteractivePage(pageElement, imageContainer) {
        const applyTransform = () => { imageContainer.style.transform = `translate(${pan.x}px, ${pan.y}px) scale(${zoomLevel})`; };
        const handleWheel = (e) => {
            if (currentPageMode === 'two-page') return;
            e.preventDefault(); const zoomSpeed = 0.1; const delta = e.deltaY > 0 ? -1 : 1; const oldZoom = zoomLevel;
            zoomLevel += delta * zoomSpeed * zoomLevel; zoomLevel = Math.max(minZoom, Math.min(maxZoom, zoomLevel));
            const rect = pageElement.getBoundingClientRect(); const mouseX = e.clientX - rect.left; const mouseY = e.clientY - rect.top;
            pan.x = mouseX - (mouseX - pan.x) * (zoomLevel / oldZoom); pan.y = mouseY - (mouseY - pan.y) * (zoomLevel / oldZoom);
            applyTransform();
        };
        const handleMouseDown = (e) => {
            if (currentPageMode === 'two-page') return;
            e.preventDefault(); isPanning = true; panStart.x = e.clientX - pan.x; panStart.y = e.clientY - pan.y; pageElement.classList.add('grabbing');
        };
        const handleMouseMove = (e) => { if (!isPanning) return; e.preventDefault(); pan.x = e.clientX - panStart.x; pan.y = e.clientY - panStart.y; applyTransform(); };
        const handleMouseUpOrLeave = () => { isPanning = false; pageElement.classList.remove('grabbing'); };
        pageElement.addEventListener('wheel', handleWheel, { passive: false });
        pageElement.addEventListener('mousedown', handleMouseDown);
        window.addEventListener('mousemove', handleMouseMove);
        window.addEventListener('mouseup', handleMouseUpOrLeave);
    }

    function resetPanAndZoom() {
        zoomLevel = 1; pan.x = 0; pan.y = 0;
        document.querySelectorAll('.cbz-image-container').forEach(el => { el.style.transform = 'translate(0px, 0px) scale(1)'; });
    }

    async function loadCbz(path) {
        viewerMain.innerHTML = `<div id="cbz-viewer"><div class="cbz-page left" id="cbz-page-left"><div class="cbz-image-container"><img id="cbz-img-left" src=""></div></div><div class="cbz-page right" id="cbz-page-right"><div class="cbz-image-container"><img id="cbz-img-right" src=""></div></div></div>`;
        try {
            const response = await fetch(path); if (!response.ok) throw new Error(`File not found`);
            const cbzBlob = await response.blob(); const zip = await new JSZip().loadAsync(cbzBlob); const imageFiles = [];
            zip.forEach((_, file) => {
                const ext = file.name.split('.').pop().toLowerCase();
                if (!file.dir && ['jpg', 'jpeg', 'png', 'gif', 'webp'].includes(ext)) imageFiles.push(file);
            });
            imageFiles.sort((a, b) => a.name.localeCompare(b.name, undefined, { numeric: true, sensitivity: 'base' }));
            const urlPromises = imageFiles.map(file => file.async('blob').then(URL.createObjectURL));
            imageUrls = await Promise.all(urlPromises);
            window.addEventListener('beforeunload', () => imageUrls.forEach(url => URL.revokeObjectURL(url)));
            setupInteractivePage(document.getElementById('cbz-page-left'), document.querySelector('#cbz-page-left .cbz-image-container'));
            setupInteractivePage(document.getElementById('cbz-page-right'), document.querySelector('#cbz-page-right .cbz-image-container'));
            updateCbzView();
        } catch (error) { viewerMain.innerHTML = `<p>Failed to load comic: ${error.message}</p>`; }
        prevBtn.onclick = goPrevCbz; nextBtn.onclick = goNextCbz;
    }

    function updateCbzView() {
        resetPanAndZoom();
        const leftPage = document.getElementById('cbz-page-left'); const rightPage = document.getElementById('cbz-page-right');
        const leftImg = document.getElementById('cbz-img-left'); const rightImg = document.getElementById('cbz-img-right');
        if (!leftImg || !rightImg || imageUrls.length === 0) return;
        const totalPages = imageUrls.length;
        if (currentPageMode === 'one-page') {
            leftPage.style.display = 'none'; rightPage.style.display = 'flex';
            rightImg.src = imageUrls[cbzPageIndex] || '';
        } else {
            leftPage.style.display = 'flex'; rightPage.style.display = 'flex';
            if (cbzPageIndex === 0) {
                leftPage.style.visibility = 'hidden'; leftImg.src = '';
                rightPage.style.visibility = 'visible'; rightImg.src = imageUrls[0] || '';
            } else {
                leftPage.style.visibility = 'visible'; leftImg.src = imageUrls[cbzPageIndex] || '';
                if (cbzPageIndex + 1 < totalPages) {
                    rightPage.style.visibility = 'visible'; rightImg.src = imageUrls[cbzPageIndex + 1] || '';
                } else {
                    rightPage.style.visibility = 'hidden'; rightImg.src = '';
                }
            }
        }
        updateCbzUI();
    }

    function goNextCbz() {
        const totalPages = imageUrls.length;
        if (currentPageMode === 'one-page') {
            if (cbzPageIndex + 1 < totalPages) cbzPageIndex++;
        } else {
            if (cbzPageIndex === 0 && totalPages > 1) cbzPageIndex = 1;
            else if (cbzPageIndex + 2 < totalPages) cbzPageIndex += 2;
        }
        updateCbzView();
    }

    function goPrevCbz() {
        if (currentPageMode === 'one-page') {
            if (cbzPageIndex > 0) cbzPageIndex--;
        } else {
            if (cbzPageIndex === 1) cbzPageIndex = 0;
            else if (cbzPageIndex > 1) cbzPageIndex -= 2;
        }
        updateCbzView();
    }

    function handleCbzModeChange() {
        if (currentPageMode === 'two-page' && cbzPageIndex > 0 && cbzPageIndex % 2 === 0) cbzPageIndex--;
        updateCbzView();
    }

    function updateCbzUI() {
        const totalPages = imageUrls.length; if (totalPages === 0) return;
        let displayedPages = `${cbzPageIndex + 1}`; let isLastPage = false;
        if (currentPageMode === 'two-page') {
            if (cbzPageIndex > 0 && cbzPageIndex + 1 < totalPages) {
                displayedPages += ` - ${cbzPageIndex + 2}`;
                isLastPage = cbzPageIndex + 2 >= totalPages;
            } else if (cbzPageIndex > 0) {
                isLastPage = cbzPageIndex + 1 >= totalPages;
            } else { isLastPage = totalPages <= 1; }
        } else { isLastPage = cbzPageIndex + 1 >= totalPages; }
        pageInfo.textContent = `Page ${displayedPages} of ${totalPages}`;
        const percentage = (cbzPageIndex + 1) / totalPages;
        percentageInfo.textContent = `${Math.round(percentage * 100)}%`;
        progressBarFill.style.width = `${percentage * 100}%`;
        prevBtn.style.visibility = (cbzPageIndex <= 0) ? 'hidden' : 'visible';
        nextBtn.style.visibility = isLastPage ? 'hidden' : 'visible';
    }
});