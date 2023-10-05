<script setup lang="ts">
import { reactive, onMounted } from 'vue'

const clipboardDatas: Record<string, string | number>[] = reactive([])
onMounted(async () => {
  const dataList = await window.api.getClipDataList()
  clipboardDatas.push(...dataList)
})

function deleteOneData(creationTime: number) {
  const index = clipboardDatas.findIndex((item) => item.creationTime === creationTime)
  clipboardDatas.splice(index, 1)
  window.api.deleteOneData(creationTime)
}

function deleteAllData() {
  clipboardDatas.splice(0)
  window.api.deleteAllData()
}
function paste(creationTime: number) {
  window.api.paste(creationTime)
}

window.api.updatePageData((_, dataList) => {
  clipboardDatas.splice(0, Infinity, ...dataList)
})
</script>

<template>
  <div id="wrapper">
    <div id="head">
      <b>剪贴板</b>
      <span>
        <el-icon id="delete-icon" title="清空" @click="deleteAllData">
          <Delete />
        </el-icon>
        <el-icon title="设置">
          <Setting />
        </el-icon>
      </span>
    </div>
    <div v-if="clipboardDatas.length" id="body">
      <el-scrollbar>
        <div v-for="clipboardData of clipboardDatas" :key="clipboardData.creationTime" class="clipboard-item">
          <div class="head">
            <div>{{ { text: '文本', image: '图片' }[clipboardData.type] }}</div>
            <div>{{ new Date(Number(clipboardData.creationTime)).toLocaleString() }}</div>
            <div>
              <el-icon v-if="clipboardData.type == 'text'" title="编辑">
                <EditPen />
              </el-icon>
              <el-icon v-if="clipboardData.type == 'image'" title="预览">
                <View />
              </el-icon>
              <el-icon title="锁定">
                <Lock />
              </el-icon>
              <el-icon title="删除" @click="deleteOneData(clipboardData.creationTime as number)">
                <Close />
              </el-icon>
            </div>
          </div>
          <div class="content" @click="paste(clipboardData.creationTime as number)">
            {{ clipboardData.content }}
          </div>
          <div class="footer">
            <el-icon v-if="clipboardData.type === 'text'" title="展开">
              <ArrowDown />
            </el-icon>
          </div>
        </div>
      </el-scrollbar>
    </div>
    <div v-else id="no-data">无数据</div>
  </div>
</template>

<style lang="less">
@import './assets/css/styles.less';

#wrapper {
  margin: 10px;
  border-radius: 5px;
  background-color: rgba(255, 255, 255, 0.5);
  box-shadow: 0px 0px 10px rgba(0, 0, 0, 0.5);
}

#head {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 0 10px;
  line-height: 35px;

  span>i {
    cursor: pointer;

    &:first-child {
      margin-right: 10px;
    }
  }
}

#no-data {
  display: flex;
  justify-content: center;
  align-items: center;
  height: calc(100vh - 55px);
  color: rgba(255, 255, 255, 0.3);
  font-size: 18px;
}

#body {
  height: calc(100vh - 55px);
  overflow: hidden;
  padding: 10px 0;

  .clipboard-item {
    display: flex;
    flex-direction: column;
    border-radius: 5px;
    overflow: hidden;
    margin: 0px 10px 10px 10px;
    box-shadow: 0px 0px 5px rgba(0, 0, 0, 0.3);
    min-height: 50px;

    &:hover {
      background-color: rgba(255, 255, 255, 0.9);

      .head>div {
        &:last-child {
          display: inline;
        }

        &:nth-child(2) {
          display: none;
        }
      }

      .footer {
        i {
          display: inline;
        }
      }
    }

    .head {
      display: flex;
      justify-content: space-between;
      background-color: rgba(255, 255, 255, 0.9);
      padding: 3px 10px;

      >div:first-child {
        font-size: 14px;
        font-weight: bold;
      }

      >div:nth-child(2) {
        color: rgba(0, 0, 0, 0.5);
        font-size: 11px;
      }

      >div:last-child {
        display: none;
        color: rgba(0, 0, 0, 0.5);
        font-size: 12px;

        i {
          margin-left: 5px;
          cursor: pointer;
        }
      }
    }

    .content {
      background-color: rgba(255, 255, 255, 0.6);
      padding: 10px;
      cursor: pointer;
    }

    .footer {
      display: flex;
      align-items: start;
      justify-content: flex-end;
      background-color: rgba(255, 255, 255, 0.6);
      font-size: 12px;
      color: rgba(0, 0, 0, 0.8);
      padding: 0 10px;
      height: 14px;

      i {
        cursor: pointer;
        display: none;
      }
    }
  }
}
</style>
