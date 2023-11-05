<script setup lang="ts">
import { onMounted, ref } from 'vue'
import { useRoute } from 'vue-router'

const route = useRoute()
const creationTime = Number(route.query.creationTime)
const clipboardData = ref()

onMounted(async () => {
  clipboardData.value = (await window.api.getClipDataList()).find(
    (i) => i.creationTime === creationTime
  )
})
</script>

<template>
  <div id="wrapper">
    <div id="head"></div>
    <el-scrollbar height="calc(100vh - 35px)">
      <pre id="content">{{ clipboardData?.content }}</pre>
    </el-scrollbar>
  </div>
</template>

<style lang="less">
#wrapper {
  padding-bottom: 15px;
  border-radius: 5px;
  background-color: rgba(255, 255, 255, 0.6);
  overflow: hidden;
  &:hover {
    background-color: rgba(255, 255, 255, 0.9);
  }

  #head {
    height: 20px;
  }

  #content {
    padding: 0 10px;
  }
}
</style>
