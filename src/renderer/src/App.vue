<script setup lang="ts">
import { ref, reactive, onMounted, watch, nextTick } from 'vue'

const searchString = ref('')
const showSearchInput = ref(false) // 是否显示搜索框
const searchInput = ref()
const clipboardDatas: Record<string, string | number>[] = reactive([])
const previewIconVisibilityList: boolean[] = reactive([])
const indexList: (number | null)[] = reactive([])

onMounted(async () => {
  await search()
  addScrollendEvent()
  addKeyUpEvent()
})

watch(
  () => clipboardDatas.map((i) => i.content),
  () => {
    nextTick(() => {
      previewIconVisibilityList.length = clipboardDatas.length
      void [...document.querySelectorAll('.clipboard-item .content')].forEach(
        (dom: { scrollHeight: number; clientHeight: number }, index) => {
          previewIconVisibilityList[index] = dom.scrollHeight > dom.clientHeight
        }
      )
    })
  }
)

function deleteOneData(creationTime: number) {
  const index = clipboardDatas.findIndex((item) => item.creationTime === creationTime)
  clipboardDatas.splice(index, 1)
  window.api.deleteOneData(creationTime)
}

function deleteAllData() {
  clipboardDatas.splice(0)
  window.api.deleteAllData()
}

function paste(creationTime: number, type: string) {
  window.api.paste(creationTime, type)
}

async function search() {
  const dataList = await window.api.getClipDataList(searchString.value)
  clipboardDatas.splice(0, Infinity, ...dataList)
  indexList.splice(0)
  dataList.forEach((_, index) => (indexList[index] = index + 1))
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

function addScrollendEvent() {
  document.querySelector('#body .scroll-bar')?.addEventListener('scrollend', (e: Event) => {
    indexList.splice(0)
    let count = 1
    const { scrollTop, clientHeight } = e.target as HTMLElement
    void (document.querySelectorAll('#body .footer') as NodeListOf<HTMLElement>).forEach(
      (node, index) => {
        if (node.offsetTop + 10 >= scrollTop && node.offsetTop <= scrollTop + clientHeight) {
          indexList[index] = count++
        } else {
          indexList[index] = null
        }
      }
    )
  })
}

function addKeyUpEvent() {
  window.addEventListener('keyup', (e: KeyboardEvent) => {
    console.log(e.key)
    if ((e.target as HTMLElement).tagName === 'BODY') {
      if (e.key.match(/^\d$/)) {
        const index = indexList.findIndex((i) => i === Number(e.key))
        const { creationTime, type } = clipboardDatas[index]
        paste(creationTime as number, type as string)
      } else if (e.key === '[') {
        const index = indexList.findIndex((i) => i)
        if (index > 0) {
          document
            .querySelectorAll('.clipboard-item')
            [index].scrollIntoView({ block: 'end', behavior: 'smooth' })
        }
      } else if (e.key === ']') {
        const index = indexList.findLastIndex((i) => i)
        if (index !== indexList.length - 1) {
          document
            .querySelectorAll('.clipboard-item')
            [index].scrollIntoView({ block: 'start', behavior: 'smooth' })
        }
      } else if (e.key === 'Escape') {
        window.api.hideMainWindow()
      }
    }
  })
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
      <el-scrollbar wrap-class="scroll-bar">
        <div
          v-for="(clipboardData, index) of clipboardDatas"
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
          <div
            class="content"
            @click="paste(clipboardData.creationTime as number, clipboardData.type as string)"
          >
            <span v-if="clipboardData.type === 'text'">
              {{ clipboardData.content }}
            </span>
            <img
              v-else-if="clipboardData.type === 'image'"
              :src="clipboardData.content as string"
              alt="图片"
            />
          </div>
          <div class="footer">
            <div>{{ indexList[index] }}</div>
            <el-popover placement="bottom-end" width="280">
              <template #reference>
                <el-icon v-show="previewIconVisibilityList[index]" title="预览">
                  <View />
                </el-icon>
              </template>
              <el-scrollbar max-height="60vh" view-class="preview-scrollbar" always>
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
      span {
        display: -webkit-box;
        -webkit-box-orient: vertical;
        -webkit-line-clamp: 3;
        word-wrap: anywhere;
      }
      img {
        width: 100%;
        max-height: 100px;
        object-fit: scale-down;
      }
    }

    .footer {
      display: flex;
      align-items: start;
      justify-content: space-between;
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

.preview-scrollbar pre {
  margin: 5px;
}
</style>
