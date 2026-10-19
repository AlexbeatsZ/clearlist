import { app, BrowserWindow, dialog, ipcMain, Menu, Notification } from 'electron';
import { readFile, writeFile, stat } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { stateSchema } from '../src/model.js';
import { FileStore } from './storage.js';

app.setName('Clearlist');
if (process.env.CLEARLIST_DATA_DIR)
  app.setPath('userData', path.resolve(process.env.CLEARLIST_DATA_DIR));
else app.setPath('userData', path.join(app.getPath('appData'), 'Clearlist'));
const directory = path.dirname(fileURLToPath(import.meta.url));
let window: BrowserWindow | null = null;
let allowClose = false;
let closing = false;
const storage = new FileStore(app.getPath('userData'));
const locked = app.requestSingleInstanceLock();
if (!locked) app.quit();
else {
  app.on('second-instance', () => {
    window?.restore();
    window?.show();
    window?.focus();
  });
  app.whenReady().then(() => {
    Menu.setApplicationMenu(null);
    window = new BrowserWindow({
      width: 1400,
      height: 920,
      minWidth: 900,
      minHeight: 640,
      title: '简清 · Clearlist',
      backgroundColor: '#f6f8f7',
      autoHideMenuBar: true,
      webPreferences: {
        preload: path.join(directory, 'preload.cjs'),
        contextIsolation: true,
        nodeIntegration: false,
        sandbox: true,
        spellcheck: false,
      },
    });
    const trusted = (event: Electron.IpcMainInvokeEvent | Electron.IpcMainEvent) => {
      if (
        !window ||
        event.sender !== window.webContents ||
        event.senderFrame !== window.webContents.mainFrame
      )
        throw new Error('无效请求来源');
    };
    ipcMain.handle('store:load', (event) => {
      trusted(event);
      return storage.load();
    });
    ipcMain.handle('store:save', (event, data: unknown) => {
      trusted(event);
      return storage.save(data);
    });
    ipcMain.handle('data:export', async (event, value: unknown) => {
      trusted(event);
      const data = stateSchema.parse(value);
      const result = await dialog.showSaveDialog(window!, {
        title: '导出简清备份',
        defaultPath: `Clearlist-${new Date().toISOString().slice(0, 10)}.json`,
        filters: [{ name: 'JSON 备份', extensions: ['json'] }],
      });
      if (result.canceled || !result.filePath) return false;
      await writeFile(result.filePath, JSON.stringify(data, null, 2), {
        encoding: 'utf8',
        mode: 0o600,
      });
      return true;
    });
    ipcMain.handle('data:import', async (event) => {
      trusted(event);
      const result = await dialog.showOpenDialog(window!, {
        title: '导入简清备份',
        properties: ['openFile'],
        filters: [{ name: 'JSON 备份', extensions: ['json'] }],
      });
      if (result.canceled) return null;
      if ((await stat(result.filePaths[0])).size > 50 * 1024 * 1024)
        throw new Error('文件超过 50 MB 限制');
      return stateSchema.parse(JSON.parse(await readFile(result.filePaths[0], 'utf8')));
    });
    ipcMain.handle('data:restore', async (event) => {
      trusted(event);
      const result = await dialog.showOpenDialog(window!, {
        title: '选择有效的简清备份以恢复',
        properties: ['openFile'],
        filters: [{ name: 'JSON 备份', extensions: ['json'] }],
      });
      if (result.canceled) return null;
      if ((await stat(result.filePaths[0])).size > 50 * 1024 * 1024)
        throw new Error('文件超过 50 MB 限制');
      return storage.restore(JSON.parse(await readFile(result.filePaths[0], 'utf8')));
    });
    ipcMain.handle('notice', (event, title: string, body: string) => {
      trusted(event);
      if (
        typeof title !== 'string' ||
        typeof body !== 'string' ||
        title.length > 200 ||
        body.length > 500
      )
        return;
      if (Notification.isSupported()) new Notification({ title, body }).show();
    });
    ipcMain.on('window:ready-close', async (event, success: unknown) => {
      trusted(event);
      if (!closing) return;
      await storage.flush();
      if (success !== true) {
        const result = await dialog.showMessageBox(window!, {
          type: 'warning',
          buttons: ['继续处理', '仍然关闭'],
          defaultId: 0,
          cancelId: 0,
          message: '有数据尚未保存',
          detail: '建议返回窗口导出备份，或重试保存。',
        });
        if (result.response === 0) {
          closing = false;
          return;
        }
      }
      allowClose = true;
      window?.close();
    });
    window.on('close', (event) => {
      if (allowClose) return;
      // A renderer that failed to load has no edits to flush.
      if (window?.webContents.isLoadingMainFrame() || window?.webContents.isCrashed()) return;
      event.preventDefault();
      if (!closing) {
        closing = true;
        window?.webContents.send('window:before-close');
      }
    });
    window.webContents.setWindowOpenHandler(() => ({ action: 'deny' }));
    window.webContents.on('will-navigate', (event) => event.preventDefault());
    const devUrl = process.env.CLEARLIST_DEV_URL;
    if (devUrl === 'http://127.0.0.1:5178') void window.loadURL(devUrl);
    else void window.loadFile(path.join(directory, '../../dist/index.html'));
    window.on('closed', () => {
      window = null;
    });
  });
  app.on('window-all-closed', () => app.quit());
}
