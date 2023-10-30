<script setup lang="ts">
import { ref, reactive, onMounted, watch, nextTick, toRaw } from 'vue'
import { useRouter } from 'vue-router'

const router = useRouter()
const transparency = ref(0.5)
const searchString = ref('')
const showSearchInput = ref(false) // 是否显示搜索框
const deleteConfirmVisible = ref(false) // 清空确认框
const searchInput = ref() // 获得搜索框dom
const clipboardDatas: ClipboardData[] = reactive([])
const previewIconVisibilityList: boolean[] = reactive([])
const markMap = reactive(new Map()) // 记录标记信息
const deleteWhich = ref('all') // 'all' | 'normal'
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
  clipboardDatas.push(...(await window.api.getClipDataList()))
  addScrollendEvent()
  addWheelEvent()
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

watch([searchString, currentColor, clipboardDatas], () => {
  bodyFocus()
  nextTick(setMarkMap)
})

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
  } else if (deleteWhich.value === 'normal') {
    const lockedDataList = clipboardDatas.filter((i) => i.state !== '' || i.order)
    clipboardDatas.splice(0, Infinity, ...lockedDataList)
  }
  window.api.setClipboardDatas(toRaw(clipboardDatas))
}

function paste(clipboardData) {
  window.api.paste(toRaw(clipboardData))
}

function top(clipboardData) {
  const minOrder = Math.min(...clipboardDatas.map(({ order }) => order))
  clipboardData.order = minOrder - 1
  changeOneData(clipboardData, 'order', clipboardData.order)
}

function nodeVisible(clipboardData) {
  if (searchString.value) {
    if (clipboardData.type === 'text') {
      return (
        clipboardData.content.toLowerCase().includes(searchString.value.toLowerCase()) &&
        (currentColor.value ? currentColor.value === clipboardData.color : true)
      )
    } else {
      return false
    }
  } else {
    return currentColor.value ? currentColor.value === clipboardData.color : true
  }
}

function changeSearchInputVisibility(visibility?: boolean) {
  if (typeof visibility === 'boolean') {
    showSearchInput.value = visibility
  } else {
    showSearchInput.value = !showSearchInput.value
  }
  if (showSearchInput.value) {
    // 显示搜索框后自动获取焦点
    nextTick(() => {
      searchInput.value.focus()
    })
  } else {
    // 隐藏搜索框后清空搜索字符串,重新获取所有剪贴板数据
    searchString.value = ''
  }
}

