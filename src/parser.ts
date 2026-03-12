import type { ParserOptions } from './types'
import { EntityDecoder } from './entities'
import { defaultParserOptions } from './types'

// Inline helpers for performance
function isWhitespace(ch: number): boolean {
  return ch === 32 || ch === 9 || ch === 10 || ch === 13
}

function isNameStartChar(ch: number): boolean {
  return (ch >= 65 && ch <= 90)
    || (ch >= 97 && ch <= 122)
    || ch === 95
    || ch === 58
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
    || ch === 45
    || ch === 46
    || (ch >= 48 && ch <= 57)
    || ch === 0xB7
    || (ch >= 0x0300 && ch <= 0x036F)
    || (ch >= 0x203F && ch <= 0x2040)
}

// Pre-compiled regexes for parseValue
const RE_HEX = /^0x[\da-fA-F]+$/
const RE_SCIENTIFIC = /^[+-]?\d+(\.\d+)?[eE][+-]?\d+$/
const RE_NUMBER = /^[+-]?(\d+\.?\d*|\.\d+)$/

// CDATA check via charCodes: [CDATA[
function isCDATA(xml: string, pos: number): boolean {
  return xml.charCodeAt(pos) === 91      // [
    && xml.charCodeAt(pos + 1) === 67    // C
    && xml.charCodeAt(pos + 2) === 68    // D
    && xml.charCodeAt(pos + 3) === 65    // A
    && xml.charCodeAt(pos + 4) === 84    // T
    && xml.charCodeAt(pos + 5) === 65    // A
    && xml.charCodeAt(pos + 6) === 91    // [
}

// DOCTYPE check via charCodes
function isDOCTYPE(xml: string, pos: number): boolean {
  const c0 = xml.charCodeAt(pos)
  const c1 = xml.charCodeAt(pos + 1)
  const c2 = xml.charCodeAt(pos + 2)
  const c3 = xml.charCodeAt(pos + 3)
  const c4 = xml.charCodeAt(pos + 4)
  const c5 = xml.charCodeAt(pos + 5)
  const c6 = xml.charCodeAt(pos + 6)
  return (c0 === 68 || c0 === 100)    // D/d
    && (c1 === 79 || c1 === 111)      // O/o
    && (c2 === 67 || c2 === 99)       // C/c
    && (c3 === 84 || c3 === 116)      // T/t
    && (c4 === 89 || c4 === 121)      // Y/y
    && (c5 === 80 || c5 === 112)      // P/p
    && (c6 === 69 || c6 === 101)      // E/e
}

// Read a tag/attribute name, return end position. Returns start if no valid name.
function readNameEnd(xml: string, pos: number, len: number): number {
  if (pos >= len || !isNameStartChar(xml.charCodeAt(pos)))
    return pos
  pos++
  while (pos < len && isNameChar(xml.charCodeAt(pos)))
    pos++
  return pos
}

export class XMLParser {
  private options: ParserOptions
  private entityDecoder: EntityDecoder
  private unpairedSet: Set<string>
  private exactStopNodes: Set<string>
  private wildcardStopSuffixes: string[]
  // Whether jPath needs to be computed (only if callbacks/stopNodes use it)
  private needsJPath: boolean

  // Cached hot options as instance properties (set once, not per recursive call)
  private _ignoreAttributes: boolean = true
  private _textNodeName: string = '#text'
  private _commentPropName: string | false = false
  private _cdataPropName: string | false = false
  private _piPropName: string | false = false
  private _alwaysCreateTextNode: boolean = false
  private _trimValues: boolean = true
  private _processEntities: boolean = true
  private _parseTagValue: boolean = true
  private _parseAttributeValue: boolean = false
  private _removeNSPrefix: boolean = false
  private _attrPrefix: string = '@_'
  private _attrsGroupName: string | false = false
  private _ignorePiTags: boolean = false
  private _ignoreDeclaration: boolean = false

