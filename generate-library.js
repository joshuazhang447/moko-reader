const fs = require('fs');
const path = require('path');
const JSZip = require('jszip');
const sharp = require('sharp');
const xml2js = require('xml2js');

// --- CONFIGURATION ---
const LIBRARY_DIR = path.join(__dirname, 'Library');
const PREVIEWS_DIR = path.join(__dirname, 'previews');
const OUTPUT_JS_PATH = path.join(__dirname, 'library-data.js');
const THUMBNAIL_WIDTH = 300;

if (!fs.existsSync(PREVIEWS_DIR)) {
    fs.mkdirSync(PREVIEWS_DIR);
}

// --- NEW HELPER FUNCTION TO CLEAN FILENAMES ---
/**
 * Creates a URL-safe and file-system-safe string from a book title.
 * @param {string} filename - The original filename or title.
 * @returns {string} - A sanitized string.
 */
function sanitizeFilename(filename) {
    // Replace spaces with hyphens
    // Remove characters that can cause issues in URLs or file systems
    return filename
        .replace(/\s+/g, '-') // Replace one or more spaces with a single hyphen
        .replace(/[\[\]\(\)'":,]/g, ''); // Remove brackets, parentheses, quotes, etc.
}


// The cover extraction functions are now correct and don't need changes.
async function getEpubCover(fileBuffer) {
    const zip = await JSZip.loadAsync(fileBuffer);
    const containerFile = zip.file("META-INF/container.xml");
    if (!containerFile) throw new Error('META-INF/container.xml not found');
    const containerContent = await containerFile.async('string');
    const containerJson = await xml2js.parseStringPromise(containerContent);
    const opfPath = containerJson.container.rootfiles[0].rootfile[0].$['full-path'];
    const opfFile = zip.file(opfPath);
    if (!opfFile) throw new Error(`package.opf not found at path: ${opfPath}`);
    const opfContent = await opfFile.async('string');
    const opfJson = await xml2js.parseStringPromise(opfContent);
    const manifest = opfJson.package.manifest[0].item;
    const metadata = opfJson.package.metadata[0];
    let coverId = metadata['meta']?.find(m => m.$.name === 'cover')?.$.content;
    let coverItem = manifest.find(item => item.$.id === coverId);
    if (!coverItem) {
        coverItem = manifest.find(item => item.$.properties?.includes('cover-image'));
    }
    if (!coverItem) return null;
    const coverHref = coverItem.$.href;
    const coverPath = path.join(path.dirname(opfPath), coverHref).replace(/\\/g, '/');
    const coverFile = zip.file(coverPath);
    return coverFile ? coverFile.async('uint8array') : null;
}

async function getCbzCover(fileBuffer) {
    const zip = await JSZip.loadAsync(fileBuffer);
    const imageExtensions = ['.jpg', '.jpeg', '.png', '.gif', '.webp'];
    const imageFiles = Object.values(zip.files)
        .filter(file => !file.dir && imageExtensions.some(ext => file.name.toLowerCase().endsWith(ext)))
        .sort((a, b) => a.name.localeCompare(b.name));
    return imageFiles.length > 0 ? imageFiles[0].async('uint8array') : null;
}

async function generatePreview(filePath) {
    const fileBuffer = fs.readFileSync(filePath);
    const extension = path.extname(filePath).toLowerCase();
    const fileName = path.parse(filePath).name;

    // *** THE FIX IS HERE: Sanitize the name before creating the preview file ***
    const sanitizedName = sanitizeFilename(fileName);
    const previewFileName = `${sanitizedName}.jpg`;

    const previewPath = path.join(PREVIEWS_DIR, previewFileName);
    const relativePreviewPath = `previews/${previewFileName}`;

    if (fs.existsSync(previewPath)) {
        return relativePreviewPath;
    }

    let imageBuffer;
    try {
        if (extension === '.epub') {
            imageBuffer = await getEpubCover(fileBuffer);
        } else if (extension === '.cbz' || extension === '.zip') {
            imageBuffer = await getCbzCover(fileBuffer);
        }

        if (imageBuffer) {
            await sharp(imageBuffer)
                .resize(THUMBNAIL_WIDTH)
                .jpeg({ quality: 80 })
                .toFile(previewPath);
            console.log(`--> Generated preview for: ${path.basename(filePath)}`);
            return relativePreviewPath;
        }
    } catch (err) {
        console.error(`Could not process cover for ${path.basename(filePath)}: ${err.message}`);
    }
    return null;
}

// scanDirectory and main functions remain the same.
async function scanDirectory(dirPath) {
    const node = { name: path.basename(dirPath), type: 'folder', items: [], previews: [] };
    const files = fs.readdirSync(dirPath);
    for (const file of files) {
        if (file.startsWith('.')) continue;
        const fullPath = path.join(dirPath, file);
        const stats = fs.statSync(fullPath);
        if (stats.isDirectory()) {
            node.items.push(await scanDirectory(fullPath));
        } else {
            const previewPath = await generatePreview(fullPath);
            const relativePath = path.relative(__dirname, fullPath).replace(/\\/g, '/');
            node.items.push({ name: path.parse(file).name, type: 'file', path: relativePath, preview_image: previewPath || '' });
        }
    }
    const childFilePreviews = node.items.map(item => item.type === 'file' ? item.preview_image : (item.previews ? item.previews[0] : null)).filter(p => p).slice(0, 4);
    node.previews = childFilePreviews;
    return node;
}

async function main() {
    console.log('Scanning library folder and generating previews...');
    try {
        if (!fs.existsSync(LIBRARY_DIR)) { throw new Error(`Library directory not found at ${LIBRARY_DIR}`); }
        const libraryStructure = await scanDirectory(LIBRARY_DIR);
        const jsonContent = JSON.stringify(libraryStructure, null, 2);
        const jsContent = `const libraryData = ${jsonContent};`;
        fs.writeFileSync(OUTPUT_JS_PATH, jsContent);
        console.log(`\n✅ Successfully generated library-data.js with ${fs.readdirSync(PREVIEWS_DIR).length} previews.`);
    } catch (error) {
        console.error('Error generating library file:', error);
    }
}
main();