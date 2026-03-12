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

export class XMLParser {
  private options: ParserOptions
  private entityDecoder: EntityDecoder

  constructor(options?: Partial<ParserOptions>) {
    this.options = { ...defaultParserOptions, ...options }
    this.entityDecoder = new EntityDecoder(this.options.htmlEntities)
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

    // Skip BOM
    if (len > 0 && xml.charCodeAt(0) === 0xFEFF)
      i = 1

    i = this.parseChildren(xml, i, len, result, '', [])
    return result
  }

  private parseOrdered(xml: string): any {
    const len = xml.length
    let i = 0

    // Skip BOM
    if (len > 0 && xml.charCodeAt(0) === 0xFEFF)
      i = 1

    const result: any[] = []
    this.parseChildrenOrdered(xml, i, len, result, '')
    return result
  }

  private readTagName(xml: string, pos: number, len: number): [string, number] {
    const start = pos
    if (pos >= len || !isNameStartChar(xml.charCodeAt(pos)))
      return ['', pos]
    pos++
    while (pos < len && isNameChar(xml.charCodeAt(pos)))
      pos++
    let name = xml.substring(start, pos)
    if (this.options.removeNSPrefix) {
      const colonIdx = name.indexOf(':')
      if (colonIdx !== -1)
        name = name.substring(colonIdx + 1)
    }
    if (this.options.transformTagName)
      name = this.options.transformTagName(name)
    return [name, pos]
  }

  private skipWhitespace(xml: string, pos: number, len: number): number {
    while (pos < len && isWhitespace(xml.charCodeAt(pos)))
      pos++
    return pos
  }

  private parseAttributes(xml: string, pos: number, len: number, jPath: string): [Record<string, string>, number] {
    const attrs: Record<string, string> = {}

    while (pos < len) {
      pos = this.skipWhitespace(xml, pos, len)
      if (pos >= len)
        break
      const ch = xml.charCodeAt(pos)
      if (ch === 62 || ch === 47) // > or /
        break

      // Read attribute name
      const attrStart = pos
      if (!isNameStartChar(xml.charCodeAt(pos)))
        break
      pos++
      while (pos < len && isNameChar(xml.charCodeAt(pos)))
        pos++
      let attrName = xml.substring(attrStart, pos)
      if (this.options.removeNSPrefix) {
        const colonIdx = attrName.indexOf(':')
        if (colonIdx !== -1)
          attrName = attrName.substring(colonIdx + 1)
      }
      if (this.options.transformAttributeName)
        attrName = this.options.transformAttributeName(attrName)

      pos = this.skipWhitespace(xml, pos, len)

      // Check for =
      if (pos < len && xml.charCodeAt(pos) === 61) { // =
        pos++
        pos = this.skipWhitespace(xml, pos, len)
        if (pos >= len)
          break
        const quoteChar = xml.charCodeAt(pos)
        if (quoteChar === 34 || quoteChar === 39) { // " or '
          pos++
          const valueStart = pos
          while (pos < len && xml.charCodeAt(pos) !== quoteChar)
            pos++
          let value = xml.substring(valueStart, pos)
          if (this.options.trimValues)
            value = value.trim()
          if (this.options.processEntities)
            value = this.entityDecoder.decodeEntities(value)
          if (this.options.attributeValueProcessor)
            value = this.options.attributeValueProcessor(attrName, value, jPath) ?? value
          attrs[attrName] = value
          if (pos < len)
            pos++ // skip closing quote
        }
      }
      else {
        // Boolean attribute
        attrs[attrName] = 'true'
      }
    }

    return [attrs, pos]
  }

