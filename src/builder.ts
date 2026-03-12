import type { BuilderOptions } from './types'
import { encodeEntities } from './entities'
import { defaultBuilderOptions } from './types'

// Reusable build result to avoid allocation
const _buildResult = { xml: '', hasElements: false }
const _orderedResult = { xml: '', hasElements: false }

export class XMLBuilder {
  private options: BuilderOptions
  private indentCache: string[] = []
  private unpairedSet: Set<string>
  // Cached option values
  private _format: boolean
  private _nl: string
  private _ignoreAttributes: boolean
  private _prefix: string
  private _textNodeName: string
  private _commentPropName: string | false
  private _cdataPropName: string | false
  private _piPropName: string | false
  private _attributesGroupName: string | false
  private _suppressEmptyNode: boolean
  private _suppressBoolean: boolean
  private _suppressUnpairedNode: boolean
  private _processEntities: boolean

  constructor(options?: Partial<BuilderOptions>) {
    this.options = { ...defaultBuilderOptions, ...options }
    this.unpairedSet = new Set(this.options.unpairedTags)
    this._format = this.options.format
    this._nl = this.options.format ? '\n' : ''
    this._ignoreAttributes = this.options.ignoreAttributes
    this._prefix = this.options.attributeNamePrefix
    this._textNodeName = this.options.textNodeName
    this._commentPropName = this.options.commentPropName
    this._cdataPropName = this.options.cdataPropName
    this._piPropName = this.options.piPropName
    this._attributesGroupName = this.options.attributesGroupName
    this._suppressEmptyNode = this.options.suppressEmptyNode
    this._suppressBoolean = this.options.suppressBooleanAttributes
    this._suppressUnpairedNode = this.options.suppressUnpairedNode
    this._processEntities = this.options.processEntities
    // Pre-compute indent levels 0-16
    if (this._format) {
      for (let i = 0; i <= 16; i++) {
        this.indentCache[i] = this.options.indentBy.repeat(i)
      }
    }
  }

  private getIndent(level: number): string {
    if (!this._format) return ''
    if (level < this.indentCache.length) return this.indentCache[level]
    const indent = this.options.indentBy.repeat(level)
    this.indentCache[level] = indent
    return indent
  }

  build(obj: unknown): string {
    if (this.options.preserveOrder) {
      return this.buildOrdered(obj as any[], 0).xml
    }
    return this.buildUnordered(obj as Record<string, unknown>, 0).xml
  }

  private buildUnordered(obj: Record<string, unknown>, level: number): typeof _buildResult {
    const parts: string[] = []
    const indent = this.getIndent(level)
    const nl = this._nl
    const ignoreAttributes = this._ignoreAttributes
    const prefix = this._prefix
    const textNodeName = this._textNodeName
    const commentPropName = this._commentPropName
    const cdataPropName = this._cdataPropName
    const piPropName = this._piPropName
    const attributesGroupName = this._attributesGroupName
    let hasElements = false

    for (const key in obj) {
      if (!Object.prototype.hasOwnProperty.call(obj, key)) continue
      const value = obj[key]

      // Skip attribute keys at this level - they're handled in tag building
      if (!ignoreAttributes && prefix && key.startsWith(prefix))
        continue
      // When prefix is empty, skip primitive non-special keys (they are attributes)
      if (!ignoreAttributes && prefix === '' && typeof value !== 'object' && value !== null
        && key !== textNodeName
        && (!commentPropName || key !== commentPropName)
        && (!cdataPropName || key !== cdataPropName)
        && (!piPropName || key !== piPropName))
        continue
      if (attributesGroupName && key === attributesGroupName)
        continue

      // Comment
      if (commentPropName && key === commentPropName) {
        hasElements = true
        if (Array.isArray(value)) {
          for (const v of value) {
            parts.push(indent, '<!--', typeof v === 'string' ? v : String(v), '-->', nl)
          }
        }
        else {
          parts.push(indent, '<!--', typeof value === 'string' ? value : String(value), '-->', nl)
        }
        continue
      }

      // CDATA
      if (cdataPropName && key === cdataPropName) {
        hasElements = true
        if (Array.isArray(value)) {
          for (const v of value) {
            parts.push(indent, '<![CDATA[', typeof v === 'string' ? v : String(v), ']]>', nl)
          }
        }
        else {
          parts.push(indent, '<![CDATA[', typeof value === 'string' ? value : String(value), ']]>', nl)
        }
        continue
      }

      // Processing instruction
      if (piPropName && key === piPropName) {
        hasElements = true
        if (typeof value === 'object' && value !== null) {
          for (const piName in value as Record<string, unknown>) {
            if (!Object.prototype.hasOwnProperty.call(value, piName)) continue
            const piContent = (value as Record<string, unknown>)[piName]
            if (typeof piContent === 'object' && piContent !== null) {
              let piAttrs = ''
              for (const k in piContent as Record<string, unknown>) {
                if (!Object.prototype.hasOwnProperty.call(piContent, k)) continue
                if (piAttrs) piAttrs += ' '
                piAttrs += `${k}="${(piContent as Record<string, unknown>)[k]}"`
              }
              parts.push(indent, '<?', piName, ' ', piAttrs, '?>', nl)
            }
            else {
              parts.push(indent, '<?', piName, ' ', typeof piContent === 'string' ? piContent : String(piContent), '?>', nl)
            }
          }
        }
        continue
      }

      // Text node
      if (key === textNodeName) {
        const textValue = this.processTagValue(typeof value === 'string' ? value : String(value))
        parts.push(indent, textValue, nl)
        continue
      }

      // Regular elements
      hasElements = true
      if (Array.isArray(value)) {
        for (const item of value) {
          this.buildTagInto(parts, key, item, level)
        }
      }
      else {
        this.buildTagInto(parts, key, value, level)
      }
    }

    _buildResult.xml = parts.join('')
    _buildResult.hasElements = hasElements
    return _buildResult
  }

