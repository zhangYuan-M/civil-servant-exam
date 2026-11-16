<script setup>
import { computed, onBeforeUnmount, onMounted, ref } from 'vue'
import DefaultTheme from 'vitepress/theme'
import { onContentUpdated, useData } from 'vitepress'

const { Layout } = DefaultTheme
const { isDark, frontmatter } = useData()
const isHome = computed(() => frontmatter.value.layout === 'home')

function scrollTop() {
  window.scrollTo({ top: 0, behavior: 'smooth' })
}

/* ---------- 本页阅读时长 ---------- */
const readingMeta = ref('')

function computeReadingMeta() {
  const doc = document.querySelector('.vp-doc')
  if (!doc) return
  const text = doc.innerText || ''
  const cjk = (text.match(/[\u4e00-\u9fff]/g) || []).length
  const words = (text.replace(/[\u4e00-\u9fff]/g, ' ').match(/[A-Za-z0-9]+/g) || []).length
  const total = cjk + words
  const minutes = Math.max(1, Math.round(total / 300))
  readingMeta.value = total
    ? `全文约 ${total.toLocaleString('en-US')} 字 · 约 ${minutes} 分钟`
    : ''
}

/* ---------- 右侧「本页目录」支持按层级折叠 ---------- */
const CHEVRON =
  '<svg viewBox="0 0 16 16" width="14" height="14" aria-hidden="true">' +
  '<path d="M6 4l4 4-4 4" fill="none" stroke="currentColor" stroke-width="1.6" ' +
  'stroke-linecap="round" stroke-linejoin="round"/></svg>'

let observer = null
let timer = null
let lastActive = ''

function expandActiveGroup() {
  let changed = false
  document.querySelectorAll('.VPDocAsideOutline .outline-link.active').forEach((link) => {
    let node = link.parentElement
    while (node && !node.classList.contains('root')) {
      if (node.tagName === 'LI' && node.classList.contains('is-folded')) {
        node.classList.remove('is-folded')
        changed = true
      }
      node = node.parentElement
    }
  })
  // 折叠时条目的 offsetTop 为 0，VitePress 会把左侧标记条算错位置
  if (changed) requestAnimationFrame(() => window.dispatchEvent(new Event('scroll')))
}

function maybeExpandActive() {
  const link = document.querySelector('.VPDocAsideOutline .outline-link.active')
  const href = link?.getAttribute('href') || ''
  if (href === lastActive) return
  lastActive = href
  expandActiveGroup()
}

function decorateOutline() {
  const root = document.querySelector('.VPDocAsideOutline .root')
  if (!root) return

  root.querySelectorAll('li').forEach((li) => {
    if (!li.querySelector(':scope > ul.nested')) return
    if (li.querySelector(':scope > .outline-fold')) return

    // 默认全部展开，点箭头才收起
    li.classList.add('has-children')

    const button = document.createElement('button')
    button.type = 'button'
    button.className = 'outline-fold'
    button.setAttribute('aria-label', '展开 / 折叠本节')
    button.innerHTML = CHEVRON
    button.addEventListener('click', (event) => {
      event.preventDefault()
      event.stopPropagation()
      li.classList.toggle('is-folded')
    })
    // 放在标题右侧，不遮挡左侧文字
    const link = li.querySelector(':scope > a')
    if (link) link.after(button)
    else li.prepend(button)
  })

  maybeExpandActive()
}

function scheduleOutline() {
  clearTimeout(timer)
  timer = setTimeout(() => {
    decorateOutline()
    maybeExpandActive()
  }, 50)
}

onMounted(() => {
  scheduleOutline()
  observer = new MutationObserver(scheduleOutline)
  observer.observe(document.body, {
    childList: true,
    subtree: true,
    attributes: true,
    attributeFilter: ['class'],
  })
})

onBeforeUnmount(() => {
  observer?.disconnect()
  clearTimeout(timer)
})

onContentUpdated(() => {
  readingMeta.value = ''
  requestAnimationFrame(() => {
    computeReadingMeta()
  })
})
</script>