  private processTagValue(value: string, tagName: string, jPath: string, hasAttributes: boolean, isLeaf: boolean): unknown {
    if (this.options.trimValues)
      value = value.trim()
    if (this.options.processEntities)
      value = this.entityDecoder.decodeEntities(value)
    if (this.options.tagValueProcessor) {
      const processed = this.options.tagValueProcessor(tagName, value, jPath, hasAttributes, isLeaf)
      if (processed !== undefined)
        value = processed
    }
    if (!value)
      return value
    if (this.options.parseTagValue)
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

    const opts = this.options.numberParseOptions
    if (opts.skipLike?.test(val))
      return val

    // Hex
    if (opts.hex && /^0x[\da-fA-F]+$/.test(val))
      return Number.parseInt(val, 16)

    // Leading zeros check - treat as string to preserve leading zeros
    if (val.length > 1 && val.charCodeAt(0) === 48 && val.charCodeAt(1) !== 46) {
      if (opts.leadingZeros)
        return val // preserve as string
      // else parse as number
    }

    // Scientific notation
    if (opts.scientific && /^[+-]?\d+(\.\d+)?[eE][+-]?\d+$/.test(val)) {
      const num = Number(val)
      if (!Number.isNaN(num))
        return num
    }

    // Regular number
    if (/^[+-]?(\d+\.?\d*|\.\d+)$/.test(val)) {
      const num = Number(val)
      if (!Number.isNaN(num))
        return num
    }

    return val
  }

  private parseAttributeValue(val: string): unknown {
    if (!this.options.parseAttributeValue)
      return val
    return this.parseValue(val)
  }

  private isStopNode(jPath: string): boolean {
    for (const stopNode of this.options.stopNodes) {
      if (stopNode === jPath)
        return true
      // Wildcard match: e.g., "*.script"
      if (stopNode.startsWith('*.')) {
        const suffix = stopNode.substring(2)
        if (jPath.endsWith(`.${suffix}`) || jPath === suffix)
          return true
      }
    }
    return false
  }

