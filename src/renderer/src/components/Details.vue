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
  const details = document.querySelector('#details')!
  if (clipboardData.value.type === 'text') {
    if (clipboardData.value.content.search(/[[\]{}<>=]/g) !== -1) {
      const html = hljs.highlightAuto(clipboardData.value.content).value
      details.innerHTML = html
    } else {
      details.innerHTML = clipboardData.value.content
    }
  } else {
    const img = new Image()
    img.style.width = '100%'
    img.src = clipboardData.value.content
    details.appendChild(img)
  }
})

function closeDetailsWindow() {
  window.close()
}
</script>

<template>
  <div id="wrapper">
    <div id="head">
      <div id="icon">
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
  }
}
</style>