  constructor(options?: Partial<ParserOptions>) {
    this.options = { ...defaultParserOptions, ...options }
    this.entityDecoder = new EntityDecoder(this.options.htmlEntities)
    this.unpairedSet = new Set(this.options.unpairedTags)
    this.exactStopNodes = new Set()
    this.wildcardStopSuffixes = []
    for (const stopNode of this.options.stopNodes) {
      if (stopNode.startsWith('*.')) {
        this.wildcardStopSuffixes.push(stopNode.substring(2))
      }
      else {
        this.exactStopNodes.add(stopNode)
      }
    }
    // Cache options
    this._ignoreAttributes = this.options.ignoreAttributes
    this._textNodeName = this.options.textNodeName
    this._commentPropName = this.options.commentPropName
    this._cdataPropName = this.options.cdataPropName
    this._piPropName = this.options.piPropName
    this._alwaysCreateTextNode = this.options.alwaysCreateTextNode
    this._trimValues = this.options.trimValues
    this._processEntities = this.options.processEntities
    this._parseTagValue = this.options.parseTagValue
    this._parseAttributeValue = this.options.parseAttributeValue
    this._removeNSPrefix = this.options.removeNSPrefix
    this._attrPrefix = this.options.attributeNamePrefix
    this._attrsGroupName = this.options.attributesGroupName
    this._ignorePiTags = this.options.ignorePiTags
    this._ignoreDeclaration = this.options.ignoreDeclaration
    // Only compute jPath if something actually uses it
    this.needsJPath = this.options.stopNodes.length > 0
      || this.options.isArray !== undefined
      || this.options.updateTag !== undefined
      || this.options.tagValueProcessor !== undefined
      || this.options.attributeValueProcessor !== undefined
  }

  addEntity(name: string, value: string): void {
    this.entityDecoder.addEntity(name, value)
  }

  parse(xmlData: string | Uint8Array): any {
    if (xmlData instanceof Uint8Array) {
      xmlData = new TextDecoder().decode(xmlData)
    }

    const xml = xmlData as string
    if (this.options.preserveOrder) {
      return this.parseOrdered(xml)
    }
    return this.parseUnordered(xml)
  }

  private parseUnordered(xml: string): Record<string, unknown> {
    const result: Record<string, unknown> = {}
    const len = xml.length
    let i = 0
    if (len > 0 && xml.charCodeAt(0) === 0xFEFF)
      i = 1
    i = this.parseChildren(xml, i, len, result, '', [])
    return result
  }

  private parseOrdered(xml: string): any {
    const len = xml.length
    let i = 0
    if (len > 0 && xml.charCodeAt(0) === 0xFEFF)
      i = 1
    const result: any[] = []
    this.parseChildrenOrdered(xml, i, len, result, '')
    return result
  }

  private readTagName(xml: string, pos: number, len: number): number {
    const end = readNameEnd(xml, pos, len)
    return end
  }

  private extractTagName(xml: string, start: number, end: number): string {
    let name = xml.substring(start, end)
    if (this._removeNSPrefix) {
      const colonIdx = name.indexOf(':')
      if (colonIdx !== -1)
        name = name.substring(colonIdx + 1)
    }
    if (this.options.transformTagName)
      name = this.options.transformTagName(name)
    return name
  }

  private parseAttributes(xml: string, pos: number, len: number, jPath: string, outAttrs: Record<string, string>): number {
    let count = 0
    const removeNS = this._removeNSPrefix
    const transformAttr = this.options.transformAttributeName
    const trimVals = this._trimValues
    const processEnts = this._processEntities
    const attrProcessor = this.options.attributeValueProcessor

    while (pos < len) {
      // Inline whitespace skip
      let ch = xml.charCodeAt(pos)
      while (ch === 32 || ch === 9 || ch === 10 || ch === 13) {
        pos++
        if (pos >= len) break
        ch = xml.charCodeAt(pos)
      }
      if (pos >= len)
        break
      if (ch === 62 || ch === 47) // > or /
        break

      // Read attribute name
      const attrStart = pos
      if (!isNameStartChar(ch))
        break
      pos++
      while (pos < len && isNameChar(xml.charCodeAt(pos)))
        pos++
      let attrName = xml.substring(attrStart, pos)
      if (removeNS) {
        const colonIdx = attrName.indexOf(':')
        if (colonIdx !== -1)
          attrName = attrName.substring(colonIdx + 1)
      }
      if (transformAttr)
        attrName = transformAttr(attrName)

      // Skip whitespace
      while (pos < len && isWhitespace(xml.charCodeAt(pos)))
        pos++

      // Check for =
      if (pos < len && xml.charCodeAt(pos) === 61) { // =
        pos++
        while (pos < len && isWhitespace(xml.charCodeAt(pos)))
          pos++
        if (pos >= len)
          break
        const quoteChar = xml.charCodeAt(pos)
        if (quoteChar === 34 || quoteChar === 39) { // " or '
          pos++
          const valueStart = pos
          while (pos < len && xml.charCodeAt(pos) !== quoteChar)
            pos++
          let value = xml.substring(valueStart, pos)
          if (trimVals && value.length > 0) {
            const f = value.charCodeAt(0)
            const l = value.charCodeAt(value.length - 1)
            if (f <= 32 || l <= 32)
              value = value.trim()
          }
          if (processEnts)
            value = this.entityDecoder.decodeEntities(value)
          if (attrProcessor)
            value = attrProcessor(attrName, value, jPath) ?? value
          outAttrs[attrName] = value
          count++
          if (pos < len)
            pos++ // skip closing quote
        }
      }
      else {
        // Boolean attribute
        outAttrs[attrName] = 'true'
        count++
      }
    }

    // Return pos, encode count into sign: negative means hasAttrs
    return count > 0 ? -pos - 1 : pos
  }

