import type { ValidationError, ValidatorOptions } from './types'

const defaultValidatorOptions: ValidatorOptions = {
  allowBooleanAttributes: false,
  unpairedTags: [],
}

function isWhitespace(ch: number): boolean {
  return ch === 32 || ch === 9 || ch === 10 || ch === 13 // space, tab, LF, CR
}

function isNameStartChar(ch: number): boolean {
  return (ch >= 65 && ch <= 90) // A-Z
    || (ch >= 97 && ch <= 122) // a-z
    || ch === 95 // _
    || ch === 58 // :
    || (ch >= 0xC0 && ch <= 0xD6)
    || (ch >= 0xD8 && ch <= 0xF6)
    || (ch >= 0xF8 && ch <= 0x2FF)
    || (ch >= 0x370 && ch <= 0x37D)
    || (ch >= 0x37F && ch <= 0x1FFF)
    || (ch >= 0x200C && ch <= 0x200D)
    || (ch >= 0x2070 && ch <= 0x218F)
    || (ch >= 0x2C00 && ch <= 0x2FEF)
    || (ch >= 0x3001 && ch <= 0xD7FF)
    || (ch >= 0xF900 && ch <= 0xFDCF)
    || (ch >= 0xFDF0 && ch <= 0xFFFD)
}

function isNameChar(ch: number): boolean {
  return isNameStartChar(ch)
    || ch === 45 // -
    || ch === 46 // .
    || (ch >= 48 && ch <= 57) // 0-9
    || ch === 0xB7
    || (ch >= 0x0300 && ch <= 0x036F)
    || (ch >= 0x203F && ch <= 0x2040)
}

function readName(xml: string, i: number): string {
  const start = i
  const len = xml.length
  if (i >= len || !isNameStartChar(xml.charCodeAt(i)))
    return ''
  i++
  while (i < len && isNameChar(xml.charCodeAt(i)))
    i++
  return xml.substring(start, i)
}

function getLineCol(xml: string, pos: number): { line: number, col: number } {
  let line = 1
  let col = 1
  for (let i = 0; i < pos && i < xml.length; i++) {
    if (xml.charCodeAt(i) === 10) { // \n
      line++
      col = 1
    }
    else {
      col++
    }
  }
  return { line, col }
}

function makeError(code: string, msg: string, xml: string, pos: number): ValidationError {
  const { line, col } = getLineCol(xml, pos)
  return { err: { code, msg, line, col } }
}

// CDATA detection via charCodeAt: ![CDATA[
function isCDATAStart(xml: string, i: number): boolean {
  return i + 7 < xml.length
    && xml.charCodeAt(i) === 33     // !
    && xml.charCodeAt(i + 1) === 91  // [
    && xml.charCodeAt(i + 2) === 67  // C
    && xml.charCodeAt(i + 3) === 68  // D
    && xml.charCodeAt(i + 4) === 65  // A
    && xml.charCodeAt(i + 5) === 84  // T
    && xml.charCodeAt(i + 6) === 65  // A
    && xml.charCodeAt(i + 7) === 91  // [
}

// DOCTYPE detection via charCodeAt: !DOCTYPE (case-insensitive)
function isDOCTYPEStart(xml: string, i: number): boolean {
  if (i + 7 >= xml.length || xml.charCodeAt(i) !== 33) return false // !
  // Check DOCTYPE case-insensitively
  const d = xml.charCodeAt(i + 1) | 32
  const o = xml.charCodeAt(i + 2) | 32
  const c = xml.charCodeAt(i + 3) | 32
  const t = xml.charCodeAt(i + 4) | 32
  const y = xml.charCodeAt(i + 5) | 32
  const p = xml.charCodeAt(i + 6) | 32
  const e = xml.charCodeAt(i + 7) | 32
  return d === 100 && o === 111 && c === 99 && t === 116 && y === 121 && p === 112 && e === 101
}

