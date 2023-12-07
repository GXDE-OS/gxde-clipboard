<script setup lang="ts">
import { onMounted, ref } from 'vue'
import 'highlight.js/styles/github.css'

// const clipboardData = ref(
//   JSON.parse(window.sessionStorage.getItem('clipboardData')!) as ClipboardData
// )
const isFullScreen = ref(false) // 是否为全屏

onMounted(async () => {
  const details = document.querySelector('#details')!
  details.innerHTML = window.sessionStorage.getItem('highlineHTML')!
})

function closeDetailsWindow() {
  window.opener.postMessage(
    {
      type: 'closeDetailsWindow'
    },
    '*'
  )
}

function fullScreen() {
  window.moveTo(0, 0)
  window.resizeTo(window.screen.availWidth, window.screen.availHeight)
  isFullScreen.value = true
}
</script>

<template>
  <div id="wrapper">
    <div id="head">
      <div id="icon">
        <el-icon v-if="!isFullScreen" title="全屏" @click="fullScreen"><FullScreen /></el-icon>
        <el-icon title="关闭" @click="closeDetailsWindow"><Close /></el-icon>
      </div>
    </div>
    <el-scrollbar id="scrollbar">
      <pre id="details"></pre>
    </el-scrollbar>
  </div>
</template>

<style lang="less">
#wrapper {
  margin: 5px;
  border-radius: 5px;
  background-color: rgba(246, 246, 246, 1);
  box-shadow: 0px 0px 5px rgba(0, 0, 0, 0.3);
  overflow: hidden;

  #head {
    display: flex;
    justify-content: flex-end;
    align-items: center;
    height: 20px;
    padding: 0 5px;
    font-size: 12px;

    i {
      margin-left: 5px;
      cursor: pointer;
    }
  }

  #scrollbar {
    height: calc(100vh - 30px);
    padding: 0 10px;

    #details:has(img) {
      display: flex;
      justify-content: center;
    }
  }
}
</style>
