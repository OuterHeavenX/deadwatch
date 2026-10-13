'use strict';

const path = require('node:path');
const { app, BrowserWindow, shell } = require('electron');

app.setName('Deadwatch');

const softwareRendering = process.argv.includes('--software-rendering');
if (process.platform === 'linux') {
  app.commandLine.appendSwitch('enable-features', 'UseOzonePlatform');
  app.commandLine.appendSwitch('ozone-platform', 'x11');
}
if (softwareRendering) app.commandLine.appendSwitch('use-gl', 'swiftshader');

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
    fullscreen: false,
    autoHideMenuBar: true,
    backgroundColor: '#071013',
    show: !smokeTest,
    webPreferences: {
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: false,
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

  mainWindow.webContents.once('did-finish-load', () => {
    if (smokeTest) return;
    if (!windowed) {
      if (process.platform === 'linux') mainWindow.maximize();
      else mainWindow.setFullScreen(true);
    }
    mainWindow.show();
    mainWindow.focus();
  });

  mainWindow.webContents.on('did-fail-load', (_event, code, description) => {
    const html = `<body style="margin:0;background:#071013;color:#f3ead0;font:20px system-ui;display:grid;place-items:center;height:100vh"><main style="max-width:700px;padding:40px"><h1>Deadwatch could not start</h1><p>Load error ${code}: ${description}</p><p>Try adding <code>--software-rendering</code> to the launch options.</p></main></body>`;
    mainWindow.loadURL(`data:text/html;charset=utf-8,${encodeURIComponent(html)}`);
    mainWindow.show();
  });

  mainWindow.webContents.on('render-process-gone', (_event, details) => {
    if (softwareRendering || details.reason === 'clean-exit') return;
    app.relaunch({ args: [...process.argv.slice(1), '--software-rendering'] });
    app.exit(0);
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

  mainWindow.loadFile(path.join(__dirname, 'index.html'), {
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
