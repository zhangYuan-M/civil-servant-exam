// 根据根目录下的科目文件夹（资料分析 / 判断推理 / …）自动生成侧边栏。
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { navTitle, scanMaterials } from './materials.mjs'

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const subjects = scanMaterials(root)

const subjectGroup = (subject) => {
  const items = []

  if (subject.lectures.length) {
    items.push({
      text: '讲义',
      collapsed: false,
      items: subject.lectures.map((l) => ({ text: navTitle(l.file, l.title), link: l.link })),
    })
  }

  for (const group of subject.groups) {
    items.push({
      text: group.name,
      collapsed: true,
      items: group.items.map((l) => ({ text: navTitle(l.file, l.title), link: l.link })),
    })
  }

  if (subject.pdfs.length) {
    items.push({
      text: '课件与真题 PDF',
      collapsed: true,
      items: [
        { text: `PDF 资料（${subject.pdfs.length} 份）`, link: `/${subject.name}/#课件与真题-pdf` },
      ],
    })
  }

  // 分组标题本身指向该科目的目录页
  return { text: subject.name, link: `/${subject.name}/`, items }
}

// 顶部导航栏已隐藏，站点名放在侧边栏第一行，点击回首页
export default [{ text: 'ZYuan Docs', link: '/' }, ...subjects.map(subjectGroup)]