function highlightSearchString(content: string) {
  // 转义
  content = content.replace(
    /[<>&"]/g,
    (c) => ({ '<': '&lt;', '>': '&gt;', '&': '&amp;', '"': '&quot;' })[c] || c
  )
  if (searchString.value) {
    content = content.replace(new RegExp(searchString.value, 'ig'), '<span>$&</span>')
  }
  return content
}

function addScrollendEvent() {
  document.querySelector('#body .scroll-bar-wrap-class')?.addEventListener('scrollend', setMarkMap)
}

function addWheelEvent() {
  // 调节透明度
  addEventListener('wheel', (e) => {
    if (e.ctrlKey) {
      if (
        transparency.value + e.deltaY * 0.001 >= 0 &&
        transparency.value + e.deltaY * 0.001 <= 1
      ) {
        transparency.value += e.deltaY * 0.001
      }
    }
  })
}

function setMarkMap() {
  markMap.clear()
  if (clipboardDatas.length === 0) return
  let count = 1
  const { scrollTop, clientHeight } = document.querySelector(
    '#body .scroll-bar-wrap-class'
  ) as HTMLElement
  const nodeList = Array.from(
    document.querySelectorAll('#body .clipboard-item') as NodeListOf<HTMLElement>
  )
  nodeList.sort((a, b) => {
    return Number(a.style.order) - Number(b.style.order)
  })
  nodeList.forEach((node) => {
    const creationTime = Number(node.dataset['creationTime'])
    if (node.style.display === '') {
      const footerNode = node.querySelector('.footer') as HTMLElement
      if (
        footerNode.offsetTop + 10 >= scrollTop &&
        footerNode.offsetTop <= scrollTop + clientHeight
      ) {
        markMap.set(creationTime, count++)
      } else {
        markMap.set(creationTime, null)
      }
    } else {
      markMap.set(creationTime, null)
    }
  })
}

function deltaTime(creationTime: number) {
  let delta = Date.now() - creationTime
  const binaryInfoList = [
    { unit: '毫秒', binary: 1000, last: 0 },
    { unit: '秒', binary: 60, last: 0 },
    { unit: '分钟', binary: 60, last: 0 },
    { unit: '小时', binary: 24, last: 0 },
    { unit: '天', binary: Infinity, last: 0 }
  ]
  for (const binaryInfo of binaryInfoList) {
    binaryInfo.last = delta % binaryInfo.binary
    delta = Math.floor(delta / binaryInfo.binary)
    if (delta === 0) break
  }
  const maxUnitItem = binaryInfoList.findLast((i) => i.last)
  if (maxUnitItem && maxUnitItem.unit !== '毫秒') {
    return `${maxUnitItem.last}${maxUnitItem.unit}前`
  } else {
    return '刚刚'
  }
}

function addKeyUpEvent() {
  window.addEventListener('keyup', (e: KeyboardEvent) => {
    console.log(e.key)
    if ((e.target as HTMLElement).tagName !== 'BODY') return
    if (e.key.match(/^\d$/)) {
      let creationTime: number | undefined
      for (const [key, value] of markMap) {
        if (value === Number(e.key)) {
          creationTime = key
          break
        }
      }
      if (creationTime) {
        const clipboardData = clipboardDatas.find((i) => i.creationTime === creationTime)
        paste(clipboardData)
      }
    } else if (e.ctrlKey && e.key === 'f') {
      // 搜索快捷键
      changeSearchInputVisibility()
    } else if (e.key === '[' || e.key === 'PageUp') {
      let creationTime: number | undefined
      for (const [key, value] of markMap) {
        if (value) {
          creationTime = key
          break
        }
      }
      if (creationTime) {
        document
          .querySelector(`.clipboard-item[data-creation-time="${creationTime}"]`)
          ?.scrollIntoView({ block: 'end', behavior: 'smooth' })
      }
    } else if (e.key === ']' || e.key === 'PageDown') {
      let creationTime: number | undefined
      for (const [key, value] of [...markMap].reverse()) {
        if (value) {
          creationTime = key
          break
        }
      }
      if (creationTime) {
        document
          .querySelector(`.clipboard-item[data-creation-time="${creationTime}"]`)
          ?.scrollIntoView({ block: 'start', behavior: 'smooth' })
      }
    } else if (e.key === 'Home') {
      scrollToTop()
    } else if (e.key === 'End') {
      scrollToBottom()
    } else if (e.key === 'Escape') {
      window.api.hideMainWindow()
    }
  })
}

function handleSearchInputKeyUp(e: KeyboardEvent) {
  if (e.key === 'Escape') {
    changeSearchInputVisibility(false)
  } else if (e.ctrlKey && e.key.match(/^\d$/)) {
    let creationTime: number | undefined
    for (const [key, value] of markMap) {
      if (value === Number(e.key)) {
        creationTime = key
        break
      }
    }
    if (creationTime) {
      const clipboardData = clipboardDatas.find((i) => i.creationTime === creationTime)
      paste(clipboardData)
    }
  }
}

function scrollToTop() {
  if (!clipboardDatas.length) return
  const creationTime = [...markMap].at(0)?.[0]
  if (creationTime) {
    document
      .querySelector(`.clipboard-item[data-creation-time="${creationTime}"]`)
      ?.scrollIntoView({ behavior: 'smooth' })
  }
}

function scrollToBottom() {
  if (!clipboardDatas.length) return
  const creationTime = [...markMap].at(-1)?.[0]
  if (creationTime) {
    document
      .querySelector(`.clipboard-item[data-creation-time="${creationTime}"]`)
      ?.scrollIntoView({ behavior: 'smooth' })
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
  <div id="wrapper" :style="{ '--transparency': transparency }">
    <div id="head">
      <div>
        <el-popover placement="bottom-end" :width="200" trigger="click">
          <template #reference>
            <b
              id="title"
              :style="{ color: currentColor || '#000000' }"
              title="单击设置标记(右键取消标记)"
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
          <el-icon
            v-show="markMap.size && ![...markMap].at(0)?.[1]"
            title="顶部 (Home)"
            @click="scrollToTop"
          >
            <ArrowUp />
          </el-icon>
          <el-icon
            v-show="markMap.size && ![...markMap].at(-1)?.[1]"
            title="底部 (End)"
            @click="scrollToBottom"
          >
            <ArrowDown />
          </el-icon>
          <el-popconfirm
            :visible="deleteConfirmVisible"
            :title="`确定清空${deleteWhich === 'all' ? '所有' : '一般'}项?`"
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
                title="左键清空一般项,右键清空所有项"
                @click="
                  deleteWhich === 'all'
                    ? ((deleteWhich = 'normal'), (deleteConfirmVisible = true))
                    : (deleteConfirmVisible = !deleteConfirmVisible)
                "
                @click.right="
                  deleteWhich === 'normal'
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
            title="搜索 (Ctrl+F)"
            @click="changeSearchInputVisibility()"
          >
            <Search />
          </el-icon>
          <el-icon title="设置" @click="router.push('settings')">
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
          @keyup.stop="handleSearchInputKeyUp"
        />
      </div>
    </div>
    <div
      v-show="clipboardDatas.length"
      id="body"
      :style="{ height: `calc(100vh - ${showSearchInput ? 87 : 55}px)` }"
    >
      <el-scrollbar wrap-class="scroll-bar-wrap-class" view-class="scroll-bar-view-class">
        <div
          v-for="(clipboardData, index) of clipboardDatas"
          v-show="nodeVisible(clipboardData)"
          :key="clipboardData.creationTime"
          :data-creation-time="clipboardData.creationTime"
          class="clipboard-item"
          :style="{ order: clipboardData.order }"
        >
          <div
            class="head"
            @dblclick.self="
              changeOneData(clipboardData, 'state', clipboardData.state === '' ? 'locked' : '')
            "
            @click.middle.self="deleteOneData(clipboardData.creationTime)"
          >
            <div>
              <el-popover placement="right" :width="200" :teleported="false" trigger="click">
                <template #reference>
                  <b
                    :style="{
                      color: clipboardData.color || '#000000',
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
              <div
                v-show="clipboardData.order"
                class="topping"
                title="已置顶(单击取消置顶)"
                @click="changeOneData(clipboardData, 'order', 0)"
              >
                顶
              </div>
              <el-icon
                v-show="clipboardData.state === 'locked'"
                title="已锁定(单击解锁)"
                @click="changeOneData(clipboardData, 'state', '')"
              >
                <Lock />
              </el-icon>
            </div>
            <div>
              {{ deltaTime(clipboardData.creationTime) }}
            </div>
            <div>
              <!-- <el-icon v-if="clipboardData.type == 'text'" title="编辑">
                <EditPen />
              </el-icon>
              <el-icon v-if="clipboardData.type == 'image'" title="预览">
                <View />
              </el-icon> -->
              <el-icon
                v-show="clipboardData.state === ''"
                title="锁定"
                @click="changeOneData(clipboardData, 'state', 'locked')"
              >
                <Lock />
              </el-icon>
              <el-icon title="置顶" @click="top(clipboardData)">
                <Top />
              </el-icon>
              <el-icon title="删除" @click="deleteOneData(clipboardData.creationTime)">
                <Close />
              </el-icon>
            </div>
          </div>
          <div class="content" @click="paste(clipboardData)">
            <p
              v-if="clipboardData.type === 'text'"
              v-html="highlightSearchString(clipboardData.content)"
            ></p>
            <img
              v-else-if="clipboardData.type === 'image'"
              :src="clipboardData.content"
              alt="图片"
            />
          </div>
          <div class="footer">
            <div :title="`键${markMap.get(clipboardData.creationTime)}直接上屏`">
              {{ markMap.get(clipboardData.creationTime) }}
            </div>
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
#wrapper {
  margin: 10px;
  border-radius: 5px;
  background-color: rgba(255, 255, 255, var(--transparency));
  box-shadow: 0px 0px 10px rgba(0, 0, 0, var(--transparency));

  #title {
    cursor: pointer;
    text-shadow: white 0px 0px 5px;
  }
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

  .scroll-bar-view-class {
    display: flex;
    flex-direction: column;
  }
  .clipboard-item {
    display: flex;
    flex-direction: column;
    border-radius: 5px;
    overflow: hidden;
    margin: 0px 10px 10px 10px;
    box-shadow: 0px 0px 5px rgba(0, 0, 0, 0.3);
    min-height: 50px;
    transition: order 1s 0s ease;

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
        .topping {
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 9px;
          background-color: #ff8000;
          color: white;
          padding: 1px 3px;
          border-radius: 4px;
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
      padding: 5px 10px;
      cursor: pointer;
      overflow: hidden;
      p {
        display: -webkit-box;
        -webkit-box-orient: vertical;
        -webkit-line-clamp: 3;
        word-wrap: anywhere;
        span {
          background-color: #ff8000;
          border-radius: 3px;
        }
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
