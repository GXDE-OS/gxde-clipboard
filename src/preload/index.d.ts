import { ElectronAPI } from '@electron-toolkit/preload'

declare global {
  interface Window {
    electron: ElectronAPI
    api: {
      getClipDataList: (searchString?: string) => Record<string, string | number>[]
      changeOneData: (clipboardData: Record<string, string | number>) => void
      deleteOneData: (creationTime: number) => void
      setClipboardDatas: (clipboardDatas: Record<string, string | number>[]) => void
      hideMainWindow: () => void
      paste: (creationTime: number, type: string) => void
      updatePageData: (
        callback: (
          event: Electron.IpcRendererEvent,
          dataList: Record<string, string | number>[]
        ) => void
      ) => void
    }
  }
}
