import { app, shell, BrowserWindow, screen, clipboard, ipcMain, globalShortcut } from 'electron'
import { join } from 'path'
import { electronApp, optimizer, is } from '@electron-toolkit/utils'
import clipboardListener from 'clipboard-event'
import { keyboard, Key, mouse } from '@nut-tree/nut-js'
import icon from '../../resources/icon.png?asset'
import {
  addClipData,
  getClipDataList,
  deleteOneData,
  deleteAllData,
  getClipContent
} from '../data/operate-data'

function createWindow(): void {
  const primaryDisplay = screen.getPrimaryDisplay()
  const { width, height } = primaryDisplay.workAreaSize
  // Create the browser window.
  const mainWindow = new BrowserWindow({
    width: 300, // 窗口宽
    height, // 窗口高
    resizable: false, // 禁止改变窗口大小
    x: width - 300, // 窗口靠右
    y: 0,
    alwaysOnTop: true, // 是否一直显示在最上层
    frame: false,
    transparent: true,
    show: false,
    autoHideMenuBar: true,
    ...(process.platform === 'linux' ? { icon } : {}),
    webPreferences: {
      preload: join(__dirname, '../preload/index.js'),
      sandbox: false
    }
  })

  // 监听剪贴板变化
  let disabled = false
  clipboardListener.startListening()
  clipboardListener.on('change', async () => {
    if (disabled) return
    const text = clipboard.readText()
    if (text) {
      await addClipData({
        type: 'text',
        content: text,
        creationTime: new Date().getTime(),
        state: 'unlocked',
        color: 'white'
      })
    }
    mainWindow.webContents.send('updatePageData', await getClipDataList())
  })

  // 注册全局快捷键
  if (!globalShortcut.isRegistered('Shift+CommandOrControl+V')) {
    globalShortcut.register('Shift+CommandOrControl+V', async () => {
      mainWindow.show()
    })
  }

  ipcMain.handle('getClipDataList', async (_, searchString) => await getClipDataList(searchString))
  ipcMain.handle('deleteOneData', async (_, creationTime) => await deleteOneData(creationTime))
  ipcMain.handle('deleteAllData', async () => await deleteAllData())
  ipcMain.handle('paste', async (_, creationTime) => {
    mainWindow.minimize()
    const content = await getClipContent(creationTime)
    disabled = true
    clipboard.writeText(content)
    await keyboard.pressKey(Key.LeftControl, Key.V)
    await keyboard.releaseKey(Key.LeftControl, Key.V)
    disabled = false
  })

  // 失去焦点就隐藏窗口
  mainWindow.on('blur', () => {
    mainWindow.minimize()
  })

  mainWindow.on('ready-to-show', () => {
    mainWindow.show()
  })

  mainWindow.webContents.setWindowOpenHandler((details) => {
    shell.openExternal(details.url)
    return { action: 'deny' }
  })

  // HMR for renderer base on electron-vite cli.
  // Load the remote URL for development or the local html file for production.
  if (is.dev && process.env['ELECTRON_RENDERER_URL']) {
    mainWindow.loadURL(process.env['ELECTRON_RENDERER_URL'])
  } else {
    mainWindow.loadFile(join(__dirname, '../renderer/index.html'))
  }
}

// This method will be called when Electron has finished
// initialization and is ready to create browser windows.
// Some APIs can only be used after this event occurs.
app.whenReady().then(() => {
  // Set app user model id for windows
  electronApp.setAppUserModelId('com.electron')

  // Default open or close DevTools by F12 in development
  // and ignore CommandOrControl + R in production.
  // see https://github.com/alex8088/electron-toolkit/tree/master/packages/utils
  app.on('browser-window-created', (_, window) => {
    optimizer.watchWindowShortcuts(window)
  })

  createWindow()

  app.on('activate', function () {
    // On macOS it's common to re-create a window in the app when the
    // dock icon is clicked and there are no other windows open.
    if (BrowserWindow.getAllWindows().length === 0) createWindow()
  })
})

// Quit when all windows are closed, except on macOS. There, it's common
// for applications and their menu bar to stay active until the user quits
// explicitly with Cmd + Q.
app.on('window-all-closed', () => {
  // 停止监听剪贴板
  clipboardListener.stopListening()
  // 注销全部快捷键
  globalShortcut.unregisterAll()

  if (process.platform !== 'darwin') {
    app.quit()
  }
})

// In this file you can include the rest of your app"s specific main process
// code. You can also put them in separate files and require them here.
