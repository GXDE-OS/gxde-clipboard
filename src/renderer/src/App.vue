<script setup lang="ts">
import { ref, reactive, onMounted, watch, nextTick, toRaw } from 'vue'

const searchString = ref('')
const showSearchInput = ref(false) // 是否显示搜索框
const deleteConfirmVisible = ref(false) // 清空确认框
const searchInput = ref()
const clipboardDatas: Record<string, string | number>[] = reactive([])
const previewIconVisibilityList: boolean[] = reactive([])
const indexList: (number | null)[] = reactive([])
const deleteWhich = ref('all') // all | unlocked
const colorList = reactive([
  '#ec2c64',
  '#f46fa1',
  '#fba414',
  '#d5b2ac',
  '#84b6c0',
  '#b4ca5f',
  '#6c36b1'
])
const currentColor = ref('')

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

watch(currentColor, () => {
  nextTick(() => {
    setIndexList()
    bodyFocus()
  })
})

watch(
  () => clipboardDatas.map((i) => i.color),
  () => {
    bodyFocus()
    if (currentColor.value) {
      nextTick(setIndexList)
    }
  }
)

function changeOneData(clipboardData, field, value) {
  clipboardData[field] = value
  window.api.changeOneData(toRaw(clipboardData))
}

function deleteOneData(creationTime: number) {
  const index = clipboardDatas.findIndex((item) => item.creationTime === creationTime)
  clipboardDatas.splice(index, 1)
  window.api.deleteOneData(creationTime)
}

function setClipboardDatas() {
  if (deleteWhich.value === 'all') {
    clipboardDatas.splice(0)
  } else if (deleteWhich.value === 'unlocked') {
    const lockedDataList = clipboardDatas.filter((i) => i.state === 'locked')
    clipboardDatas.splice(0, Infinity, ...lockedDataList)
  }
  window.api.setClipboardDatas(toRaw(clipboardDatas))
}

function paste(creationTime: number, type: string) {
  window.api.paste(creationTime, type)
}

async function search() {
  const dataList = await window.api.getClipDataList(searchString.value)
  clipboardDatas.splice(0, Infinity, ...dataList)
  nextTick(() => {
    setIndexList()
  })
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
  document.querySelector('#body .scroll-bar')?.addEventListener('scrollend', setIndexList)
}

function setIndexList() {
  indexList.splice(0)
  if (clipboardDatas.length === 0) return
  let count = 1
  const { scrollTop, clientHeight } = document.querySelector('#body .scroll-bar') as HTMLElement
  void (document.querySelectorAll('#body .clipboard-item') as NodeListOf<HTMLElement>).forEach(
    (node, index) => {
      if (node.style.display === '') {
        const footerNode = node.querySelector('.footer') as HTMLElement
        if (
          footerNode.offsetTop + 10 >= scrollTop &&
          footerNode.offsetTop <= scrollTop + clientHeight
        ) {
          indexList[index] = count++
        } else {
          indexList[index] = null
        }
      } else {
        indexList[index] = null
      }
    }
  )
}

