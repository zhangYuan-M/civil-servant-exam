// 扫描根目录下的「科目」文件夹（如 资料分析 / 判断推理），供侧边栏与目录页共用。
import fs from 'node:fs'
import path from 'node:path'

// 这些目录不是科目
const SKIP_DIRS = new Set(['node_modules', '.vitepress', 'public', 'dist', 'scripts'])

const listFiles = (dir) => {
  try {
    return fs
      .readdirSync(dir, { withFileTypes: true })
      .filter((d) => d.isFile() && !d.name.startsWith('.'))
      .map((d) => d.name)
  } catch {
    return []
  }
}

const listDirs = (dir) => {
  try {
    return fs
      .readdirSync(dir, { withFileTypes: true })
      .filter((d) => d.isDirectory() && !d.name.startsWith('.'))
      .map((d) => d.name)
  } catch {
    return []
  }
}

export const readTitle = (file) => {
  const line = fs
    .readFileSync(file, 'utf8')
    .split(/\r?\n/)
    .find((l) => /^#\s+/.test(l))
  return line ? line.replace(/^#\s+/, '').trim() : path.basename(file, '.md')
}

export const lectureNo = (name) => {
  const m = name.match(/第\s*(\d+)\s*讲/)
  return m ? Number(m[1]) : null
}

// "资料分析 · 第 1 讲：三大通用速算技巧" -> "第 1 讲 · 三大通用速算技巧"
export const shortTitle = (title) => {
  const m = title.match(/第\s*(\d+)\s*讲\s*[:：]?\s*(.*)$/)
  if (!m) return title
  const rest = (m[2] || '').replace(/[（(].*?[)）]\s*$/, '').trim()
  return rest ? `第 ${m[1]} 讲 · ${rest}` : `第 ${m[1]} 讲`
}

// "ai出题-课后练习题" -> "课后练习"
export const groupName = (dirName) => {
  const name = dirName
    .replace(/^ai出题[-_ ]?/, '')
    .replace(/课后练习题$/, '课后练习')
    .trim()
  return name || dirName
}

const toLecture = (dir, subject, base, file) => ({
  file,
  no: lectureNo(file),
  title: readTitle(path.join(dir, base, file)),
  link: `/${subject}/${base}${file.replace(/\.md$/, '')}`,
})

export function scanMaterials(root) {
  const subjects = []

  for (const name of listDirs(root)) {
    if (SKIP_DIRS.has(name)) continue
    const dir = path.join(root, name)

    const lectures = listFiles(dir)
      .filter((f) => f.endsWith('.md') && f !== 'index.md')
      .map((f) => toLecture(dir, name, '', f))
      .sort((a, b) => (a.no ?? 999) - (b.no ?? 999) || a.file.localeCompare(b.file))

    const groups = []
    for (const sub of listDirs(dir)) {
      const items = listFiles(path.join(dir, sub))
        .filter((f) => f.endsWith('.md'))
        .map((f) => toLecture(dir, name, `${sub}/`, f))
        .sort((a, b) => (a.no ?? 999) - (b.no ?? 999) || a.file.localeCompare(b.file))
      if (items.length) groups.push({ name: groupName(sub), items })
    }

    const pdfs = listFiles(dir).filter((f) => f.toLowerCase().endsWith('.pdf'))

    if (!lectures.length && !groups.length) continue
    subjects.push({ name, dir, lectures, groups, pdfs })
  }

  return subjects.sort((a, b) => a.name.localeCompare(b.name, 'zh'))
}