<template>
  <Layout>
    <template #sidebar-nav-after>
      <div class="side-bottom">
        <div class="side-actions">
        <button class="side-theme" type="button" @click="isDark = !isDark">
          <svg v-if="isDark" viewBox="0 0 24 24" width="15" height="15" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round">
            <circle cx="12" cy="12" r="4.2" />
            <path d="M12 2.4v2.2M12 19.4v2.2M2.4 12h2.2M19.4 12h2.2M5.2 5.2l1.6 1.6M17.2 17.2l1.6 1.6M18.8 5.2l-1.6 1.6M6.8 17.2l-1.6 1.6" />
          </svg>
          <svg v-else viewBox="0 0 24 24" width="15" height="15" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <path d="M20.5 14.5A8.5 8.5 0 1 1 9.5 3.5a7 7 0 0 0 11 11z" />
          </svg>
          {{ isDark ? '浅色模式' : '深色模式' }}
        </button>
        <a class="side-top" href="#" @click.prevent="scrollTop">
          <svg viewBox="0 0 24 24" width="15" height="15" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <path d="M12 19V5M5.5 11.5 12 5l6.5 6.5" />
          </svg>
          回到顶部
        </a>
        </div>
        <p v-if="readingMeta" class="reading-meta">
          <span v-if="readingMeta" class="reading-meta__line">{{ readingMeta }}</span>
        </p>
      </div>
    </template>
  </Layout>

  <!-- 首页没有侧边栏，这里放一个浮动切换按钮 -->
  <button
    v-if="isHome"
    class="theme-toggle"
    type="button"
    :title="isDark ? '切换到浅色' : '切换到深色'"
    :aria-label="isDark ? '切换到浅色' : '切换到深色'"
    @click="isDark = !isDark"
  >
    <svg v-if="isDark" viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round">
      <circle cx="12" cy="12" r="4.2" />
      <path d="M12 2.4v2.2M12 19.4v2.2M2.4 12h2.2M19.4 12h2.2M5.2 5.2l1.6 1.6M17.2 17.2l1.6 1.6M18.8 5.2l-1.6 1.6M6.8 17.2l-1.6 1.6" />
    </svg>
    <svg v-else viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
      <path d="M20.5 14.5A8.5 8.5 0 1 1 9.5 3.5a7 7 0 0 0 11 11z" />
    </svg>
  </button>
</template>

<style>
.theme-toggle {
  position: fixed;
  right: 24px;
  bottom: 24px;
  z-index: 30;
  display: flex;
  align-items: center;
  justify-content: center;
  width: 38px;
  height: 38px;
  padding: 0;
  color: var(--vp-c-text-2);
  cursor: pointer;
  background: var(--vp-c-bg-alt);
  border: 1px solid var(--vp-c-divider);
  border-radius: 50%;
  transition: color 0.2s, border-color 0.2s;
}

.theme-toggle:hover {
  color: var(--vp-c-text-1);
  border-color: var(--vp-c-text-3);
}

/* ---------- 正文始终居中于屏幕（宽度随屏幕自适应，左右留白永远相等） ---------- */
@media (min-width: 1280px) {
  :root {
    --gb-reader-w: min(800px, calc(100vw - 704px));
  }

  .VPDoc {
    padding-left: 0 !important;
    padding-right: 0 !important;
  }

  .VPDoc .container {
    justify-content: flex-start !important;
  }

  /* 注意：必须限定到 .container 的直接子元素，否则会把目录里的 .content 也撑宽 */
  .VPDoc .container > .content {
    flex: 0 0 var(--gb-reader-w);
    width: var(--gb-reader-w);
    min-width: 0;
    max-width: var(--gb-reader-w);
    padding: 0 0 128px;
    position: relative;
  }

  .VPDoc.has-aside .content-container,
  .VPDoc .content-container {
    max-width: var(--gb-reader-w) !important;
  }

  .VPDoc .aside {
    position: relative;
  }
}

@media (min-width: 1280px) and (max-width: 1439px) {
  .VPDoc .container > .content,
  .VPDoc .aside {
    left: calc((100vw - var(--gb-reader-w)) / 2 - 272px);
  }
}

@media (min-width: 1440px) {
  .VPDoc .container > .content,
  .VPDoc .aside {
    left: calc(448px - var(--gb-reader-w) / 2);
  }
}

/* ---------- 右侧目录 ---------- */
@media (min-width: 1280px) {
  .VPDoc .aside {
    flex: 0 0 300px;
    width: 300px;
    max-width: 300px !important;
  }

  .VPDocAside {
    width: 268px !important;
  }

  .aside-container {
    width: 268px !important;
  }
}

/* ---------- 侧边栏站点名图标 ---------- */
.VPSidebar .group:first-of-type .text {
  display: inline-flex;
  align-items: center;
  gap: 8px;
}