  private buildTagInto(parts: string[], tagName: string, value: unknown, level: number): void {
    const indent = this.getIndent(level)
    const nl = this._nl

    // Unpaired tag
    if (this.unpairedSet.has(tagName)) {
      const attrs = this.buildAttributes(value)
      if (this._suppressUnpairedNode) {
        parts.push(indent, '<', tagName, attrs, '>', nl)
      }
      else {
        parts.push(indent, '<', tagName, attrs, '/>', nl)
      }
      return
    }

    if (value === null || value === undefined) {
      if (this._suppressEmptyNode) {
        parts.push(indent, '<', tagName, '/>', nl)
      }
      else {
        parts.push(indent, '<', tagName, '></', tagName, '>', nl)
      }
      return
    }

    if (typeof value === 'object' && !Array.isArray(value)) {
      const objValue = value as Record<string, unknown>
      const attrs = this.buildAttributes(objValue)
      const childResult = this.buildUnordered(objValue, level + 1)
      const children = childResult.xml

      if (!children || isBlank(children)) {
        if (this._suppressEmptyNode) {
          parts.push(indent, '<', tagName, attrs, '/>', nl)
        }
        else {
          parts.push(indent, '<', tagName, attrs, '></', tagName, '>', nl)
        }
        return
      }

      // Use tracked hasElements flag instead of scanning children string
      if (!childResult.hasElements) {
        parts.push(indent, '<', tagName, attrs, '>', fastTrim(children), '</', tagName, '>', nl)
      }
      else {
        parts.push(indent, '<', tagName, attrs, '>\n', children, indent, '</', tagName, '>', nl)
      }
      return
    }

    // Primitive value
    const textValue = this.processTagValue(typeof value === 'string' ? value : String(value))
    if (textValue === '' && this._suppressEmptyNode) {
      parts.push(indent, '<', tagName, '/>', nl)
    }
    else {
      parts.push(indent, '<', tagName, '>', textValue, '</', tagName, '>', nl)
    }
  }

  private buildAttributes(value: unknown): string {
    if (this._ignoreAttributes || typeof value !== 'object' || value === null)
      return ''

    const obj = value as Record<string, unknown>
    let attrs = ''
    const prefix = this._prefix
    const suppressBoolean = this._suppressBoolean

    if (this._attributesGroupName && obj[this._attributesGroupName]) {
      const group = obj[this._attributesGroupName] as Record<string, unknown>
      for (const key in group) {
        if (!Object.prototype.hasOwnProperty.call(group, key)) continue
        const val = group[key]
        const attrName = key.startsWith(prefix) ? key.substring(prefix.length) : key
        if (val === true && suppressBoolean) {
          attrs += ` ${attrName}`
        }
        else {
          attrs += ` ${attrName}="${this.processAttrValue(typeof val === 'string' ? val : String(val))}"`
        }
      }
    }
    else {
      const textNodeName = this._textNodeName
      const commentPropName = this._commentPropName
      const cdataPropName = this._cdataPropName
      const piPropName = this._piPropName

      for (const key in obj) {
        if (!Object.prototype.hasOwnProperty.call(obj, key)) continue
        const val = obj[key]
        // Skip non-attribute keys
        if (key === textNodeName) continue
        if (commentPropName && key === commentPropName) continue
        if (cdataPropName && key === cdataPropName) continue
        if (piPropName && key === piPropName) continue
        if (typeof val === 'object' && val !== null) continue
        if (!key.startsWith(prefix)) continue
        const attrName = key.substring(prefix.length)
        if (val === true && suppressBoolean) {
          attrs += ` ${attrName}`
        }
        else {
          attrs += ` ${attrName}="${this.processAttrValue(typeof val === 'string' ? val : String(val))}"`
        }
      }
    }

    return attrs
  }

