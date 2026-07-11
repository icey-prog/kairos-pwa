import { useMemo, useState } from 'react'
import { Copy, Check } from 'lucide-react'
import hljs from 'highlight.js/lib/core'
import javascript from 'highlight.js/lib/languages/javascript'
import typescript from 'highlight.js/lib/languages/typescript'
import python from 'highlight.js/lib/languages/python'
import dart from 'highlight.js/lib/languages/dart'
import bash from 'highlight.js/lib/languages/bash'
import json from 'highlight.js/lib/languages/json'
import xml from 'highlight.js/lib/languages/xml'
import css from 'highlight.js/lib/languages/css'
import sql from 'highlight.js/lib/languages/sql'
import yaml from 'highlight.js/lib/languages/yaml'
import php from 'highlight.js/lib/languages/php'
import 'highlight.js/styles/github-dark.css'

hljs.registerLanguage('javascript', javascript)
hljs.registerLanguage('typescript', typescript)
hljs.registerLanguage('python', python)
hljs.registerLanguage('dart', dart)
hljs.registerLanguage('bash', bash)
hljs.registerLanguage('json', json)
hljs.registerLanguage('xml', xml)
hljs.registerLanguage('css', css)
hljs.registerLanguage('sql', sql)
hljs.registerLanguage('yaml', yaml)
hljs.registerLanguage('php', php)

// Aliases users actually type in notes.
const ALIASES = { js: 'javascript', ts: 'typescript', py: 'python', html: 'xml', sh: 'bash', shell: 'bash', jsx: 'javascript', tsx: 'typescript' }

const highlight = (code, lang) => {
  const resolved = ALIASES[lang] ?? lang
  if (resolved && hljs.getLanguage(resolved)) {
    return hljs.highlight(code, { language: resolved }).value
  }
  return hljs.highlightAuto(code).value
}

// Editor-style block (VS Code / Flutter docs look): filename tab + copy button.
function CodeBlock({ code, lang, filename }) {
  const html = useMemo(() => highlight(code, lang), [code, lang])
  const [copied, setCopied] = useState(false)

  const copy = () => {
    navigator.clipboard.writeText(code)
    setCopied(true)
    setTimeout(() => setCopied(false), 1500)
  }

  return (
    <div className="my-2 rounded-xl overflow-hidden bg-[#0d1117] border border-white/10">
      <div className="flex items-center justify-between px-3 py-2 border-b border-white/10">
        <span className="text-[11px] font-medium text-white/50 font-mono truncate">
          {filename || (lang ? lang.toUpperCase() : '')}
        </span>
        <button
          type="button"
          onClick={copy}
          className="flex items-center gap-1 text-[10px] font-medium text-white/40 hover:text-white/70 transition-colors flex-shrink-0"
        >
          {copied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
          {copied ? 'Copié' : 'Copier'}
        </button>
      </div>
      <pre className="p-3 overflow-x-auto text-[13px] leading-relaxed">
        <code className="hljs !bg-transparent !p-0" dangerouslySetInnerHTML={{ __html: html }} />
      </pre>
    </div>
  )
}

// Renders note text: ```lang fenced blocks become editor cards, the rest stays
// pre-wrap prose. `inline `code`` gets a subtle mono chip.
export default function CodeText({ text, className }) {
  const parts = useMemo(() => {
    const out = []
    // ```lang or ```lang:filename.ext fences — the filename becomes the editor tab header.
    const re = /```(\w*)(?::([^\n]+))?\n?([\s\S]*?)```/g
    let last = 0
    let m
    while ((m = re.exec(text)) !== null) {
      if (m.index > last) out.push({ type: 'text', value: text.slice(last, m.index) })
      out.push({ type: 'code', lang: m[1] || null, filename: m[2] || null, value: m[3].replace(/\n$/, '') })
      last = m.index + m[0].length
    }
    if (last < text.length) out.push({ type: 'text', value: text.slice(last) })
    return out
  }, [text])

  const renderProse = (value, key) => (
    <p key={key} className="whitespace-pre-wrap leading-relaxed">
      {value.split(/(`[^`\n]+`)/g).map((seg, i) =>
        seg.startsWith('`') && seg.endsWith('`') && seg.length > 2 ? (
          <code key={i} className="px-1.5 py-0.5 rounded-md bg-[var(--color-secondary)] text-[0.9em] font-mono text-[var(--color-primary)]">
            {seg.slice(1, -1)}
          </code>
        ) : (
          seg
        ),
      )}
    </p>
  )

  return (
    <div className={className}>
      {parts.map((p, i) =>
        p.type === 'code' ? <CodeBlock key={i} code={p.value} lang={p.lang} filename={p.filename} /> : renderProse(p.value, i),
      )}
    </div>
  )
}