export function validate(xml: string, options?: Partial<ValidatorOptions>): true | ValidationError {
  const opts = { ...defaultValidatorOptions, ...options }
  const len = xml.length
  let i = 0

  // Skip BOM
  if (len > 0 && xml.charCodeAt(0) === 0xFEFF)
    i = 1

  const tagStack: string[] = []
  let hasRoot = false
  const unpairedSet = new Set(opts.unpairedTags)
  const allowBooleanAttributes = opts.allowBooleanAttributes
  const attrNames = new Set<string>()

  while (i < len) {
    // Inline whitespace skip
    while (i < len) {
      const ch = xml.charCodeAt(i)
      if (ch !== 32 && ch !== 9 && ch !== 10 && ch !== 13) break
      i++
    }
    if (i >= len)
      break

    if (xml.charCodeAt(i) !== 60) { // <
      if (tagStack.length === 0 && hasRoot) {
        // Text after root element
        const ch = xml.charCodeAt(i)
        if (!isWhitespace(ch))
          return makeError('InvalidXml', 'Content after root element', xml, i)
        i++
        continue
      }
      if (tagStack.length === 0) {
        return makeError('InvalidXml', 'Text content outside root element', xml, i)
      }
      // Skip text content
      while (i < len && xml.charCodeAt(i) !== 60)
        i++
      continue
    }

    // We have '<'
    i++ // skip <
    if (i >= len)
      return makeError('InvalidXml', 'Unexpected end of XML after <', xml, i)

    const nextCh = xml.charCodeAt(i)

    // Comment: <!--
    if (nextCh === 33 && i + 1 < len && xml.charCodeAt(i + 1) === 45 && i + 2 < len && xml.charCodeAt(i + 2) === 45) {
      i += 3
      const endComment = xml.indexOf('-->', i)
      if (endComment === -1)
        return makeError('InvalidXml', 'Unclosed comment', xml, i - 5)
      // Check no -- inside comment
      const commentContent = xml.substring(i, endComment)
      if (commentContent.indexOf('--') !== -1)
        return makeError('InvalidXml', '"--" not allowed inside comment', xml, i + commentContent.indexOf('--'))
      i = endComment + 3
      continue
    }

    // CDATA: <![CDATA[
    if (isCDATAStart(xml, i)) {
      if (tagStack.length === 0)
        return makeError('InvalidXml', 'CDATA outside of element', xml, i - 1)
      i += 8
      const endCdata = xml.indexOf(']]>', i)
      if (endCdata === -1)
        return makeError('InvalidXml', 'Unclosed CDATA section', xml, i - 9)
      i = endCdata + 3
      continue
    }

    // DOCTYPE: <!DOCTYPE
    if (isDOCTYPEStart(xml, i)) {
      i += 8
      let depth = 1
      while (i < len && depth > 0) {
        const ch = xml.charCodeAt(i)
        if (ch === 60)
          depth++
        else if (ch === 62)
          depth--
        i++
      }
      if (depth > 0)
        return makeError('InvalidXml', 'Unclosed DOCTYPE', xml, i)
      continue
    }

    // Processing instruction: <?
    if (nextCh === 63) { // ?
      i++
      const endPi = xml.indexOf('?>', i)
      if (endPi === -1)
        return makeError('InvalidXml', 'Unclosed processing instruction', xml, i - 2)
      i = endPi + 2
      continue
    }

    // Closing tag: </
    if (nextCh === 47) { // /
      i++
      const tagStart = i
      const tagName = readName(xml, i)
      if (!tagName)
        return makeError('InvalidTag', 'Invalid closing tag name', xml, tagStart)
      i += tagName.length
      // Inline whitespace skip
      while (i < len) {
        const ch = xml.charCodeAt(i)
        if (ch !== 32 && ch !== 9 && ch !== 10 && ch !== 13) break
        i++
      }
      if (i >= len || xml.charCodeAt(i) !== 62) // >
        return makeError('InvalidTag', `Expected '>' for closing tag '${tagName}'`, xml, i)
      i++ // skip >

      if (tagStack.length === 0)
        return makeError('InvalidTag', `Closing tag '${tagName}' without opening tag`, xml, tagStart - 2)

      const expectedTag = tagStack[tagStack.length - 1]
      if (expectedTag !== tagName) {
        // Check if it's an unpaired tag
        if (unpairedSet.has(tagName))
          continue
        return makeError('InvalidTag', `Expected closing tag '${expectedTag}' but found '${tagName}'`, xml, tagStart - 2)
      }

      tagStack.pop()
      if (tagStack.length === 0)
        hasRoot = true
      continue
    }

    // Opening tag
    const tagStart = i
    const tagName = readName(xml, i)
    if (!tagName)
      return makeError('InvalidTag', 'Invalid tag name', xml, tagStart)
    i += tagName.length

    // Parse attributes (reuse set to avoid allocation per tag)
    attrNames.clear()
    while (i < len) {
      // Inline whitespace skip
      while (i < len) {
        const ch = xml.charCodeAt(i)
        if (ch !== 32 && ch !== 9 && ch !== 10 && ch !== 13) break
        i++
      }
      if (i >= len)
        return makeError('InvalidTag', `Unclosed opening tag '${tagName}'`, xml, tagStart - 1)

      const ch = xml.charCodeAt(i)

      // Self-closing: />
      if (ch === 47) { // /
        if (i + 1 >= len || xml.charCodeAt(i + 1) !== 62)
          return makeError('InvalidTag', `Expected '>' after '/' in tag '${tagName}'`, xml, i)
        i += 2
        if (tagStack.length === 0)
          hasRoot = true
        break
      }

      // End of opening tag: >
      if (ch === 62) { // >
        i++
        if (unpairedSet.has(tagName)) {
          if (tagStack.length === 0)
            hasRoot = true
        }
        else {
          tagStack.push(tagName)
        }
        break
      }

      // Attribute name
      const attrName = readName(xml, i)
      if (!attrName)
        return makeError('InvalidAttr', `Invalid attribute name in tag '${tagName}'`, xml, i)
      if (attrNames.has(attrName))
        return makeError('InvalidAttr', `Duplicate attribute '${attrName}' in tag '${tagName}'`, xml, i)
      attrNames.add(attrName)
      i += attrName.length
      // Inline whitespace skip
      while (i < len) {
        const wch = xml.charCodeAt(i)
        if (wch !== 32 && wch !== 9 && wch !== 10 && wch !== 13) break
        i++
      }

      if (i >= len)
        return makeError('InvalidAttr', `Unclosed tag '${tagName}'`, xml, tagStart - 1)

      // Check for = value
      if (xml.charCodeAt(i) === 61) { // =
        i++
        // Inline whitespace skip
        while (i < len) {
          const wch = xml.charCodeAt(i)
          if (wch !== 32 && wch !== 9 && wch !== 10 && wch !== 13) break
          i++
        }
        if (i >= len)
          return makeError('InvalidAttr', `Expected attribute value for '${attrName}'`, xml, i)
        const quoteChar = xml.charCodeAt(i)
        if (quoteChar !== 34 && quoteChar !== 39) // " or '
          return makeError('InvalidAttr', `Attribute value must be quoted for '${attrName}'`, xml, i)
        i++
        while (i < len && xml.charCodeAt(i) !== quoteChar)
          i++
        if (i >= len)
          return makeError('InvalidAttr', `Unclosed attribute value for '${attrName}'`, xml, i - 1)
        i++ // skip closing quote
      }
      else if (!allowBooleanAttributes) {
        return makeError('InvalidAttr', `Boolean attribute '${attrName}' not allowed`, xml, i)
      }
    }
  }

  if (tagStack.length > 0)
    return makeError('InvalidXml', `Unclosed tag '${tagStack[tagStack.length - 1]}'`, xml, len)

  return true
}
