<script setup lang="ts">
import { ref, reactive, onMounted, watch, computed, nextTick, toRaw } from 'vue'
import hljs from 'highlight.js'
import 'highlight.js/styles/github.css'
import { useRouter } from 'vue-router'
import Settings from './Settings.vue'
import { useConfigStore } from '../stores/config'

const config = useConfigStore()
const router = useRouter()
const searchString = ref('')
const showSearchInput = ref(false) // 是否显示搜索框
const deleteConfirmVisible = ref(false) // 清空确认框
const searchInput = ref() // 获得搜索框dom
const scrollbarRef = ref() // 滚动条dom
const clipboardDatas: ClipboardData[] = reactive([])
const detailsWindow = ref()
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
const mainWindowVisible = ref(false)

onMounted(async () => {
  clipboardDatas.push(...(await window.api.getClipDataList()))
  mainWindowVisible.value = true
  addScrollEvent()
  windowAddEventListener()
})

watch([searchString, currentColor, clipboardDatas], () => {
  bodyFocus()
  nextTick(setMarkMap)
})

function changeOneData(clipboardData: ClipboardData, field: string, value: string | number) {
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

function paste(clipboardData: ClipboardData) {
  window.api.paste(toRaw(clipboardData))
  window.api.hideMainWindow()
}

function top(clipboardData: ClipboardData) {
  const minOrder = Math.min(...clipboardDatas.map(({ order }) => order))
  clipboardData.order = minOrder - 1
  changeOneData(clipboardData, 'order', clipboardData.order)
}

function nodeVisible(clipboardData: ClipboardData) {
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

function addScrollEvent() {
  const scrollBar = document.querySelector('#body .scroll-bar-wrap-class')!
  scrollBar.addEventListener('scroll', closeDetailsWindow)
  scrollBar.addEventListener('scrollend', setMarkMap)
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
        markMap.set(creationTime, '') // 表示在视口外
      }
    } else {
      markMap.set(creationTime, null) // null表述display为none
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

function closeDetailsWindow() {
  detailsWindow.value?.close()
  detailsWindow.value = null
}

async function getContentInfo(
  clipboardData: ClipboardData
): Promise<{ contentWidth: number; contentHeight: number; renderedHTML: string }> {
  const details = document.querySelector('#details')!
  if (clipboardData.type === 'text') {
    // 如果包含特殊字符,就高亮处理,否则当作纯文本
    if (clipboardData.content.search(/[[\]{}<>=]/g) !== -1) {
      details.innerHTML = hljs.highlightAuto(clipboardData.content).value
    } else {
      details.innerHTML = hljs.highlight(clipboardData.content, { language: 'plaintext' }).value
    }
    const renderedHTML = details.innerHTML
    const { scrollWidth, scrollHeight } = details
    details.innerHTML = ''
    return { contentWidth: scrollWidth, contentHeight: scrollHeight, renderedHTML }
  } else {
    return new Promise((resolve) => {
      const img = new Image()
      img.src = clipboardData.content
      img.onload = function () {
        resolve({
          contentWidth: img.width,
          contentHeight: img.height + 10,
          renderedHTML: img.outerHTML
        })
      }
    })
  }
}

async function handleViewIconClick(path: string, clipboardData: ClipboardData, event: MouseEvent) {
  // 点击同一个预览图标时,隐藏已显示的详情窗口
  if (
    detailsWindow.value &&
    detailsWindow.value.location.hash.match(/creationTime=(\d+)$/)?.[1] ===
      String(clipboardData.creationTime)
  ) {
    closeDetailsWindow()
    return
  }

  const { screenX, screenY, clientX, clientY } = event // 点击处离窗口左上角的距离
  // 主窗口左上角坐标
  const mainWindowX = screenX - clientX
  const mainWindowY = screenY - clientY
  const { availWidth, availHeight } = window.screen // 屏幕可用的宽度和高度(不包括任务栏)
  const { top, bottom } = document
    .querySelector(`.clipboard-item[data-creation-time="${clipboardData.creationTime}"]`)!
    .getBoundingClientRect()
  // 详情窗口允许的最大宽高
  const maxWidth = Math.max(mainWindowX, availWidth - (mainWindowX + window.innerWidth))
  const maxHeight = Math.max(availHeight - (top + mainWindowY), bottom)
  const { contentWidth, contentHeight, renderedHTML } = await getContentInfo(clipboardData) // pre内容区的宽高
  const width = Math.min(maxWidth, Math.max(contentWidth + 30, 200)) // 30为详情窗口内pre与窗口的间距
  const height = Math.min(maxHeight, Math.max(contentHeight + 30, bottom - top + 10))
  const x =
    mainWindowX + window.innerWidth + width > availWidth
      ? mainWindowX - width + 5
      : mainWindowX + window.innerWidth - 5
  const y =
    top + mainWindowY + height > availHeight
      ? bottom + mainWindowY - height + 5
      : top + mainWindowY - 5

  window.sessionStorage.setItem('clipboardData', JSON.stringify(clipboardData))
  window.sessionStorage.setItem('highlineHTML', renderedHTML)
  detailsWindow.value = window.open(
    `#/${path}?creationTime=${clipboardData.creationTime}`,
    path,
    `width=${width},height=${height},x=${x},y=${y}`
  )
}

function windowAddEventListener() {
  window.addEventListener('message', ({ data }) => {
    if (data.type === 'closeDetailsWindow') {
      closeDetailsWindow()
    }
  })

  // 滚轮调节透明度
  window.addEventListener('wheel', (e) => {
    const delta = 5 * (e.deltaY > 0 ? 1 : -1)
    if (e.ctrlKey) {
      if (config.transparency + delta >= 0 && config.transparency + delta <= 100) {
        config.transparency += delta
      }
    }
  })

  // 失去焦点时隐藏窗口
  window.addEventListener('blur', () => {
    mainWindowVisible.value = false
    setTimeout(() => {
      window.api.hideMainWindow()
    }, 300)
  })

  window.addEventListener('focus', function () {
    mainWindowVisible.value = true
  })

  // 设置操作快捷键
  window.addEventListener('keyup', (e: KeyboardEvent) => {
    console.log(e.key)
    if (e.key.match(/^\d$/)) {
      let creationTime: number | undefined
      for (const [key, value] of markMap) {
        if (value === Number(e.key)) {
          creationTime = key
          break
        }
      }
      if (creationTime) {
        const clipboardData = clipboardDatas.find((i) => i.creationTime === creationTime)!
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
      // 如果显示了详情窗口,则关闭详情窗口,否则关闭主窗口
      if (detailsWindow.value) {
        closeDetailsWindow()
      } else {
        window.api.hideMainWindow()
      }
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
      const clipboardData = clipboardDatas.find((i) => i.creationTime === creationTime)!
      paste(clipboardData)
    }
  }
}

const showArrowUp = computed(() => {
  let result = false
  for (const item of markMap) {
    if (item[1]) {
      result = false
      break
    } else if (item[1] === '') {
      result = true
      break
    }
  }
  return result
})

const showArrowDown = computed(() => {
  let result = false
  for (const item of [...markMap].reverse()) {
    if (item[1]) {
      result = false
      break
    } else if (item[1] === '') {
      result = true
      break
    }
  }
  return result
})

const transform = computed(() => {
  if (!mainWindowVisible.value) {
    if (config.mainWindowPosition === 'left') {
      return `translate(-${config.width}px, 0)`
    } else if (config.mainWindowPosition === 'right') {
      return `translate(${config.width}px, 0)`
    } else if (config.mainWindowPosition === 'follow-mouse') {
      return `translate(0, ${window.screen.availHeight})`
    }
  }
  return `translate(0, 0)`
})

function scrollToTop() {
  scrollbarRef.value!.scrollTo({ top: 0, behavior: 'smooth' })
}

function scrollToBottom() {
  const scrollHeight = document.querySelector('.scroll-bar-view-class')!.scrollHeight
  scrollbarRef.value!.scrollTo({ top: scrollHeight, behavior: 'smooth' })
}

window.api.updatePageData((_, dataList) => {
  clipboardDatas.splice(0, Infinity, ...dataList)
  scrollToTop()
})

// 使popover失去焦点
function bodyFocus() {
  void (document.querySelector('body') as HTMLElement).click()
}
</script>

<template>
  <div id="wrapper" :style="{ '--transparency': config.transparency / 100, transform }">
    <div id="head">
      <div>
        <el-popover placement="bottom-end" :width="200" trigger="click">
          <template #reference>
            <b
              id="title"
              :style="{ color: currentColor || '#000000' }"
              title="单击进行标记过滤(右键取消标记)"
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
        <div v-show="!detailsWindow" id="move"></div>
        <span>
          <el-icon v-show="showArrowUp" title="顶部 (Home)" @click="scrollToTop">
            <ArrowUp />
          </el-icon>
          <el-icon v-show="showArrowDown" title="底部 (End)" @click="scrollToBottom">
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
          <el-popover :width="200" trigger="hover" placement="bottom-end">
            <template #reference>
              <el-icon title="设置(右键打开全部设置)" @click.right="router.push('settings')">
                <Setting />
              </el-icon>
            </template>
            <Settings></Settings>
          </el-popover>
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
      <el-scrollbar
        ref="scrollbarRef"
        wrap-class="scroll-bar-wrap-class"
        view-class="scroll-bar-view-class"
      >
        <div
          v-for="clipboardData of clipboardDatas"
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
                    title="单击添加标记(右键取消标记)"
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
                <Delete />
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
            <div
              :title="
                markMap.get(clipboardData.creationTime) >= 1 &&
                markMap.get(clipboardData.creationTime) <= 9
                  ? `键${searchString ? 'Ctrl + ' : ''}${markMap.get(
                      clipboardData.creationTime
                    )}直接上屏`
                  : ''
              "
            >
              {{ markMap.get(clipboardData.creationTime) }}
            </div>
            <el-icon
              title="详情"
              tabindex="-1"
              @blur="closeDetailsWindow"
              @click="handleViewIconClick('details', clipboardData, $event)"
            >
              <View />
            </el-icon>
          </div>
        </div>
      </el-scrollbar>
    </div>
    <el-empty
      v-show="!clipboardDatas.length"
      :style="{ height: `calc(100vh - ${showSearchInput ? 87 : 55}px)` }"
      description="无数据"
    />
    <pre id="details"></pre>
  </div>
</template>

<style lang="less">
#wrapper {
  margin: 10px;
  border-radius: 5px;
  background-color: rgba(255, 255, 255, var(--transparency));
  box-shadow: 0px 0px 10px rgba(0, 0, 0, var(--transparency));
  transition: transform 0.3s ease;

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
    height: 35px;

    #move {
      flex-grow: 1;
      height: 100%;
      -webkit-app-region: drag;
    }

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
          opacity: 1;
          outline-style: none;
        }
      }
    }

    .head {
      display: flex;
      justify-content: space-between;
      background-color: rgba(255, 255, 255, 0.9);
      padding: 3px 10px;
      user-select: none;

      i {
        cursor: pointer;
      }

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
          cursor: pointer;
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
        }
      }
    }

    .content {
      background-color: rgba(255, 255, 255, 0.6);
      padding: 5px 10px;
      cursor: pointer;
      p {
        display: -webkit-box;
        -webkit-box-orient: vertical;
        -webkit-line-clamp: 3;
        word-wrap: anywhere;
        overflow: hidden;
        span {
          background-color: #ff8000;
          border-radius: 3px;
        }
      }

      &:has(img) {
        display: flex;
        justify-content: center;
      }

      img {
        max-width: 100%;
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
        opacity: 0;
      }
    }
  }
}

#details {
  height: 0;
  width: 0;
  overflow: hidden;
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
