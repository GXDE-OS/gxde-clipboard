<script setup lang="ts">
import { ref, reactive, onMounted } from 'vue'

const searchString = ref('')
const showSearchInput = ref(false) // 是否显示搜索框
const searchInput = ref()
const clipboardDatas: Record<string, string | number>[] = reactive([])

onMounted(() => {
  search()
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

async function search() {
  const dataList = await window.api.getClipDataList(searchString.value)
  clipboardDatas.splice(0, Infinity, ...dataList)
}

function toggleSearchInputVisibility() {
  showSearchInput.value = !showSearchInput.value
  if (showSearchInput.value) {
    // 显示搜索框后自动获取焦点
    searchInput.value.focus()
  } else {
    // 隐藏搜索框后清空搜索字符串,重新获取所有剪贴板数据
    searchString.value = ''
    search()
  }
}

function scollToTop() {
  if (clipboardDatas.length) {
    document.querySelectorAll('.clipboard-item')[0].scrollIntoView({
      behavior: 'smooth'
    })
  }
}

function scollToBottom() {
  if (clipboardDatas.length) {
    const items = document.querySelectorAll('.clipboard-item')
    items[items.length - 1].scrollIntoView({
      behavior: 'smooth'
    })
  }
}

window.api.updatePageData((_, dataList) => {
  clipboardDatas.splice(0, Infinity, ...dataList)
})
</script>

<template>
  <div id="wrapper">
    <div id="head">
      <div>
        <b>剪贴板</b>
        <span>
          <el-icon v-show="clipboardDatas.length" title="顶部" @click="scollToTop">
            <Top />
          </el-icon>
          <el-icon v-show="clipboardDatas.length" title="底部" @click="scollToBottom">
            <Bottom />
          </el-icon>
          <el-icon v-show="clipboardDatas.length" title="删除未锁定项" @click="deleteAllData">
            <Delete />
          </el-icon>
          <el-icon title="搜索" @click="toggleSearchInputVisibility">
            <Search />
          </el-icon>
          <el-icon title="设置">
            <Setting />
          </el-icon>
        </span>
      </div>
      <div v-show="showSearchInput">
        <el-input
          ref="searchInput"
          v-model="searchString"
          placeholder="搜索"
          clearable
          @input="search"
        />
      </div>
    </div>
    <div
      v-if="clipboardDatas.length"
      id="body"
      :style="{ height: `calc(100vh - ${showSearchInput ? 87 : 55}px)` }"
    >
      <el-scrollbar>
        <div
          v-for="clipboardData of clipboardDatas"
          :key="clipboardData.creationTime"
          class="clipboard-item"
        >
          <div class="head">
            <div>{{ { text: '文本', image: '图片' }[clipboardData.type] }}</div>
            <div>
              {{ new Date(Number(clipboardData.creationTime)).toLocaleString() }}
            </div>
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
            <el-popover placement="bottom-end" width="280">
              <template #reference>
                <el-icon title="预览">
                  <View />
                </el-icon>
              </template>
              <el-scrollbar max-height="60vh" always>
                <pre>{{ clipboardData.content }}</pre>
              </el-scrollbar>
            </el-popover>
          </div>
        </div>
      </el-scrollbar>
    </div>
    <el-empty
      v-else
      :style="{ height: `calc(100vh - ${showSearchInput ? 87 : 55}px)` }"
      description="无数据"
    />
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

#head > div {
  padding: 0 10px;

  &:first-child {
    display: flex;
    justify-content: space-between;
    align-items: center;
    line-height: 35px;

    span > i {
      cursor: pointer;
      margin-left: 10px;
    }
  }

  &:last-child .el-input__wrapper {
    background-color: inherit;

    input {
      color: black;
    }
  }
}

#body {
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

      .head > div {
        &:last-child {
          display: inline;
        }

        &:nth-child(2) {
          display: none;
        }
      }

      .footer {
        i {
          visibility: visible;
        }
      }
    }

    .head {
      display: flex;
      justify-content: space-between;
      background-color: rgba(255, 255, 255, 0.9);
      padding: 3px 10px;

      > div:first-child {
        font-size: 14px;
        font-weight: bold;
      }

      > div:nth-child(2) {
        color: rgba(0, 0, 0, 0.5);
        font-size: 11px;
      }

      > div:last-child {
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
      padding: 10px 10px 0 10px;
      cursor: pointer;
      overflow: hidden;
      display: -webkit-box;
      -webkit-box-orient: vertical;
      -webkit-line-clamp: 3;
    }

    .footer {
      display: flex;
      align-items: start;
      justify-content: flex-end;
      background-color: rgba(255, 255, 255, 0.6);
      font-size: 12px;
      color: rgba(0, 0, 0, 0.5);
      padding: 0 10px;
      height: 16px;

      i {
        cursor: pointer;
        visibility: hidden;
      }
    }
  }
}
</style>