  private processTagValue(value: string, tagName: string, jPath: string, hasAttributes: boolean, isLeaf: boolean): unknown {
    if (this._trimValues) {
      const vlen = value.length
      if (vlen > 0) {
        const first = value.charCodeAt(0)
        const last = value.charCodeAt(vlen - 1)
        if (first <= 32 || last <= 32)
          value = value.trim()
      }
    }
    if (this._processEntities)
      value = this.entityDecoder.decodeEntities(value)
    if (this.options.tagValueProcessor) {
      const processed = this.options.tagValueProcessor(tagName, value, jPath, hasAttributes, isLeaf)
      if (processed !== undefined)
        value = processed
    }
    if (!value)
      return value
    if (this._parseTagValue)
      return this.parseValue(value)
    return value
  }

  private parseValue(val: string): unknown {
    if (val === 'true')
      return true
    if (val === 'false')
      return false
    if (!val)
      return val

    // Fast reject: if first char can't start a number, skip all numeric parsing
    const firstCh = val.charCodeAt(0)
    const isNumStart = (firstCh >= 48 && firstCh <= 57) // 0-9
      || firstCh === 43 || firstCh === 45 || firstCh === 46 // + - .
    if (!isNumStart)
      return val

    const opts = this.options.numberParseOptions
    if (opts.skipLike?.test(val))
      return val

    // Hex
    if (opts.hex && firstCh === 48 && RE_HEX.test(val))
      return Number.parseInt(val, 16)

    // Leading zeros check
    if (val.length > 1 && firstCh === 48 && val.charCodeAt(1) !== 46) {
      if (opts.leadingZeros)
        return val
    }

    // Scientific notation
    if (opts.scientific && RE_SCIENTIFIC.test(val)) {
      const num = Number(val)
      if (!Number.isNaN(num))
        return num
    }

    // Regular number
    if (RE_NUMBER.test(val)) {
      const num = Number(val)
      if (!Number.isNaN(num))
        return num
    }

    return val
  }

  private parseAttributeValue(val: string): unknown {
    if (!this._parseAttributeValue)
      return val
    return this.parseValue(val)
  }

  private isStopNode(jPath: string): boolean {
    if (this.exactStopNodes.has(jPath))
      return true
    for (const suffix of this.wildcardStopSuffixes) {
      if (jPath.endsWith('.' + suffix) || jPath === suffix)
        return true
    }
    return false
  }

  private readStopNodeContent(xml: string, pos: number, len: number, tagName: string): { content: string, pos: number } {
    const closingTag = '</' + tagName
    const idx = xml.indexOf(closingTag, pos)
    if (idx === -1) {
      return { content: xml.substring(pos), pos: len }
    }
    const content = xml.substring(pos, idx)
    let endPos = idx + closingTag.length
    while (endPos < len && xml.charCodeAt(endPos) !== 62)
      endPos++
    if (endPos < len)
      endPos++
    return { content, pos: endPos }
  }

  private addToObj(obj: Record<string, unknown>, key: string, value: unknown, jPath: string, isLeaf: boolean, isAttribute: boolean): void {
    const existing = obj[key]
    if (existing !== undefined) {
      if (!Array.isArray(existing)) {
        obj[key] = [existing, value]
      }
      else {
        (existing as unknown[]).push(value)
      }
    }
    else if (this.options.isArray?.(key, jPath, isLeaf, isAttribute)) {
      obj[key] = [value]
    }
    else {
      obj[key] = value
    }
  }

