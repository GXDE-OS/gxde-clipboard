import { createRouter, createWebHashHistory } from 'vue-router'

const routes = [
  { path: '/', component: () => import('../components/MainWindow.vue') },
  { path: '/settings', component: () => import('../components/Settings.vue') },
  { path: '/details', component: () => import('../components/Details.vue') }
]

export default createRouter({
  history: createWebHashHistory(),
  routes
})
