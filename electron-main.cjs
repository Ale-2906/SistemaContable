const { app, BrowserWindow, dialog } = require('electron');
const { spawn } = require('child_process');
const path = require('path');

const PORT = 5000;
let serverProcess;
let mainWindow;

function startServer() {
  const resourcesPath = process.resourcesPath;
  const nodeExecutable = app.isPackaged
    ? path.join(resourcesPath, 'node.exe')
    : process.env.MYSUBS_NODE_PATH;
  const serverEntry = app.isPackaged
    ? path.join(resourcesPath, 'server', 'index.js')
    : path.resolve(__dirname, 'server', 'index.js');

  if (!nodeExecutable) {
    throw new Error('No se encontró node.exe para iniciar el servidor local.');
  }

  serverProcess = spawn(nodeExecutable, [serverEntry], {
    cwd: app.isPackaged ? resourcesPath : path.resolve(__dirname),
    env: {
      ...process.env,
      NODE_ENV: 'production',
      PORT: String(PORT),
      DATABASE_PATH: path.join(app.getPath('userData'), 'mysubs_nomina.sqlite')
    },
    windowsHide: true,
    stdio: 'ignore'
  });

  serverProcess.once('error', (error) => {
    dialog.showErrorBox('MYSUBS no pudo iniciar', error.message);
  });
}

async function waitForServer() {
  const healthUrl = `http://localhost:${PORT}/api/health`;

  for (let attempt = 0; attempt < 50; attempt += 1) {
    try {
      const response = await fetch(healthUrl);
      if (response.ok) return;
    } catch {
      // The backend may need a moment to finish starting.
    }
    await new Promise(resolve => setTimeout(resolve, 100));
  }

  throw new Error('El servidor local no respondió a tiempo.');
}

async function createWindow() {
  startServer();

  mainWindow = new BrowserWindow({
    width: 1440,
    height: 900,
    minWidth: 1024,
    minHeight: 700,
    backgroundColor: '#0b0d14',
    webPreferences: {
      contextIsolation: true,
      nodeIntegration: false
    }
  });

  try {
    await waitForServer();
    await mainWindow.loadURL(`http://localhost:${PORT}`);
  } catch (error) {
    dialog.showErrorBox('MYSUBS no pudo iniciar', error.message);
    app.quit();
  }
}

app.whenReady().then(createWindow);

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit();
});

app.on('before-quit', () => {
  if (serverProcess && !serverProcess.killed) {
    serverProcess.kill();
  }
});
