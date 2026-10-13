'use strict';

const path = require('node:path');
const { app, BrowserWindow, shell } = require('electron');

app.setName('Deadwatch');

const gotLock = app.requestSingleInstanceLock();
if (!gotLock) app.quit();

let mainWindow;

function createWindow() {
  const windowed = process.argv.includes('--windowed');
  const smokeTest = process.argv.includes('--smoke-test');
  mainWindow = new BrowserWindow({
    width: 1280,
    height: 800,
    minWidth: 960,
    minHeight: 600,
    fullscreen: !windowed,
    autoHideMenuBar: true,
    backgroundColor: '#071013',
    show: false,
    webPreferences: {
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: true,
      spellcheck: false
    }
  });

  mainWindow.webContents.setWindowOpenHandler(({ url }) => {
    if (/^https?:/i.test(url)) shell.openExternal(url);
    return { action: 'deny' };
  });

  mainWindow.webContents.on('will-navigate', (event, url) => {
    if (url !== mainWindow.webContents.getURL()) event.preventDefault();
  });

  mainWindow.once('ready-to-show', () => {
    if (smokeTest) return;
    mainWindow.show();
    mainWindow.focus();
  });

  if (smokeTest) {
    mainWindow.webContents.once('did-finish-load', async () => {
      try {
        const result = await mainWindow.webContents.executeJavaScript(`({
          title: document.title,
          canvas: !!document.querySelector('#gameCanvas'),
          input: typeof DeadwatchInput === 'object',
          inputMode: document.body.dataset.inputMode,
          touchHidden: getComputedStyle(document.querySelector('#touch')).display === 'none',
          deckPrompts: !!document.querySelector('#deckControls')
        })`);
        console.log(JSON.stringify(result));
        app.exit(result.canvas && result.input && result.inputMode === 'gamepad' && result.touchHidden && result.deckPrompts ? 0 : 1);
      } catch (error) {
        console.error(error);
        app.exit(1);
      }
    });
  }

  mainWindow.loadFile(path.join(__dirname, 'deadwatch-index.html'), {
    query: { controls: 'gamepad' }
  });
}

app.on('second-instance', () => {
  if (!mainWindow) return;
  if (mainWindow.isMinimized()) mainWindow.restore();
  mainWindow.focus();
});

app.whenReady().then(createWindow);
app.on('window-all-closed', () => app.quit());