  private buildOrdered(arr: any[], level: number): typeof _orderedResult {
    const parts: string[] = []
    const indent = this.getIndent(level)
    const nl = this._nl
    const ignoreAttributes = this._ignoreAttributes
    const prefix = this._prefix
    const textNodeName = this._textNodeName
    const commentPropName = this._commentPropName
    const cdataPropName = this._cdataPropName
    const suppressEmptyNode = this._suppressEmptyNode
    let hasElements = false

    for (const item of arr) {
      if (typeof item !== 'object' || item === null)
        continue

      for (const key in item) {
        if (!Object.prototype.hasOwnProperty.call(item, key)) continue
        if (key === ':@')
          continue

        // Text node
        if (key === textNodeName) {
          const textValue = this.processTagValue(typeof item[key] === 'string' ? item[key] : String(item[key]))
          parts.push(indent, textValue, nl)
          continue
        }

        // Comment
        if (commentPropName && key === commentPropName) {
          hasElements = true
          const commentChildren = item[key]
          if (Array.isArray(commentChildren) && commentChildren.length > 0) {
            const textNode = commentChildren[0]
            const commentText = textNode?.[textNodeName] ?? ''
            parts.push(indent, '<!--', typeof commentText === 'string' ? commentText : String(commentText), '-->', nl)
          }
          continue
        }

        // CDATA
        if (cdataPropName && key === cdataPropName) {
          hasElements = true
          const cdataChildren = item[key]
          if (Array.isArray(cdataChildren) && cdataChildren.length > 0) {
            const textNode = cdataChildren[0]
            const cdataText = textNode?.[textNodeName] ?? ''
            parts.push(indent, '<![CDATA[', typeof cdataText === 'string' ? cdataText : String(cdataText), ']]>', nl)
          }
          continue
        }

        hasElements = true
        const children = item[key]
        const attrObj = item[':@']
        let attrs = ''

        if (!ignoreAttributes && attrObj) {
          for (const attrKey in attrObj) {
            if (!Object.prototype.hasOwnProperty.call(attrObj, attrKey)) continue
            const name = attrKey.startsWith(prefix)
              ? attrKey.substring(prefix.length)
              : attrKey
            attrs += ` ${name}="${this.processAttrValue(typeof attrObj[attrKey] === 'string' ? attrObj[attrKey] : String(attrObj[attrKey]))}"`
          }
        }

        if (Array.isArray(children) && children.length === 0) {
          if (suppressEmptyNode) {
            parts.push(indent, '<', key, attrs, '/>', nl)
          }
          else {
            parts.push(indent, '<', key, attrs, '></', key, '>', nl)
          }
        }
        else if (Array.isArray(children)) {
          const childResult = this.buildOrdered(children, level + 1)
          const childContent = childResult.xml
          if (isBlank(childContent)) {
            if (suppressEmptyNode) {
              parts.push(indent, '<', key, attrs, '/>', nl)
            }
            else {
              parts.push(indent, '<', key, attrs, '></', key, '>', nl)
            }
          }
          else if (!childResult.hasElements) {
            parts.push(indent, '<', key, attrs, '>', fastTrim(childContent), '</', key, '>', nl)
          }
          else {
            parts.push(indent, '<', key, attrs, '>\n', childContent, indent, '</', key, '>', nl)
          }
        }
      }
    }

    _orderedResult.xml = parts.join('')
    _orderedResult.hasElements = hasElements
    return _orderedResult
  }

  private processTagValue(value: string): string {
    if (this.options.tagValueProcessor) {
      value = this.options.tagValueProcessor('', value)
    }
    if (this._processEntities) {
      return encodeEntities(value)
    }
    return value
  }

  private processAttrValue(value: string): string {
    if (this.options.attributeValueProcessor) {
      value = this.options.attributeValueProcessor('', value)
    }
    if (this._processEntities) {
      return encodeEntities(value)
    }
    return value
  }
}

// Fast blank check without allocating a trimmed string
function isBlank(s: string): boolean {
  const len = s.length
  if (len === 0) return true
  for (let i = 0; i < len; i++) {
    const ch = s.charCodeAt(i)
    if (ch !== 32 && ch !== 9 && ch !== 10 && ch !== 13)
      return false
  }
  return true
}

// Fast trim that avoids allocation when not needed
function fastTrim(s: string): string {
  const len = s.length
  if (len === 0) return s
  const first = s.charCodeAt(0)
  const last = s.charCodeAt(len - 1)
  if (first > 32 && last > 32) return s
  return s.trim()
}
