import { watch } from 'vue'
import { defineStore } from 'pinia'

export const useConfigStore = defineStore('config', {
  state: () => {
    const defaultConfig: Config = {
      width: 300,
      heightRate: 0.7,
      mainWindowPosition: 'right',
      transparency: 60
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
}

const config = useConfigStore()
watch(
  config,
  () => {
    window.localStorage.setItem('config', JSON.stringify(config))
  },
  { immediate: true }
)