  private flushText(
    textContent: string,
    cdataBuffer: string,
    jPath: string,
    parent: Record<string, unknown>,
  ): void {
    if (!textContent && !cdataBuffer)
      return

    const textNodeName = this._textNodeName

    if (cdataBuffer) {
      let decodedText = textContent
      if (decodedText && this._processEntities)
        decodedText = this.entityDecoder.decodeEntities(decodedText)
      let value = cdataBuffer + decodedText
      if (this._trimValues && value.length > 0) {
        const f = value.charCodeAt(0)
        const l = value.charCodeAt(value.length - 1)
        if (f <= 32 || l <= 32)
          value = value.trim()
      }
      if (this.options.tagValueProcessor) {
        const processed = this.options.tagValueProcessor(textNodeName, value, jPath, false, true)
        if (processed !== undefined)
          value = processed
      }
      if (value) {
        const parsed = this._parseTagValue ? this.parseValue(value) : value
        if (parsed !== undefined && parsed !== '')
          this.addToObj(parent, textNodeName, parsed, jPath, true, false)
      }
    }
    else {
      const processed = this.processTagValue(textContent, textNodeName, jPath, false, true)
      if (processed !== undefined && processed !== '')
        this.addToObj(parent, textNodeName, processed, jPath, true, false)
    }
  }

