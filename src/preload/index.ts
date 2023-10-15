import { contextBridge, ipcRenderer } from 'electron'
import { electronAPI } from '@electron-toolkit/preload'

// Custom APIs for renderer
const api = {
  getClipDataList: (searchString?: string) => ipcRenderer.invoke('getClipDataList', searchString),
  changeOneData: (clipboardData: Record<string, string | number>) =>
    ipcRenderer.invoke('changeOneData', clipboardData),
  deleteOneData: (creationTime: number) => ipcRenderer.invoke('deleteOneData', creationTime),
  setClipboardDatas: (clipboardDatas: Record<string, string | number>[]) =>
    ipcRenderer.invoke('setClipboardDatas', clipboardDatas),
  hideMainWindow: () => ipcRenderer.invoke('hideMainWindow'),
  paste: (creationTime: number, type: string) => ipcRenderer.invoke('paste', creationTime, type),
  updatePageData: (callback) => ipcRenderer.on('updatePageData', callback)
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
