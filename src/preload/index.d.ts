import { ElectronAPI } from '@electron-toolkit/preload'

declare global {
  interface Window {
    electron: ElectronAPI
    api: {
      getClipDataList: (searchString?: string) => ClipboardData[]
      changeOneData: (clipboardData: ClipboardData) => void
      deleteOneData: (creationTime: number) => void
      setClipboardDatas: (clipboardDatas: ClipboardData[]) => void
      execMainWindowMethod: (methodName: string) => void
      getMousePosition: () => { x: number; y: number }
      paste: (clipboardData: ClipboardData, field: 'text' | 'image') => void
      onUpdatePageData: (callback: (event: Electron.IpcRendererEvent) => void) => void
    }
  }
}