  private readStopNodeContent(xml: string, pos: number, len: number, tagName: string): [string, number] {
    const closingTag = `</${tagName}`
    const idx = xml.indexOf(closingTag, pos)
    if (idx === -1)
      return [xml.substring(pos), len]
    const content = xml.substring(pos, idx)
    // Skip past closing tag
    let endPos = idx + closingTag.length
    while (endPos < len && xml.charCodeAt(endPos) !== 62)
      endPos++
    if (endPos < len)
      endPos++ // skip >
    return [content, endPos]
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
    textNodeName: string,
    jPath: string,
    parent: Record<string, unknown>,
  ): void {
    if (!textContent && !cdataBuffer)
      return

    let value: string
    if (cdataBuffer) {
      // Merge: decode remaining regular text, concat with pre-built buffer
      let decodedText = textContent
      if (decodedText && this.options.processEntities)
        decodedText = this.entityDecoder.decodeEntities(decodedText)
      value = cdataBuffer + decodedText
      if (this.options.trimValues)
        value = value.trim()
      if (this.options.tagValueProcessor) {
        const processed = this.options.tagValueProcessor(textNodeName, value, jPath, false, true)
        if (processed !== undefined)
          value = processed
      }
      if (value) {
        const parsed = this.options.parseTagValue ? this.parseValue(value) : value
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
    let cdataBuffer = '' // pre-decoded text + raw CDATA content
    const textNodeName = this.options.textNodeName

    while (pos < len) {
      const ch = xml.charCodeAt(pos)

      if (ch !== 60) { // Not <
        textContent += xml[pos]
        pos++
        continue
      }

      // We have <
      if (pos + 1 >= len)
        break

      const nextCh = xml.charCodeAt(pos + 1)

      // Comment: <!--
      if (nextCh === 33 && pos + 3 < len && xml.charCodeAt(pos + 2) === 45 && xml.charCodeAt(pos + 3) === 45) {
        // Flush text
        if (textContent || cdataBuffer) {
          this.flushText(textContent, cdataBuffer, textNodeName, jPath, parent)
          textContent = ''
          cdataBuffer = ''
        }

        pos += 4
        const endComment = xml.indexOf('-->', pos)
        if (endComment === -1) {
          pos = len
          break
        }
        if (this.options.commentPropName) {
          const comment = xml.substring(pos, endComment)
          this.addToObj(parent, this.options.commentPropName, comment, jPath, true, false)
        }
        pos = endComment + 3
        continue
      }

      // CDATA: <![CDATA[
      if (nextCh === 33 && pos + 8 < len && xml.substring(pos + 2, pos + 9) === '[CDATA[') {
        pos += 9
        const endCdata = xml.indexOf(']]>', pos)
        if (endCdata === -1) {
          pos = len
          break
        }
        const cdataContent = xml.substring(pos, endCdata)
        if (this.options.cdataPropName) {
          // Flush text first
          this.flushText(textContent, cdataBuffer, textNodeName, jPath, parent)
          textContent = ''
          cdataBuffer = ''
          this.addToObj(parent, this.options.cdataPropName, cdataContent, jPath, true, false)
        }
        else {
          // Pre-decode any pending regular text and move to cdataBuffer
          if (textContent) {
            let decoded = textContent
            if (this.options.processEntities)
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
      if (nextCh === 33 && pos + 9 < len && xml.substring(pos + 2, pos + 9).toUpperCase() === 'DOCTYPE') {
        pos += 9
        let depth = 1
        while (pos < len && depth > 0) {
          const c = xml.charCodeAt(pos)
          if (c === 60)
            depth++
          else if (c === 62)
            depth--
          pos++
        }
        continue
      }

      // Processing instruction: <?
      if (nextCh === 63) { // ?
        pos += 2
        const piNameStart = pos
        // Read PI target name
        while (pos < len && !isWhitespace(xml.charCodeAt(pos)) && xml.charCodeAt(pos) !== 63)
          pos++
        const piTarget = xml.substring(piNameStart, pos)
        const endPi = xml.indexOf('?>', pos)
        if (endPi === -1) {
          pos = len
          break
        }
        const piContent = xml.substring(pos, endPi).trim()

        // Handle xml declaration
        if (piTarget === 'xml') {
          if (!this.options.ignoreDeclaration && this.options.piPropName) {
            const declAttrs = this.parsePiAttributes(piContent)
            this.addToObj(parent, this.options.piPropName, { [piTarget]: declAttrs }, jPath, true, false)
          }
        }
        else if (!this.options.ignorePiTags && this.options.piPropName) {
          this.addToObj(parent, this.options.piPropName, { [piTarget]: piContent }, jPath, true, false)
        }

        pos = endPi + 2
        continue
      }

      // Closing tag: </
      if (nextCh === 47) { // /
        // Flush text
        if (textContent || cdataBuffer) {
          this.flushText(textContent, cdataBuffer, textNodeName, jPath, parent)
          textContent = ''
          cdataBuffer = ''
        }

        pos += 2
        const [closingName, afterName] = this.readTagName(xml, pos, len)
        pos = afterName
        pos = this.skipWhitespace(xml, pos, len)
        if (pos < len && xml.charCodeAt(pos) === 62)
          pos++ // skip >

        // Check if it's an unpaired tag in our stack
        if (unpairedStack.length > 0 && unpairedStack[unpairedStack.length - 1] === closingName) {
          unpairedStack.pop()
          continue
        }

        return pos // Return to parent
      }

      // Opening tag
      // Flush text
      if (textContent || cdataBuffer) {
        this.flushText(textContent, cdataBuffer, textNodeName, jPath, parent)
        textContent = ''
        cdataBuffer = ''
      }

      pos++ // skip <
      const [tagName, afterTagName] = this.readTagName(xml, pos, len)
      if (!tagName) {
        pos = afterTagName + 1
        continue
      }
      pos = afterTagName

      const childJPath = jPath ? `${jPath}.${tagName}` : tagName

      // Parse attributes
      let attrs: Record<string, string> = {}
      if (!this.options.ignoreAttributes) {
        const [parsedAttrs, afterAttrs] = this.parseAttributes(xml, pos, len, childJPath)
        attrs = parsedAttrs
        pos = afterAttrs
      }
      else {
        // Skip attributes (handle quoted values containing > or /)
        while (pos < len) {
          const c = xml.charCodeAt(pos)
          if (c === 62 || c === 47) // > or /
            break
          if (c === 34 || c === 39) { // quote
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
          // Skip this tag entirely
          pos = this.skipWhitespace(xml, pos, len)
          if (pos < len && xml.charCodeAt(pos) === 47) { // self-closing
            pos += 2
          }
          else if (pos < len && xml.charCodeAt(pos) === 62) {
            pos++
            // Skip children until closing tag
            const closingTag = `</${tagName}>`
            const closeIdx = xml.indexOf(closingTag, pos)
            if (closeIdx !== -1)
              pos = closeIdx + closingTag.length
          }
          continue
        }
      }

      pos = this.skipWhitespace(xml, pos, len)

      // Self-closing tag: />
      if (pos < len && xml.charCodeAt(pos) === 47) { // /
        pos += 2 // skip />
        const childObj: Record<string, unknown> = {}

        if (!this.options.ignoreAttributes && Object.keys(attrs).length > 0) {
          this.applyAttributes(childObj, attrs, childJPath)
        }

        if (this.options.alwaysCreateTextNode) {
          childObj[textNodeName] = ''
        }

        this.addToObj(parent, tagName, Object.keys(childObj).length > 0 ? childObj : '', childJPath, true, false)
        continue
      }

      // Regular opening tag: >
      if (pos < len && xml.charCodeAt(pos) === 62) {
        pos++ // skip >

        // Unpaired tag
        if (this.options.unpairedTags.includes(tagName)) {
          const childObj: Record<string, unknown> = {}
          if (!this.options.ignoreAttributes && Object.keys(attrs).length > 0)
            this.applyAttributes(childObj, attrs, childJPath)
          this.addToObj(parent, tagName, Object.keys(childObj).length > 0 ? childObj : '', childJPath, true, false)
          unpairedStack.push(tagName)
          continue
        }

        // Stop node
        if (this.isStopNode(childJPath)) {
          const [stopContent, afterStop] = this.readStopNodeContent(xml, pos, len, tagName)
          const childObj: Record<string, unknown> = {}
          if (!this.options.ignoreAttributes && Object.keys(attrs).length > 0)
            this.applyAttributes(childObj, attrs, childJPath)
          if (stopContent) {
            childObj[textNodeName] = stopContent
          }
          this.addToObj(parent, tagName, childObj, childJPath, true, false)
          pos = afterStop
          continue
        }

        // Regular element — parse children
        const childObj: Record<string, unknown> = {}
        const hasAttrs = !this.options.ignoreAttributes && Object.keys(attrs).length > 0
        if (hasAttrs)
          this.applyAttributes(childObj, attrs, childJPath)

        pos = this.parseChildren(xml, pos, len, childObj, childJPath, unpairedStack)

        // Determine if this is a leaf (only has text content)
        const childKeys = Object.keys(childObj)
        const isLeaf = childKeys.length === 0
          || (childKeys.length === 1 && childKeys[0] === textNodeName)

        if (isLeaf && !hasAttrs && !this.options.alwaysCreateTextNode) {
          // Collapse to simple value
          const textValue = childObj[textNodeName]
          this.addToObj(parent, tagName, textValue !== undefined ? textValue : '', childJPath, true, false)
        }
        else {
          this.addToObj(parent, tagName, childObj, childJPath, false, false)
        }
      }
    }

    // Flush remaining text
    if (textContent || cdataBuffer) {
      this.flushText(textContent, cdataBuffer, textNodeName, jPath, parent)
    }

    return pos
  }

  private parseChildrenOrdered(xml: string, pos: number, len: number, parent: any[], jPath: string): number {
    let textContent = ''
    const textNodeName = this.options.textNodeName

    while (pos < len) {
      const ch = xml.charCodeAt(pos)

      if (ch !== 60) {
        textContent += xml[pos]
        pos++
        continue
      }

      if (pos + 1 >= len)
        break

      const nextCh = xml.charCodeAt(pos + 1)

      // Comment
      if (nextCh === 33 && pos + 3 < len && xml.charCodeAt(pos + 2) === 45 && xml.charCodeAt(pos + 3) === 45) {
        if (textContent) {
          const processed = this.processTagValue(textContent, textNodeName, jPath, false, true)
          if (processed !== undefined && processed !== '')
            parent.push({ [textNodeName]: processed })
          textContent = ''
        }
        pos += 4
        const endComment = xml.indexOf('-->', pos)
        if (endComment === -1) { pos = len; break }
        if (this.options.commentPropName) {
          parent.push({ [this.options.commentPropName]: [{ [textNodeName]: xml.substring(pos, endComment) }] })
        }
        pos = endComment + 3
        continue
      }

      // CDATA
      if (nextCh === 33 && pos + 8 < len && xml.substring(pos + 2, pos + 9) === '[CDATA[') {
        pos += 9
        const endCdata = xml.indexOf(']]>', pos)
        if (endCdata === -1) { pos = len; break }
        const cdataContent = xml.substring(pos, endCdata)
        if (this.options.cdataPropName) {
          if (textContent) {
            const processed = this.processTagValue(textContent, textNodeName, jPath, false, true)
            if (processed !== undefined && processed !== '')
              parent.push({ [textNodeName]: processed })
            textContent = ''
          }
          parent.push({ [this.options.cdataPropName]: [{ [textNodeName]: cdataContent }] })
        }
        else {
          textContent += cdataContent
        }
        pos = endCdata + 3
        continue
      }

      // DOCTYPE
      if (nextCh === 33 && pos + 9 < len && xml.substring(pos + 2, pos + 9).toUpperCase() === 'DOCTYPE') {
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
          const processed = this.processTagValue(textContent, textNodeName, jPath, false, true)
          if (processed !== undefined && processed !== '')
            parent.push({ [textNodeName]: processed })
          textContent = ''
        }
        pos += 2
        const [, afterName] = this.readTagName(xml, pos, len)
        pos = afterName
        pos = this.skipWhitespace(xml, pos, len)
        if (pos < len && xml.charCodeAt(pos) === 62) pos++
        return pos
      }

      // Opening tag
      if (textContent) {
        const processed = this.processTagValue(textContent, textNodeName, jPath, false, true)
        if (processed !== undefined && processed !== '')
          parent.push({ [textNodeName]: processed })
        textContent = ''
      }

      pos++
      const [tagName, afterTagName] = this.readTagName(xml, pos, len)
      if (!tagName) { pos = afterTagName + 1; continue }
      pos = afterTagName

      const childJPath = jPath ? `${jPath}.${tagName}` : tagName

      let attrs: Record<string, string> = {}
      if (!this.options.ignoreAttributes) {
        const [parsedAttrs, afterAttrs] = this.parseAttributes(xml, pos, len, childJPath)
        attrs = parsedAttrs
        pos = afterAttrs
      }
      else {
        // Skip attributes (handle quoted values containing > or /)
        while (pos < len) {
          const c = xml.charCodeAt(pos)
          if (c === 62 || c === 47) break
          if (c === 34 || c === 39) { // quote
            pos++
            while (pos < len && xml.charCodeAt(pos) !== c)
              pos++
          }
          pos++
        }
      }

      pos = this.skipWhitespace(xml, pos, len)

      const orderedNode: any = { [tagName]: [] }
      // Add attributes
      if (!this.options.ignoreAttributes && Object.keys(attrs).length > 0) {
        const attrKey = ':@'
        orderedNode[attrKey] = {}
        for (const [name, value] of Object.entries(attrs)) {
          const prefixedName = this.options.attributeNamePrefix + name
          orderedNode[attrKey][prefixedName] = this.parseAttributeValue(value)
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
      const processed = this.processTagValue(textContent, textNodeName, jPath, false, true)
      if (processed !== undefined && processed !== '')
        parent.push({ [textNodeName]: processed })
    }

    return pos
  }

  private applyAttributes(obj: Record<string, unknown>, attrs: Record<string, string>, jPath: string): void {
    if (this.options.attributesGroupName) {
      const group: Record<string, unknown> = {}
      for (const [name, value] of Object.entries(attrs)) {
        const prefixedName = this.options.attributeNamePrefix + name
        group[prefixedName] = this.parseAttributeValue(value)
      }
      obj[this.options.attributesGroupName] = group
    }
    else {
      for (const [name, value] of Object.entries(attrs)) {
        const prefixedName = this.options.attributeNamePrefix + name
        obj[prefixedName] = this.parseAttributeValue(value)
      }
    }
  }

  private parsePiAttributes(content: string): Record<string, string> {
    const attrs: Record<string, string> = {}
    let i = 0
    const len = content.length

    while (i < len) {
      // Skip whitespace
      while (i < len && isWhitespace(content.charCodeAt(i)))
        i++
      if (i >= len)
        break

      // Read name
      const nameStart = i
      while (i < len && !isWhitespace(content.charCodeAt(i)) && content.charCodeAt(i) !== 61)
        i++
      const name = content.substring(nameStart, i)
      if (!name)
        break

      // Skip whitespace
      while (i < len && isWhitespace(content.charCodeAt(i)))
        i++

      if (i < len && content.charCodeAt(i) === 61) { // =
        i++
        while (i < len && isWhitespace(content.charCodeAt(i)))
          i++
        if (i < len) {
          const quote = content.charCodeAt(i)
          if (quote === 34 || quote === 39) { // " or '
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