.VPSidebar .group:first-of-type .text::before {
  content: "";
  flex: none;
  width: 18px;
  height: 18px;
  background-color: currentColor;
  -webkit-mask: url("data:image/svg+xml,%3Csvg%20xmlns%3D%27http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%27%20viewBox%3D%270%200%2024%2024%27%3E%3Cpath%20d%3D%27M12%205.4C10.5%204.1%208.5%203.5%206%203.5c-1%200-1.9.1-2.7.4v14.6c.8-.3%201.7-.4%202.7-.4%202.5%200%204.5.6%206%201.9%201.5-1.3%203.5-1.9%206-1.9%201%200%201.9.1%202.7.4V3.9c-.8-.3-1.7-.4-2.7-.4-2.5%200-4.5.6-6%201.9Zm0%2012.7V7c1.2-.9%202.7-1.4%204.5-1.4.4%200%20.8%200%201.2.1v10.6c-1.1.1-2.1.5-3%20.9-1%20.5-1.8.9-2.7%201.4Z%27%2F%3E%3C%2Fsvg%3E") center / 18px 18px no-repeat;
  mask: url("data:image/svg+xml,%3Csvg%20xmlns%3D%27http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%27%20viewBox%3D%270%200%2024%2024%27%3E%3Cpath%20d%3D%27M12%205.4C10.5%204.1%208.5%203.5%206%203.5c-1%200-1.9.1-2.7.4v14.6c.8-.3%201.7-.4%202.7-.4%202.5%200%204.5.6%206%201.9%201.5-1.3%203.5-1.9%206-1.9%201%200%201.9.1%202.7.4V3.9c-.8-.3-1.7-.4-2.7-.4-2.5%200-4.5.6-6%201.9Zm0%2012.7V7c1.2-.9%202.7-1.4%204.5-1.4.4%200%20.8%200%201.2.1v10.6c-1.1.1-2.1.5-3%20.9-1%20.5-1.8.9-2.7%201.4Z%27%2F%3E%3C%2Fsvg%3E") center / 18px 18px no-repeat;
}

/* ---------- 侧边栏底部：填充空白 + 实用入口 ---------- */
@media (min-width: 960px) {
  /* VitePress 默认给侧边栏留了 96px 底部内边距，这里收掉，让底部入口贴近窗口底部 */
  .VPSidebar {
    padding-bottom: 24px !important;
  }
}

.VPSidebar .nav {
  display: flex;
  flex-direction: column;
  height: 100%;
}

.side-bottom {
  margin-top: auto;
}

.reading-meta__line {
  display: block;
}

.reading-meta {
  margin: 19px 0 0;
  font-size: 12px;
  line-height: 1.5;
  color: var(--vp-c-text-3);
  text-align: center;
}

.side-actions {
  display: flex;
  flex-direction: row;
  align-items: center;
  justify-content: flex-end;
  gap: 12px;
  padding-bottom: 6px;
  border-bottom: 1px solid var(--vp-c-divider);
}

.side-theme,
.side-top {
  display: flex;
  align-items: center;
  justify-content: flex-end;
  gap: 8px;
  padding: 8px 10px;
  font-size: 13px;
  color: var(--vp-c-text-3);
  text-decoration: none;
  cursor: pointer;
  background: transparent;
  border: 1px solid transparent;
  border-radius: 8px;
}

.side-theme:hover,
.side-top:hover {
  color: var(--vp-c-text-1);
  background: var(--vp-c-default-soft);
}

/* ---------- 正文：与左侧目录保持一致的无衬线字体 ---------- */
.vp-doc {
  font-family: var(--vp-font-family-base);
  font-size: 16.5px;
  line-height: 1.85;
  letter-spacing: 0.01em;
}

.vp-doc p,
.vp-doc li,
.vp-doc td,
.vp-doc th,
.vp-doc blockquote p {
  font-size: 16.5px !important;
  line-height: 1.85 !important;
}

.vp-doc :not(pre) > code,
.vp-doc pre,
.vp-doc kbd {
  font-family: var(--vp-font-family-mono);
}

/* ---------- 目录：字号更小、颜色更淡，视觉更轻 ---------- */
.VPDocAsideOutline .outline-link {
  font-size: 14px !important;
  line-height: 32px;
  color: var(--vp-c-text-2) !important;
}

.VPDocAsideOutline .outline-link:hover {
  color: var(--vp-c-text-1) !important;
}

.VPDocAsideOutline .outline-link.active {
  font-weight: 500;
  color: var(--vp-c-text-1) !important;
}

/* ---------- 目录折叠 ---------- */
.VPDocAsideOutline li.has-children > .outline-link {
  display: inline-block;
  width: calc(100% - 22px);
  padding-right: 2px;
  vertical-align: middle;
}

.VPDocAsideOutline li.is-folded > ul.nested {
  display: none;
}

.outline-fold {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 20px;
  height: 32px;
  padding: 0;
  color: var(--vp-c-text-3);
  cursor: pointer;
  background: transparent;
  border: 0;
  border-radius: 4px;
  vertical-align: middle;
}

.outline-fold:hover {
  color: var(--vp-c-text-1);
  background: var(--vp-c-default-soft);
}

.outline-fold svg {
  transform: rotate(90deg);
  transition: transform 0.2s;
}

li.is-folded > .outline-fold svg {
  transform: rotate(0deg);
}
</style>
