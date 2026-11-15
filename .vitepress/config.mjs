import { defineConfig } from 'vitepress'
import sidebar from './sidebar.mjs'

// https://vitepress.dev/reference/site-config
export default defineConfig({
  lang: 'zh-CN',
  // 顶部没有导航栏，点击标题 / 目录时留出 32px 呼吸空间
  scrollOffset: 32,
  title: 'ZYuan Docs',
  description: 'civil-servant-exam',
  // 全站隐藏顶部导航栏（VitePress 内置的 navbar: false 机制）
  transformPageData(pageData) {
    pageData.frontmatter.navbar = false
  },

  themeConfig: {
    nav: [
      { text: '首页', link: '/' },
      { text: '资料分析', link: '/资料分析/' }
    ],

    // 侧边栏由 .vitepress/sidebar.mjs 根据「资料分析/」文件夹自动生成（只含结构，不影响默认样式）
    sidebar,

    outline: { level: [2, 3], label: '本页目录' },

    socialLinks: [
      { icon: 'github', link: 'https://github.com/vuejs/vitepress' }
    ]
  }
})
