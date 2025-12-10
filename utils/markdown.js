const { JSDOM } = require("jsdom")
const createDOMPurify = require("dompurify")
const { marked } = require("marked")

const window = new JSDOM("").window
const DOMPurify = createDOMPurify(window)

const MAX_MARKDOWN_LENGTH = 60000

marked.setOptions({
  gfm: true,
  breaks: true,
  mangle: false,
  headerIds: true,
})

const stripControlCharacters = (value = "") =>
  value.replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F]/g, "")

const normalizeMarkdown = (value = "") => {
  if (typeof value !== "string") {
    return ""
  }
  return stripControlCharacters(value).trim()
}

const renderMarkdownToHtml = (markdown = "") => {
  const normalized = normalizeMarkdown(markdown)
  if (!normalized) return ""

  const dirtyHtml = marked.parse(normalized)

  return DOMPurify.sanitize(dirtyHtml, {
    USE_PROFILES: { html: true },
    ADD_ATTR: ["target", "rel", "width", "height", "align"],
    FORBID_TAGS: ["style", "iframe", "object", "embed", "form", "input", "button"],
    ALLOWED_URI_REGEXP: /^(?:https?:|mailto:|ftp:|#)/i,
  })
}

const validateMarkdown = (markdown) => {
  if (markdown === undefined || markdown === null) return true
  if (typeof markdown !== "string") return false
  if (markdown.length > MAX_MARKDOWN_LENGTH) return false

  try {
    renderMarkdownToHtml(markdown)
    return true
  } catch (error) {
    console.error("[markdown] validation error", error)
    return false
  }
}

const sanitizeMarkdown = (markdown = "") => {
  const normalized = normalizeMarkdown(markdown)
  return {
    markdown: normalized,
    html: renderMarkdownToHtml(normalized),
  }
}

module.exports = {
  normalizeMarkdown,
  renderMarkdownToHtml,
  sanitizeMarkdown,
  validateMarkdown,
}



