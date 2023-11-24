<script setup lang="ts">
import { ref, watch } from 'vue'
import { useConfigStore } from '../stores/config'

const size = ref('small')
const labelPosition = ref('top')
const config = useConfigStore()

watch(() => config.mainWindowPosition, setBounds, { immediate: true })

function setBounds() {
  const { availWidth, availHeight } = window.screen
  if (config.mainWindowPosition === 'right') {
    window.api.setBounds({
      width: config.width,
      height: availHeight,
      x: availWidth - config.width,
      y: 0
    })
  } else if (config.mainWindowPosition === 'left') {
    window.api.setBounds({
      width: config.width,
      height: availHeight,
      x: 0,
      y: 0
    })
  } else if (config.mainWindowPosition === 'follow-mouse') {
    // TODO
  }
}
</script>

<template>
  <el-form :model="config" label-width="auto" :label-position="labelPosition" :size="size">
    <el-form-item label="主窗口位置">
      <el-select
        v-model="config.mainWindowPosition"
        :teleported="false"
        placeholder="请选择主窗口位置"
      >
        <el-option label="屏幕右侧" value="right" />
        <el-option label="屏幕左侧" value="left" />
        <el-option label="跟随鼠标" value="follow-mouse" />
      </el-select>
    </el-form-item>
    <el-form-item label="透明度">
      <el-slider v-model="config.transparency" />
    </el-form-item>
  </el-form>
</template>
