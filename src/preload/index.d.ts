import { ElectronAPI } from '@electron-toolkit/preload'

declare global {
  interface Window {
    electron: ElectronAPI
    api: {
      getClipDataList: (searchString?: string) => ClipboardData[]
      changeOneData: (clipboardData: ClipboardData) => void
      deleteOneData: (creationTime: number) => void
      setClipboardDatas: (clipboardDatas: ClipboardData[]) => void
      hideMainWindow: () => void
      getMousePosition: () => { x: number; y: number }
      paste: (clipboardData: ClipboardData) => void
      updatePageData: (
        callback: (event: Electron.IpcRendererEvent, dataList: ClipboardData[]) => void
      ) => void
    }
  }
}
