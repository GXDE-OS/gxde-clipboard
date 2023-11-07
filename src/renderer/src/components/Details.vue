<script setup lang="ts">
import { onMounted, ref } from 'vue'
import hljs from 'highlight.js'
import 'highlight.js/styles/github.css'
import { useRoute } from 'vue-router'

const route = useRoute()
const creationTime = Number(route.query.creationTime)
const clipboardData = ref()

onMounted(async () => {
  clipboardData.value = (await window.api.getClipDataList()).find(
    (i) => i.creationTime === creationTime
  )
  const html = hljs.highlightAuto(clipboardData.value.content).value
  const highline = document.querySelector('#highline')!
  highline.innerHTML = html
})
</script>

<template>
  <div id="wrapper">
    <div id="head"></div>
    <el-scrollbar id="scrollbar">
      <pre id="highline"></pre>
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
  opacity: 0.7;
  &:hover {
    opacity: 0.9;
  }

  #head {
    height: 20px;
  }

  #scrollbar {
    height: calc(100vh - 30px);
    padding: 0 10px;
  }
}
</style>
