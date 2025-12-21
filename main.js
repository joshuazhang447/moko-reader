// main.js

const { app, BrowserWindow, ipcMain } = require('electron');
const path = require('path');
const { exec } = require('child_process');

// --- NEW: A reusable function to run the library generation script ---
// This returns a Promise, which resolves on success and rejects on failure.
function runLibraryRefresh() {
  console.log('Executing generate-library.js script...');
  return new Promise((resolve, reject) => {
    // We execute the same command as before.
    exec('node generate-library.js', (error, stdout, stderr) => {
      if (error) {
        console.error(`Error during library generation: ${error.message}`);
        reject(error); // Reject the promise if the script fails
        return;
      }
      if (stderr) {
        // Stderr doesn't always mean a failure, but it's good to log.
        console.error(`Script stderr: ${stderr}`);
      }
      console.log(`Script stdout: ${stdout}`);
      resolve(); // Resolve the promise on success
    });
  });
}


function createWindow() {
  const mainWindow = new BrowserWindow({
    width: 1280,
    height: 800,
    icon: path.join(__dirname, 'Images/icon.png'),
    autoHideMenuBar: true,
    webPreferences: {
      preload: path.join(__dirname, 'preload.js')
    }
  });

  mainWindow.setMenu(null);

  mainWindow.loadFile('index.html');
}

// --- MODIFIED: The IPC handler now uses our reusable function ---
ipcMain.handle('refresh-library', async () => {
  console.log('Received manual refresh request from renderer...');
  try {
    await runLibraryRefresh();
    return { success: true, message: 'Library refreshed successfully.' };
  } catch (error) {
    return { success: false, message: 'Failed to generate library.', error: error.message };
  }
});


// --- MODIFIED: App Lifecycle with automatic startup refresh ---
// We've made the 'then' block async to use await.
app.whenReady().then(async () => {
  console.log('App is ready. Starting initial library refresh...');

  try {
    // Wait for the library refresh to complete before creating the window.
    await runLibraryRefresh();
    console.log("Initial library refresh complete.");
  } catch (error) {
    // If the initial refresh fails (e.g., a corrupt book), log the error
    // but continue to open the app. The user can try fixing it and refreshing manually.
    console.error("Initial library refresh failed. The app will open with existing data.", error.message);
  }

  // NOW that the refresh is done, create the window.
  createWindow();

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow();
    }
  });
});


app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});