// 资料同步：把各科目文件夹里的 PDF 复制到 public/<科目>/，并为每个科目生成目录页。
// 用法：npm run docs:sync
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { scanMaterials } from '../.vitepress/materials.mjs'

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const subjects = scanMaterials(root)

const mb = (n) => `${(n / 1024 / 1024).toFixed(1)} MB`
const topic = (title) => title.replace(/^.*?第\s*\d+\s*讲\s*[:：]?\s*/, '')

const lectureTable = (items) =>
  [
    '| 讲次 | 主题 |',
    '| --- | --- |',
    ...items.map(
      (l) =>
        `| ${l.no ? `第 ${l.no} 讲` : '—'} | [${topic(l.title)}](${l.link}) |`,
    ),
  ].join('\n')

// 清理已删除科目的 public 副本目录（只处理「空目录或仅含 PDF」的目录，避免误删其它公共资源）
const publicRoot = path.join(root, 'public')
const subjectNames = new Set(subjects.map((s) => s.name))
if (fs.existsSync(publicRoot)) {
  for (const entry of fs.readdirSync(publicRoot, { withFileTypes: true })) {
    if (!entry.isDirectory() || subjectNames.has(entry.name)) continue
    const dir = path.join(publicRoot, entry.name)
    const files = fs.readdirSync(dir)
    if (files.every((f) => f.toLowerCase().endsWith('.pdf'))) {
      fs.rmSync(dir, { recursive: true, force: true })
      console.log(`[docs:sync] 清理 ${entry.name}/ 的旧 PDF 副本目录`)
    }
  }
}

let totalCopied = 0

for (const subject of subjects) {
  // 1. 复制 PDF 到 public/<科目>/
  const publicDir = path.join(root, 'public', subject.name)
  fs.mkdirSync(publicDir, { recursive: true })
  let copied = 0
  for (const pdf of subject.pdfs) {
    const from = path.join(subject.dir, pdf)
    const to = path.join(publicDir, pdf)
    const same =
      fs.existsSync(to) &&
      fs.statSync(to).size === fs.statSync(from).size &&
      fs.statSync(to).mtimeMs >= fs.statSync(from).mtimeMs
    if (!same) {
      fs.copyFileSync(from, to)
      copied += 1
    }
  }
  totalCopied += copied

  // 源文件已删除的，清掉 public 里的旧副本，避免目录与实际不一致
  for (const file of fs.readdirSync(publicDir)) {
    if (!file.toLowerCase().endsWith('.pdf')) continue
    if (!subject.pdfs.includes(file)) fs.unlinkSync(path.join(publicDir, file))
  }

  // 2. 生成目录页
  const pdfRows = subject.pdfs
    .map((file) => {
      const url = `/${subject.name}/${file}`
      const date = (file.match(/^(\d{4}\.\d{2}\.\d{2})/) || [])[1] || '—'
      const size = mb(fs.statSync(path.join(subject.dir, file)).size)
      return `| ${date} | ${file.replace(/\.pdf$/i, '')} | ${size} | <a href="${url}" target="_blank" rel="noreferrer">在线打开</a> · <a href="${url}" download>下载</a> |`
    })
    .join('\n')

  const groupSections = subject.groups
    .map((g) => `## ${g.name}\n\n${lectureTable(g.items)}`)
    .join('\n\n')

  const sections = [
    subject.lectures.length ? `## 讲义\n\n${lectureTable(subject.lectures)}` : '',
    groupSections,
    subject.pdfs.length ? `## 课件与真题 PDF\n\n${pdfTable2(subject, pdfRows)}` : '',
  ].filter(Boolean)

  const summary = [
    subject.lectures.length ? `**${subject.lectures.length} 篇讲义**` : '',
    subject.groups.length
      ? `**${subject.groups.reduce((n, g) => n + g.items.length, 0)} 套练习**`
      : '',
    subject.pdfs.length ? `**${subject.pdfs.length} 份课件 / 真题 PDF**` : '',
  ].filter(Boolean)

  const content = `---
title: ${subject.name} · 学习目录
---

> 共 ${summary.join('、')}。
> 本页由 \`npm run docs:sync\` 根据 \`${subject.name}/\` 文件夹自动生成；新增文件后重跑一次即可更新。

${sections.join('\n\n---\n\n')}
`

  fs.writeFileSync(path.join(subject.dir, 'index.md'), content, 'utf8')
  console.log(
    `[docs:sync] ${subject.name}: 讲义 ${subject.lectures.length} 篇 / 练习 ${subject.groups.reduce(
      (n, g) => n + g.items.length,
      0,
    )} 篇 / PDF ${subject.pdfs.length} 份（本次复制 ${copied} 份）`,
  )
}

function pdfTable2(subject, rows) {
  return `PDF 已同步到 \`public/${subject.name}/\`，可直接在浏览器里打开或下载。\n\n| 日期 | 文件 | 大小 | 操作 |\n| --- | --- | --- | --- |\n${rows}`
}
