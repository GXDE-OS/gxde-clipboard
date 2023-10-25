import {
  app,
  shell,
  BrowserWindow,
  Tray,
  screen,
  clipboard,
  ipcMain,
  globalShortcut,
  nativeImage
} from 'electron'
import { join } from 'path'
import { electronApp, optimizer, is } from '@electron-toolkit/utils'
import clipboardListener from 'clipboard-event'
import { keyboard, Key /* mouse */ } from '@nut-tree/nut-js'
import icon from '../../resources/icon.ico?asset'
import {
  addClipData,
  getClipDataList,
  deleteOneData,
  setClipboardDatas,
  getClipContent,
  changeOneData
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
    alwaysOnTop: false, // 是否一直显示在最上层
    frame: false,
    transparent: true,
    show: false,
    type: 'toolbar', // 不显示任务栏窗口
    autoHideMenuBar: true,
    ...(process.platform === 'linux' ? { icon } : {}),
    webPreferences: {
      preload: join(__dirname, '../preload/index.js'),
      sandbox: false
    }
  })

  // 创建托盘图标
  const tray = new Tray(icon)
  tray.setToolTip('clip')
  tray.on('click', function () {
    mainWindow.show()
    mainWindow.focus()
  })
  tray.on('right-click', function () {
    mainWindow.close()
  })

  // 监听剪贴板变化
  let disabled = false
  clipboardListener.startListening()
  clipboardListener.on('change', async () => {
    if (disabled) return
    console.log('availableFormats', clipboard.availableFormats())
    const availableFormats = clipboard.availableFormats()
    if (availableFormats.includes('image/png')) {
      const img = clipboard.readImage()
      const dataUrl = img.toDataURL()
      await addClipData({
        type: 'image',
        content: dataUrl,
        creationTime: new Date().getTime(),
        state: 'unlocked',
        color: ''
      })
    } else if (availableFormats.includes('text/plain')) {
      const text = clipboard.readText()
      if (text) {
        await addClipData({
          type: 'text',
          content: text,
          creationTime: new Date().getTime(),
          state: 'unlocked',
          color: ''
        })
      }
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
  ipcMain.handle('changeOneData', async (_, clipboardData) => await changeOneData(clipboardData))
  ipcMain.handle('deleteOneData', async (_, creationTime) => await deleteOneData(creationTime))
  ipcMain.handle(
    'setClipboardDatas',
    async (_, clipboardDatas) => await setClipboardDatas(clipboardDatas)
  )
  ipcMain.handle('hideMainWindow', async () => mainWindow.minimize())
  ipcMain.handle('paste', async (_, creationTime, type) => {
    mainWindow.minimize()
    const content = await getClipContent(creationTime)
    disabled = true
    if (type === 'text') {
      clipboard.writeText(content)
    } else if (type === 'image') {
      const image = nativeImage.createFromDataURL(content)
      clipboard.writeImage(image)
    }
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
