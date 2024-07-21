import { watch } from 'vue'
import { defineStore } from 'pinia'

export const useConfigStore = defineStore('config', {
  state: () => {
    const defaultConfig: Config = {
      width: 300,
      heightRate: 0.7,
      mainWindowPosition: 'follow-mouse',
      transparency: 60, // 主界面透明度
      show: true, // 软件启动时显示主界面
      expirationType: 'number', // 过期类型，'number' 代表天数，'time' 代表时间
      number: 200, // 过期条数
      time: 0 // 过期时间
    }
    return {
      ...defaultConfig,
      ...JSON.parse(window.localStorage.getItem('config') || '{}')
    }
  }
})

type Config = {
  width: number
  heightRate: number
  mainWindowPosition: 'left' | 'right' | 'follow-mouse'
  transparency: number
  show: boolean
  expirationType: 'number' | 'time'
  number: number
  time: number
}

const config = useConfigStore()
watch(
  config,
  () => {
    window.localStorage.setItem('config', JSON.stringify(config.$state))
  },
  { immediate: true }
)