function addKeyUpEvent() {
  window.addEventListener('keyup', (e: KeyboardEvent) => {
    console.log(e.key)
    if ((e.target as HTMLElement).tagName === 'BODY') {
      if (e.key.match(/^\d$/)) {
        const index = indexList.findIndex((i) => i === Number(e.key))
        const { creationTime, type } = clipboardDatas[index]
        paste(creationTime as number, type as string)
      } else if (e.key === '[' || e.key === 'PageUp') {
        const index = indexList.findIndex((i) => i)
        if (index > 0) {
          document
            .querySelectorAll('.clipboard-item')
            [index].scrollIntoView({ block: 'end', behavior: 'smooth' })
        }
      } else if (e.key === ']' || e.key === 'PageDown') {
        const index = indexList.findLastIndex((i) => i)
        if (index !== indexList.length - 1) {
          document
            .querySelectorAll('.clipboard-item')
            [index].scrollIntoView({ block: 'start', behavior: 'smooth' })
        }
      } else if (e.key === 'Home') {
        scollToTop()
      } else if (e.key === 'End') {
        scollToBottom()
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

// 使popover失去焦点
function bodyFocus() {
  void (document.querySelector('body') as HTMLElement).click()
}
</script>

<template>
  <div id="wrapper">
    <div id="head">
      <div>
        <el-popover placement="bottom-end" :width="200" trigger="click">
          <template #reference>
            <b
              :style="{ color: currentColor || '#000000', cursor: 'pointer' }"
              title="右键取消标记"
              @click.right="currentColor = ''"
              >剪贴板</b
            >
          </template>
          <div class="color">
            <div
              v-for="color of colorList"
              :key="color"
              :style="{
                backgroundColor: color,
                borderColor: currentColor === color ? color : undefined
              }"
              @click="currentColor = currentColor === color ? '' : color"
            ></div>
          </div>
        </el-popover>
        <span>
          <el-icon v-show="!indexList.at(0)" title="顶部" @click="scollToTop">
            <Top />
          </el-icon>
          <el-icon v-show="!indexList.at(-1)" title="底部" @click="scollToBottom">
            <Bottom />
          </el-icon>
          <el-popconfirm
            :visible="deleteConfirmVisible"
            :title="`确定清空${deleteWhich === 'all' ? '所有' : '未锁定'}项?`"
            confirm-button-text="是"
            cancel-button-text="否"
            :width="165"
            @confirm="
              () => {
                deleteConfirmVisible = false
                setClipboardDatas()
              }
            "
            @cancel="deleteConfirmVisible = false"
          >
            <template #reference>
              <el-icon
                v-show="clipboardDatas.length"
                title="左键清空未锁定项,右键清空所有项"
                @click="
                  deleteWhich === 'all'
                    ? ((deleteWhich = 'unlocked'), (deleteConfirmVisible = true))
                    : (deleteConfirmVisible = !deleteConfirmVisible)
                "
                @click.right="
                  deleteWhich === 'unlocked'
                    ? ((deleteWhich = 'all'), (deleteConfirmVisible = true))
                    : (deleteConfirmVisible = !deleteConfirmVisible)
                "
              >
                <Delete />
              </el-icon>
            </template>
          </el-popconfirm>

          <el-icon
            v-show="!(!showSearchInput && !clipboardDatas.length)"
            title="搜索"
            @click="toggleSearchInputVisibility"
          >
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
      v-show="clipboardDatas.length"
      id="body"
      :style="{ height: `calc(100vh - ${showSearchInput ? 87 : 55}px)` }"
    >
      <el-scrollbar wrap-class="scroll-bar">
        <div
          v-for="(clipboardData, index) of clipboardDatas"
          v-show="currentColor ? currentColor === clipboardData.color : true"
          :key="clipboardData.creationTime"
          class="clipboard-item"
        >
          <div
            class="head"
            @dblclick.self="
              changeOneData(
                clipboardData,
                'state',
                clipboardData.state === 'unlocked' ? 'locked' : 'unlocked'
              )
            "
            @click.middle.self="deleteOneData(clipboardData.creationTime as number)"
          >
            <div>
              <el-popover placement="right" :width="200" :teleported="false" trigger="click">
                <template #reference>
                  <b
                    :style="{
                      color: (clipboardData.color as string) || '#000000',
                      cursor: 'pointer'
                    }"
                    title="右键取消标记"
                    @click.right="changeOneData(clipboardData, 'color', '')"
                    >{{ { text: '文本', image: '图片' }[clipboardData.type] }}</b
                  >
                </template>
                <div class="color">
                  <div
                    v-for="color of colorList"
                    :key="color"
                    :style="{
                      backgroundColor: color,
                      borderColor: clipboardData.color === color ? color : undefined
                    }"
                    @click="
                      changeOneData(
                        clipboardData,
                        'color',
                        (clipboardData.color = clipboardData.color === color ? '' : color)
                      )
                    "
                  ></div>
                </div>
              </el-popover>
              <el-icon v-show="clipboardData.state === 'locked'" title="已锁定">
                <Lock />
              </el-icon>
            </div>
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
              <el-icon
                v-show="clipboardData.state === 'unlocked'"
                title="锁定"
                @click="changeOneData(clipboardData, 'state', 'locked')"
              >
                <Lock />
              </el-icon>
              <el-icon
                v-show="clipboardData.state === 'locked'"
                title="解除锁定"
                @click="changeOneData(clipboardData, 'state', 'unlocked')"
              >
                <Unlock />
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
              <el-scrollbar max-height="50vh" view-class="preview-scrollbar" always>
                <pre>{{ clipboardData.content }}</pre>
              </el-scrollbar>
            </el-popover>
          </div>
        </div>
      </el-scrollbar>
    </div>
    <el-empty
      v-show="!clipboardDatas.length"
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
      user-select: none;

      > div:first-child {
        display: flex;
        align-items: center;
        font-size: 14px;
        i {
          color: rgb(255, 128, 0);
          margin-left: 2px;
        }
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
.color {
  display: flex;
  justify-content: space-between;
  > div {
    border: 2px solid white;
    padding: 1.5px;
    background-clip: content-box;
    width: 20px;
    height: 20px;
    border-radius: 50%;
    flex-shrink: 0;
  }
}
</style>
