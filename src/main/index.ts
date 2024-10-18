import {
  app,
  BrowserWindow,
  webContents,
  Tray,
  Menu,
  clipboard,
  ipcMain,
  globalShortcut,
  nativeImage,
  screen
} from 'electron'
import { join } from 'path'
import { electronApp, optimizer, is } from '@electron-toolkit/utils'
import clipboardListener from 'clipboard-event'
import { keyboard, Key } from '@nut-tree-fork/nut-js'
import { default as AutoLaunch } from 'auto-launch'
import icon from '../../resources/icon.png?asset'
import {
  addClipData,
  getClipDataList,
  deleteOneData,
  setClipboardDatas,
  changeOneData
} from '../data/operate-data'

function createWindow(): BrowserWindow {
  // Create the browser window.
  const mainWindow = new BrowserWindow({
    width: 0,
    height: 0,
    resizable: false, // 禁止改变窗口大小
    frame: false,
    transparent: true,
    alwaysOnTop: true,
    show: false,
    type: 'toolbar', // 不显示任务栏窗口
    autoHideMenuBar: true,
    ...(process.platform === 'linux' ? { icon } : {}),
    webPreferences: {
      preload: join(__dirname, '../preload/index.js'),
      sandbox: false
    }
  })

  async function setContextMenu(tray: Tray) {
    const minecraftAutoLauncher = new AutoLaunch({ name: 'clip' })
    const template = [
      {
        label: '退出',
        click: () => {
          mainWindow.close()
        }
      }
    ]
    if (app.isPackaged) {
      const isEnabled: boolean = await minecraftAutoLauncher.isEnabled()
      if (isEnabled) {
        template.unshift({
          label: '取消开机启动',
          click: () => {
            minecraftAutoLauncher.disable()
            setContextMenu(tray)
          }
        })
      } else {
        template.unshift({
          label: '开机启动',
          click: () => {
            minecraftAutoLauncher.enable()
            setContextMenu(tray)
          }
        })
      }
    }
    const contextMenu = Menu.buildFromTemplate(template)
    tray.setContextMenu(contextMenu)
  }

  // 创建托盘图标
  const tray = new Tray(icon)
  tray.setToolTip('丁丁剪贴板')
  setContextMenu(tray)
  tray.on('click', function () {
    mainWindow.restore()
    mainWindow.webContents.send('message', 'showMainWindow')
  })
  tray.on('right-click', function () {
    tray.popUpContextMenu()
  })

  // 监听剪贴板变化
  let disabled = false
  clipboardListener.startListening()
  clipboardListener.on('change', async () => {
    if (disabled) return
    console.log('availableFormats', clipboard.availableFormats())
    const availableFormats = clipboard.availableFormats()
    const clipboardData = {
      text: '',
      image: '',
      creationTime: new Date().getTime(),
      state: '',
      color: '',
      order: 0
    }
    if (availableFormats.includes('image/png')) {
      const img = clipboard.readImage()
      clipboardData.image = img.toDataURL()
    }
    if (availableFormats.includes('text/plain')) {
      const text = clipboard.readText()
      clipboardData.text = text
    }
    if (clipboardData.image || clipboardData.text) {
      await addClipData(clipboardData)
      mainWindow.webContents.send('message', 'updatePageData')
    }
  })

  // 注册全局快捷键
  if (!globalShortcut.isRegistered('Shift+CommandOrControl+V')) {
    globalShortcut.register('Shift+CommandOrControl+V', async () => {
      mainWindow.show()
      mainWindow.webContents.send('message', 'showMainWindow')
    })
  }
  // shift+ctrl+c只复制内容到系统剪贴板,不记录到软件
  if (!globalShortcut.isRegistered('Shift+CommandOrControl+C')) {
    globalShortcut.register('Shift+CommandOrControl+C', async () => {
      disabled = true
      await keyboard.pressKey(Key.LeftControl, Key.C)
      await keyboard.releaseKey(Key.LeftControl, Key.C)
      disabled = false
    })
  }
  // 打开调试工具
  if (!globalShortcut.isRegistered('Shift+CommandOrControl+I')) {
    globalShortcut.register('Shift+CommandOrControl+I', async () => {
      mainWindow.webContents.openDevTools()
    })
  }

  ipcMain.handle('getClipDataList', async (_, searchString) => await getClipDataList(searchString))
  ipcMain.handle('changeOneData', async (_, clipboardData) => await changeOneData(clipboardData))
  ipcMain.handle('deleteOneData', async (_, creationTime) => await deleteOneData(creationTime))
  ipcMain.handle(
    'setClipboardDatas',
    async (_, clipboardDatas) => await setClipboardDatas(clipboardDatas)
  )
  ipcMain.handle('execMainWindowMethod', async (_, methodName) => await mainWindow[methodName]())
  ipcMain.handle('getMousePosition', () => screen.getCursorScreenPoint())
  ipcMain.handle('paste', async (_, clipboardData, field) => {
    disabled = true
    // 先清空,否则会出现在文本框粘贴图片时,实际粘贴的是之前存在剪贴板中的文字
    clipboard.clear()
    if (field === 'text') {
      clipboard.writeText(clipboardData.text)
    } else if (field === 'image') {
      const image = nativeImage.createFromDataURL(clipboardData.image)
      clipboard.writeImage(image)
    }
    await keyboard.pressKey(Key.LeftControl, Key.V)
    await keyboard.releaseKey(Key.LeftControl, Key.V)
    disabled = false
  })

  // 拦截window.open(),设置弹出窗口的属性
  mainWindow.webContents.setWindowOpenHandler((details) => {
    if (details.url) {
      return {
        action: 'allow',
        overrideBrowserWindowOptions: {
          frame: false,
          transparent: true,
          alwaysOnTop: true,
          parent: mainWindow, // 设置层级在父窗口之上
          resizable: false,
          type: 'toolbar', // 不显示任务栏窗口
          webPreferences: {
            preload: join(__dirname, '../preload/index.js')
          }
        }
      }
    }
    return { action: 'deny' }
  })

  // HMR for renderer base on electron-vite cli.
  // Load the remote URL for development or the local html file for production.
  if (is.dev && process.env['ELECTRON_RENDERER_URL']) {
    mainWindow.loadURL(process.env['ELECTRON_RENDERER_URL'])
  } else {
    mainWindow.loadFile(join(__dirname, '../renderer/index.html'))
  }
  return mainWindow
}

// This method will be called when Electron has finished
// initialization and is ready to create browser windows.
// Some APIs can only be used after this event occurs.
app.whenReady().then(() => {
  // Set app user model id for windows
  electronApp.setAppUserModelId('clip')

  // Default open or close DevTools by F12 in development
  // and ignore CommandOrControl + R in production.
  // see https://github.com/alex8088/electron-toolkit/tree/master/packages/utils
  app.on('browser-window-created', (_, window) => {
    optimizer.watchWindowShortcuts(window)
  })

  const mainWindow = createWindow()

  app.on('activate', function () {
    // On macOS it's common to re-create a window in the app when the
    // dock icon is clicked and there are no other windows open.
    if (BrowserWindow.getAllWindows().length === 0) createWindow()
  })
  app.on('browser-window-blur', function () {
    if (!webContents.getFocusedWebContents()) {
      mainWindow.webContents.send('message', 'hideMainWindow')
    }
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
