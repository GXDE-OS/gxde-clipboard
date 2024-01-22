<script setup lang="ts">
import { ref } from 'vue'
import { useConfigStore } from '../stores/config'

const size = ref('small')
const labelPosition = ref('top')
const config = useConfigStore()

function setBounds() {
  window.postMessage({ type: 'setBounds' }, '*')
}

function refreshClipDatas() {
  window.postMessage({ type: 'refreshClipDatas' }, '*')
}

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
      <el-select v-model="config.mainWindowPosition" :teleported="false" @change="setBounds">
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
    <el-form-item label="展示数量(为0显示所有)">
      <el-radio-group
        id="expiration-radio"
        v-model="config.expirationType"
        @change="refreshClipDatas"
      >
        <el-radio label="number">按条数</el-radio>
        <el-radio label="time">按天</el-radio>
      </el-radio-group>
      <div id="expiration-input">
        <el-input-number
          v-show="config.expirationType === 'number'"
          v-model.stop="config.number"
          :step="50"
          :min="0"
          @change="refreshClipDatas"
          @keyup.stop
        />
        <el-input-number
          v-show="config.expirationType === 'time'"
          v-model="config.time"
          :step="1"
          :min="0"
          step-strictly
          @change="refreshClipDatas"
          @keyup.stop
        />
        <span>{{ config.expirationType === 'number' ? '条' : '天' }}</span>
      </div>
    </el-form-item>
    <el-form-item label="软件启动时显示主界面">
      <el-switch v-model="config.show" />
    </el-form-item>
  </el-form>
</template>

<style lang="less">
.el-form-item__label {
  font-weight: bold;
}
#expiration-radio {
  width: 40%;
}
#expiration-input {
  width: 60%;
  display: flex;
  > span {
    margin-left: 5px;
  }
}
</style>