  private parseChildren(xml: string, pos: number, len: number, parent: Record<string, unknown>, jPath: string, unpairedStack: string[]): number {
    let textContent = ''
    let cdataBuffer = ''
    const needsJPath = this.needsJPath

    while (pos < len) {
      const ch = xml.charCodeAt(pos)

      if (ch !== 60) { // Not <
        const textStart = pos
        pos++
        while (pos < len && xml.charCodeAt(pos) !== 60)
          pos++
        if (!textContent)
          textContent = xml.substring(textStart, pos)
        else
          textContent += xml.substring(textStart, pos)
        continue
      }

      if (pos + 1 >= len)
        break

      const nextCh = xml.charCodeAt(pos + 1)

      // Comment: <!--
      if (nextCh === 33 && pos + 3 < len && xml.charCodeAt(pos + 2) === 45 && xml.charCodeAt(pos + 3) === 45) {
        if (textContent || cdataBuffer) {
          this.flushText(textContent, cdataBuffer, jPath, parent)
          textContent = ''
          cdataBuffer = ''
        }
        pos += 4
        const endComment = xml.indexOf('-->', pos)
        if (endComment === -1) {
          pos = len
          break
        }
        if (this._commentPropName) {
          const comment = xml.substring(pos, endComment)
          this.addToObj(parent, this._commentPropName, comment, jPath, true, false)
        }
        pos = endComment + 3
        continue
      }

      // CDATA: <![CDATA[
      if (nextCh === 33 && pos + 8 < len && isCDATA(xml, pos + 2)) {
        pos += 9
        const endCdata = xml.indexOf(']]>', pos)
        if (endCdata === -1) {
          pos = len
          break
        }
        const cdataContent = xml.substring(pos, endCdata)
        if (this._cdataPropName) {
          this.flushText(textContent, cdataBuffer, jPath, parent)
          textContent = ''
          cdataBuffer = ''
          this.addToObj(parent, this._cdataPropName, cdataContent, jPath, true, false)
        }
        else {
          if (textContent) {
            let decoded = textContent
            if (this._processEntities)
              decoded = this.entityDecoder.decodeEntities(decoded)
            cdataBuffer += decoded
            textContent = ''
          }
          cdataBuffer += cdataContent
        }
        pos = endCdata + 3
        continue
      }

      // DOCTYPE: <!DOCTYPE
      if (nextCh === 33 && pos + 9 < len && isDOCTYPE(xml, pos + 2)) {
        pos += 9
        let depth = 1
        while (pos < len && depth > 0) {
          const c = xml.charCodeAt(pos)
          if (c === 60) depth++
          else if (c === 62) depth--
          pos++
        }
        continue
      }

      // Processing instruction: <?
      if (nextCh === 63) { // ?
        pos += 2
        const piNameStart = pos
        while (pos < len && !isWhitespace(xml.charCodeAt(pos)) && xml.charCodeAt(pos) !== 63)
          pos++
        const piTarget = xml.substring(piNameStart, pos)
        const endPi = xml.indexOf('?>', pos)
        if (endPi === -1) {
          pos = len
          break
        }
        const piContent = xml.substring(pos, endPi).trim()

        if (piTarget === 'xml') {
          if (!this._ignoreDeclaration && this._piPropName) {
            const declAttrs = this.parsePiAttributes(piContent)
            this.addToObj(parent, this._piPropName, { [piTarget]: declAttrs }, jPath, true, false)
          }
        }
        else if (!this._ignorePiTags && this._piPropName) {
          this.addToObj(parent, this._piPropName, { [piTarget]: piContent }, jPath, true, false)
        }

        pos = endPi + 2
        continue
      }

      // Closing tag: </
      if (nextCh === 47) { // /
        if (textContent || cdataBuffer) {
          this.flushText(textContent, cdataBuffer, jPath, parent)
          textContent = ''
          cdataBuffer = ''
        }

        pos += 2
        const nameStart = pos
        const nameEnd = this.readTagName(xml, pos, len)
        const closingName = this.extractTagName(xml, nameStart, nameEnd)
        pos = nameEnd
        while (pos < len && isWhitespace(xml.charCodeAt(pos)))
          pos++
        if (pos < len && xml.charCodeAt(pos) === 62)
          pos++

        if (unpairedStack.length > 0 && unpairedStack[unpairedStack.length - 1] === closingName) {
          unpairedStack.pop()
          continue
        }

        return pos
      }

      // Opening tag
      if (textContent || cdataBuffer) {
        this.flushText(textContent, cdataBuffer, jPath, parent)
        textContent = ''
        cdataBuffer = ''
      }

      pos++ // skip <
      const nameStart = pos
      const nameEnd = this.readTagName(xml, pos, len)
      const tagName = this.extractTagName(xml, nameStart, nameEnd)
      if (!tagName) {
        pos = nameEnd + 1
        continue
      }
      pos = nameEnd

      const childJPath = needsJPath ? (jPath ? jPath + '.' + tagName : tagName) : ''

      // Parse attributes
      let attrs: Record<string, string> = {} as Record<string, string>
      let hasAttrs = false
      if (!this._ignoreAttributes) {
        const attrResult = this.parseAttributes(xml, pos, len, childJPath, attrs)
        if (attrResult < 0) {
          pos = -attrResult - 1
          hasAttrs = true
        }
        else {
          pos = attrResult
        }
      }
      else {
        while (pos < len) {
          const c = xml.charCodeAt(pos)
          if (c === 62 || c === 47) break
          if (c === 34 || c === 39) {
            pos++
            while (pos < len && xml.charCodeAt(pos) !== c)
              pos++
          }
          pos++
        }
      }

      // Check for updateTag
      if (this.options.updateTag) {
        const newName = this.options.updateTag(tagName, childJPath, attrs)
        if (newName === false) {
          while (pos < len && isWhitespace(xml.charCodeAt(pos)))
            pos++
          if (pos < len && xml.charCodeAt(pos) === 47) {
            pos += 2
          }
          else if (pos < len && xml.charCodeAt(pos) === 62) {
            pos++
            const closingTag = '</' + tagName + '>'
            const closeIdx = xml.indexOf(closingTag, pos)
            if (closeIdx !== -1)
              pos = closeIdx + closingTag.length
          }
          continue
        }
      }

      // Inline whitespace skip
      while (pos < len && isWhitespace(xml.charCodeAt(pos)))
        pos++

      // Self-closing tag: />
      if (pos < len && xml.charCodeAt(pos) === 47) { // /
        pos += 2
        if (hasAttrs || this._alwaysCreateTextNode) {
          const childObj: Record<string, unknown> = {}
          if (hasAttrs)
            this.applyAttributes(childObj, attrs, childJPath)
          if (this._alwaysCreateTextNode)
            childObj[this._textNodeName] = ''
          this.addToObj(parent, tagName, childObj, childJPath, true, false)
        }
        else {
          this.addToObj(parent, tagName, '', childJPath, true, false)
        }
        continue
      }

      // Regular opening tag: >
      if (pos < len && xml.charCodeAt(pos) === 62) {
        pos++

        // Unpaired tag
        if (this.unpairedSet.has(tagName)) {
          if (hasAttrs) {
            const childObj: Record<string, unknown> = {}
            this.applyAttributes(childObj, attrs, childJPath)
            this.addToObj(parent, tagName, childObj, childJPath, true, false)
          }
          else {
            this.addToObj(parent, tagName, '', childJPath, true, false)
          }
          unpairedStack.push(tagName)
          continue
        }

        // Stop node
        if (this.exactStopNodes.size > 0 || this.wildcardStopSuffixes.length > 0) {
          if (this.isStopNode(childJPath)) {
            const stopResult = this.readStopNodeContent(xml, pos, len, tagName)
            const childObj: Record<string, unknown> = {}
            if (hasAttrs)
              this.applyAttributes(childObj, attrs, childJPath)
            if (stopResult.content)
              childObj[this._textNodeName] = stopResult.content
            this.addToObj(parent, tagName, childObj, childJPath, true, false)
            pos = stopResult.pos
            continue
          }
        }

        // Regular element — parse children
        const childObj: Record<string, unknown> = {}
        if (hasAttrs)
          this.applyAttributes(childObj, attrs, childJPath)

        pos = this.parseChildren(xml, pos, len, childObj, childJPath, unpairedStack)

        // Determine if this is a leaf (only has text content)
        const textNodeName = this._textNodeName
        const textValue = childObj[textNodeName]
        if (!hasAttrs && !this._alwaysCreateTextNode) {
          // Check if childObj has only textNodeName or is empty
          let isLeaf = true
          for (const k in childObj) {
            if (k !== textNodeName) {
              isLeaf = false
              break
            }
          }
          if (isLeaf) {
            this.addToObj(parent, tagName, textValue !== undefined ? textValue : '', childJPath, true, false)
            continue
          }
        }
        this.addToObj(parent, tagName, childObj, childJPath, false, false)
      }
    }

    if (textContent || cdataBuffer) {
      this.flushText(textContent, cdataBuffer, jPath, parent)
    }

    return pos
  }

