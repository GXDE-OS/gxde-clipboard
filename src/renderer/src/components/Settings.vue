<script setup lang="ts">
import { ref, watch } from 'vue'
import { useConfigStore } from '../stores/config'

const size = ref('small')
const labelPosition = ref('top')
const config = useConfigStore()

watch(
  () => config.mainWindowPosition,
  () => {
    window.postMessage(
      {
        type: 'setBounds'
      },
      '*'
    )
  },
  { immediate: true }
)

function resizeWindow() {
  window.resizeTo(
    Math.floor(config.width),
    Math.floor(window.screen.availHeight * config.heightRate)
  )
}
</script>

<template>
  <el-form :model="config" label-width="auto" :label-position="labelPosition" :size="size">
    <el-form-item label="剪贴板位置">
      <el-select v-model="config.mainWindowPosition" :teleported="false">
        <el-option label="屏幕右侧" value="right" />
        <el-option label="屏幕左侧" value="left" />
        <el-option label="跟随鼠标" value="follow-mouse" />
      </el-select>
    </el-form-item>
    <el-form-item v-show="config.mainWindowPosition === 'follow-mouse'" label="剪贴板高度">
      <el-slider
        v-model="config.heightRate"
        :min="0.5"
        :max="1"
        :step="0.1"
        :format-tooltip="(value: number) => `${value * 100}%`"
        @input="resizeWindow"
      />
    </el-form-item>
    <el-form-item label="透明度">
      <el-slider v-model="config.transparency" />
    </el-form-item>
    <el-form-item label="软件启动时显示主界面">
      <el-switch v-model="config.show" />
    </el-form-item>
  </el-form>
</template>
