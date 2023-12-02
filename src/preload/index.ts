import { contextBridge, ipcRenderer } from 'electron'
import { electronAPI } from '@electron-toolkit/preload'

// Custom APIs for renderer
const api = {
  getClipDataList: (searchString?: string) => ipcRenderer.invoke('getClipDataList', searchString),
  changeOneData: (clipboardData: ClipboardData) =>
    ipcRenderer.invoke('changeOneData', clipboardData),
  deleteOneData: (creationTime: number) => ipcRenderer.invoke('deleteOneData', creationTime),
  setClipboardDatas: (clipboardDatas: ClipboardData[]) =>
    ipcRenderer.invoke('setClipboardDatas', clipboardDatas),
  hideMainWindow: () => ipcRenderer.invoke('hideMainWindow'),
  getMousePosition: () => ipcRenderer.invoke('getMousePosition'),
  paste: (clipboardData: ClipboardData, field: 'text' | 'image') =>
    ipcRenderer.invoke('paste', clipboardData, field),
  updatePageData: (
    callback: (event: Electron.IpcRendererEvent, ...args: ClipboardData[]) => void
  ) => ipcRenderer.on('updatePageData', callback)
}

// Use `contextBridge` APIs to expose Electron APIs to
// renderer only if context isolation is enabled, otherwise
// just add to the DOM global.
if (process.contextIsolated) {
  try {
    contextBridge.exposeInMainWorld('electron', electronAPI)
    contextBridge.exposeInMainWorld('api', api)
  } catch (error) {
    console.error(error)
  }
} else {
  // @ts-ignore (define in dts)
  window.electron = electronAPI
  // @ts-ignore (define in dts)
  window.api = api
}