  private parseChildrenOrdered(xml: string, pos: number, len: number, parent: any[], jPath: string): number {
    let textContent = ''
    const needsJPath = this.needsJPath

    while (pos < len) {
      const ch = xml.charCodeAt(pos)

      if (ch !== 60) {
        const textStart = pos
        pos++
        while (pos < len && xml.charCodeAt(pos) !== 60)
          pos++
        if (!textContent)
          textContent = xml.substring(textStart, pos)
        else
          textContent += xml.substring(textStart, pos)
        continue
      }

      if (pos + 1 >= len)
        break

      const nextCh = xml.charCodeAt(pos + 1)

      // Comment
      if (nextCh === 33 && pos + 3 < len && xml.charCodeAt(pos + 2) === 45 && xml.charCodeAt(pos + 3) === 45) {
        if (textContent) {
          const processed = this.processTagValue(textContent, this._textNodeName, jPath, false, true)
          if (processed !== undefined && processed !== '')
            parent.push({ [this._textNodeName]: processed })
          textContent = ''
        }
        pos += 4
        const endComment = xml.indexOf('-->', pos)
        if (endComment === -1) { pos = len; break }
        if (this._commentPropName) {
          parent.push({ [this._commentPropName]: [{ [this._textNodeName]: xml.substring(pos, endComment) }] })
        }
        pos = endComment + 3
        continue
      }

      // CDATA
      if (nextCh === 33 && pos + 8 < len && isCDATA(xml, pos + 2)) {
        pos += 9
        const endCdata = xml.indexOf(']]>', pos)
        if (endCdata === -1) { pos = len; break }
        const cdataContent = xml.substring(pos, endCdata)
        if (this._cdataPropName) {
          if (textContent) {
            const processed = this.processTagValue(textContent, this._textNodeName, jPath, false, true)
            if (processed !== undefined && processed !== '')
              parent.push({ [this._textNodeName]: processed })
            textContent = ''
          }
          parent.push({ [this._cdataPropName]: [{ [this._textNodeName]: cdataContent }] })
        }
        else {
          textContent += cdataContent
        }
        pos = endCdata + 3
        continue
      }

      // DOCTYPE
      if (nextCh === 33 && pos + 9 < len && isDOCTYPE(xml, pos + 2)) {
        pos += 9
        let depth = 1
        while (pos < len && depth > 0) {
          const c = xml.charCodeAt(pos)
          if (c === 60) depth++
          else if (c === 62) depth--
          pos++
        }
        continue
      }

      // PI
      if (nextCh === 63) {
        pos += 2
        const endPi = xml.indexOf('?>', pos)
        if (endPi === -1) { pos = len; break }
        pos = endPi + 2
        continue
      }

      // Closing tag
      if (nextCh === 47) {
        if (textContent) {
          const processed = this.processTagValue(textContent, this._textNodeName, jPath, false, true)
          if (processed !== undefined && processed !== '')
            parent.push({ [this._textNodeName]: processed })
          textContent = ''
        }
        pos += 2
        const nameEnd = this.readTagName(xml, pos, len)
        pos = nameEnd
        while (pos < len && isWhitespace(xml.charCodeAt(pos)))
          pos++
        if (pos < len && xml.charCodeAt(pos) === 62) pos++
        return pos
      }

      // Opening tag
      if (textContent) {
        const processed = this.processTagValue(textContent, this._textNodeName, jPath, false, true)
        if (processed !== undefined && processed !== '')
          parent.push({ [this._textNodeName]: processed })
        textContent = ''
      }

      pos++
      const nameStart = pos
      const nameEnd = this.readTagName(xml, pos, len)
      const tagName = this.extractTagName(xml, nameStart, nameEnd)
      if (!tagName) { pos = nameEnd + 1; continue }
      pos = nameEnd

      const childJPath = needsJPath ? (jPath ? jPath + '.' + tagName : tagName) : ''

      let attrs: Record<string, string> = {} as Record<string, string>
      let hasAttrs = false
      if (!this._ignoreAttributes) {
        const attrResult = this.parseAttributes(xml, pos, len, childJPath, attrs)
        if (attrResult < 0) {
          pos = -attrResult - 1
          hasAttrs = true
        }
        else {
          pos = attrResult
        }
      }
      else {
        while (pos < len) {
          const c = xml.charCodeAt(pos)
          if (c === 62 || c === 47) break
          if (c === 34 || c === 39) {
            pos++
            while (pos < len && xml.charCodeAt(pos) !== c)
              pos++
          }
          pos++
        }
      }

      while (pos < len && isWhitespace(xml.charCodeAt(pos)))
        pos++

      const orderedNode: any = { [tagName]: [] }
      if (hasAttrs) {
        const attrKey = ':@'
        orderedNode[attrKey] = {}
        for (const name in attrs) {
          orderedNode[attrKey][this._attrPrefix + name] = this.parseAttributeValue(attrs[name])
        }
      }

      if (pos < len && xml.charCodeAt(pos) === 47) { // self-closing
        pos += 2
        parent.push(orderedNode)
        continue
      }

      if (pos < len && xml.charCodeAt(pos) === 62) {
        pos++
        pos = this.parseChildrenOrdered(xml, pos, len, orderedNode[tagName], childJPath)
        parent.push(orderedNode)
      }
    }

    if (textContent) {
      const processed = this.processTagValue(textContent, this._textNodeName, jPath, false, true)
      if (processed !== undefined && processed !== '')
        parent.push({ [this._textNodeName]: processed })
    }

    return pos
  }

