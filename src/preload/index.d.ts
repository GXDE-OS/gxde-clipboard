import { ElectronAPI } from '@electron-toolkit/preload'

declare global {
  interface Window {
    electron: ElectronAPI
    api: {
      getClipDataList: () => Record<string, string | number>[]
      deleteOneData: (creationTime: number) => void
      deleteAllData: () => void
      paste: (creationTime: number) => void
      updatePageData: (
        callback: (
          event: Electron.IpcRendererEvent,
          dataList: Record<string, string | number>[]
        ) => void
      ) => void
    }
  }
}
