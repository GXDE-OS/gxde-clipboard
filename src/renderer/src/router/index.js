import { createRouter, createWebHashHistory } from 'vue-router'
import MainWindow from '../components/MainWindow.vue'
import Settings from '../components/Settings.vue'

const routes = [
  { path: '/', component: MainWindow },
  { path: '/settings', component: Settings }
]

export default createRouter({
  history: createWebHashHistory(),
  routes
})