  private applyAttributes(obj: Record<string, unknown>, attrs: Record<string, string>, jPath: string): void {
    const prefix = this._attrPrefix
    if (this._attrsGroupName) {
      const group: Record<string, unknown> = {}
      for (const name in attrs) {
        group[prefix + name] = this.parseAttributeValue(attrs[name])
      }
      obj[this._attrsGroupName] = group
    }
    else {
      for (const name in attrs) {
        obj[prefix + name] = this.parseAttributeValue(attrs[name])
      }
    }
  }

  private parsePiAttributes(content: string): Record<string, string> {
    const attrs: Record<string, string> = {}
    let i = 0
    const len = content.length

    while (i < len) {
      while (i < len && isWhitespace(content.charCodeAt(i)))
        i++
      if (i >= len)
        break

      const nameStart = i
      while (i < len && !isWhitespace(content.charCodeAt(i)) && content.charCodeAt(i) !== 61)
        i++
      const name = content.substring(nameStart, i)
      if (!name)
        break

      while (i < len && isWhitespace(content.charCodeAt(i)))
        i++

      if (i < len && content.charCodeAt(i) === 61) { // =
        i++
        while (i < len && isWhitespace(content.charCodeAt(i)))
          i++
        if (i < len) {
          const quote = content.charCodeAt(i)
          if (quote === 34 || quote === 39) {
            i++
            const valueStart = i
            while (i < len && content.charCodeAt(i) !== quote)
              i++
            attrs[name] = content.substring(valueStart, i)
            if (i < len)
              i++
          }
        }
      }
    }
    return attrs
  }
}
