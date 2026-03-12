import type { BuilderOptions } from './types'
import { encodeEntities } from './entities'
import { defaultBuilderOptions } from './types'

export class XMLBuilder {
  private options: BuilderOptions

  constructor(options?: Partial<BuilderOptions>) {
    this.options = { ...defaultBuilderOptions, ...options }
  }

  build(obj: unknown): string {
    if (this.options.preserveOrder) {
      return this.buildOrdered(obj as any[], 0)
    }
    return this.buildUnordered(obj as Record<string, unknown>, 0)
  }

  private buildUnordered(obj: Record<string, unknown>, level: number): string {
    let xml = ''
    const indent = this.options.format ? this.options.indentBy.repeat(level) : ''
    const newline = this.options.format ? '\n' : ''

    for (const key of Object.keys(obj)) {
      const value = obj[key]

      // Skip attribute keys at this level - they're handled in tag building
      if (!this.options.ignoreAttributes && this.options.attributeNamePrefix && key.startsWith(this.options.attributeNamePrefix))
        continue
      // When prefix is empty, skip primitive non-special keys (they are attributes)
      if (!this.options.ignoreAttributes && this.options.attributeNamePrefix === '' && typeof value !== 'object' && value !== null
        && key !== this.options.textNodeName
        && (!this.options.commentPropName || key !== this.options.commentPropName)
        && (!this.options.cdataPropName || key !== this.options.cdataPropName)
        && (!this.options.piPropName || key !== this.options.piPropName))
        continue
      if (this.options.attributesGroupName && key === this.options.attributesGroupName)
        continue

      // Comment
      if (this.options.commentPropName && key === this.options.commentPropName) {
        if (Array.isArray(value)) {
          for (const v of value) {
            xml += `${indent}<!--${v}-->${newline}`
          }
        }
        else {
          xml += `${indent}<!--${value}-->${newline}`
        }
        continue
      }

      // CDATA
      if (this.options.cdataPropName && key === this.options.cdataPropName) {
        if (Array.isArray(value)) {
          for (const v of value) {
            xml += `${indent}<![CDATA[${v}]]>${newline}`
          }
        }
        else {
          xml += `${indent}<![CDATA[${value}]]>${newline}`
        }
        continue
      }

      // Processing instruction
      if (this.options.piPropName && key === this.options.piPropName) {
        if (typeof value === 'object' && value !== null) {
          for (const [piName, piContent] of Object.entries(value as Record<string, unknown>)) {
            if (typeof piContent === 'object' && piContent !== null) {
              const piAttrs = Object.entries(piContent as Record<string, unknown>)
                .map(([k, v]) => `${k}="${v}"`)
                .join(' ')
              xml += `${indent}<?${piName} ${piAttrs}?>${newline}`
            }
            else {
              xml += `${indent}<?${piName} ${piContent}?>${newline}`
            }
          }
        }
        continue
      }

      // Text node
      if (key === this.options.textNodeName) {
        const textValue = this.processTagValue(String(value))
        xml += `${indent}${textValue}${newline}`
        continue
      }

      // Regular elements
      if (Array.isArray(value)) {
        for (const item of value) {
          xml += this.buildTag(key, item, level)
        }
      }
      else {
        xml += this.buildTag(key, value, level)
      }
    }

    return xml
  }

  private buildTag(tagName: string, value: unknown, level: number): string {
    const indent = this.options.format ? this.options.indentBy.repeat(level) : ''
    const newline = this.options.format ? '\n' : ''

    // Unpaired tag
    if (this.options.unpairedTags.includes(tagName)) {
      if (this.options.suppressUnpairedNode) {
        return `${indent}<${tagName}${this.buildAttributes(value)}${this.options.suppressUnpairedNode ? '' : '/'}>${newline}`
      }
      return `${indent}<${tagName}${this.buildAttributes(value)}/>${newline}`
    }

    if (value === null || value === undefined) {
      if (this.options.suppressEmptyNode) {
        return `${indent}<${tagName}/>${newline}`
      }
      return `${indent}<${tagName}></${tagName}>${newline}`
    }

    if (typeof value === 'object' && !Array.isArray(value)) {
      const objValue = value as Record<string, unknown>
      const attrs = this.buildAttributes(objValue)
      const children = this.buildUnordered(objValue, level + 1)

      if (!children || !children.trim()) {
        if (this.options.suppressEmptyNode) {
          return `${indent}<${tagName}${attrs}/>${newline}`
        }
        return `${indent}<${tagName}${attrs}></${tagName}>${newline}`
      }

      // Check if children is just text (no child elements)
      const hasOnlyText = !children.includes('<') && !children.includes('<!--')
      if (hasOnlyText) {
        return `${indent}<${tagName}${attrs}>${children.trim()}</${tagName}>${newline}`
      }

      return `${indent}<${tagName}${attrs}>${newline}${children}${indent}</${tagName}>${newline}`
    }

    // Primitive value
    const textValue = this.processTagValue(String(value))
    if (textValue === '' && this.options.suppressEmptyNode) {
      return `${indent}<${tagName}/>${newline}`
    }
    return `${indent}<${tagName}>${textValue}</${tagName}>${newline}`
  }

  private buildAttributes(value: unknown): string {
    if (this.options.ignoreAttributes || typeof value !== 'object' || value === null)
      return ''

    const obj = value as Record<string, unknown>
    let attrs = ''
    const prefix = this.options.attributeNamePrefix

    if (this.options.attributesGroupName && obj[this.options.attributesGroupName]) {
      const group = obj[this.options.attributesGroupName] as Record<string, unknown>
      for (const [key, val] of Object.entries(group)) {
        const attrName = key.startsWith(prefix) ? key.substring(prefix.length) : key
        const attrValue = this.processAttrValue(String(val))
        if (val === true && this.options.suppressBooleanAttributes) {
          attrs += ` ${attrName}`
        }
        else {
          attrs += ` ${attrName}="${attrValue}"`
        }
      }
    }
    else {
      for (const [key, val] of Object.entries(obj)) {
        // Skip non-attribute keys
        if (key === this.options.textNodeName)
          continue
        if (this.options.commentPropName && key === this.options.commentPropName)
          continue
        if (this.options.cdataPropName && key === this.options.cdataPropName)
          continue
        if (this.options.piPropName && key === this.options.piPropName)
          continue
        if (typeof val === 'object' && val !== null)
          continue
        if (!key.startsWith(prefix))
          continue
        const attrName = key.substring(prefix.length)
        const attrValue = this.processAttrValue(String(val))
        if (val === true && this.options.suppressBooleanAttributes) {
          attrs += ` ${attrName}`
        }
        else {
          attrs += ` ${attrName}="${attrValue}"`
        }
      }
    }

    return attrs
  }

  private buildOrdered(arr: any[], level: number): string {
    let xml = ''
    const indent = this.options.format ? this.options.indentBy.repeat(level) : ''
    const newline = this.options.format ? '\n' : ''

    for (const item of arr) {
      if (typeof item !== 'object' || item === null)
        continue

      for (const key of Object.keys(item)) {
        if (key === ':@')
          continue

        // Text node
        if (key === this.options.textNodeName) {
          const textValue = this.processTagValue(String(item[key]))
          xml += `${indent}${textValue}${newline}`
          continue
        }

        // Comment
        if (this.options.commentPropName && key === this.options.commentPropName) {
          const commentChildren = item[key]
          if (Array.isArray(commentChildren) && commentChildren.length > 0) {
            const textNode = commentChildren[0]
            const commentText = textNode?.[this.options.textNodeName] ?? ''
            xml += `${indent}<!--${commentText}-->${newline}`
          }
          continue
        }

        // CDATA
        if (this.options.cdataPropName && key === this.options.cdataPropName) {
          const cdataChildren = item[key]
          if (Array.isArray(cdataChildren) && cdataChildren.length > 0) {
            const textNode = cdataChildren[0]
            const cdataText = textNode?.[this.options.textNodeName] ?? ''
            xml += `${indent}<![CDATA[${cdataText}]]>${newline}`
          }
          continue
        }

        const children = item[key]
        const attrObj = item[':@']
        let attrs = ''

        if (!this.options.ignoreAttributes && attrObj) {
          for (const [attrKey, attrVal] of Object.entries(attrObj)) {
            const name = attrKey.startsWith(this.options.attributeNamePrefix)
              ? attrKey.substring(this.options.attributeNamePrefix.length)
              : attrKey
            attrs += ` ${name}="${this.processAttrValue(String(attrVal))}"`
          }
        }

        if (Array.isArray(children) && children.length === 0) {
          if (this.options.suppressEmptyNode) {
            xml += `${indent}<${key}${attrs}/>${newline}`
          }
          else {
            xml += `${indent}<${key}${attrs}></${key}>${newline}`
          }
        }
        else if (Array.isArray(children)) {
          const childContent = this.buildOrdered(children, level + 1)
          if (!childContent.trim()) {
            if (this.options.suppressEmptyNode) {
              xml += `${indent}<${key}${attrs}/>${newline}`
            }
            else {
              xml += `${indent}<${key}${attrs}></${key}>${newline}`
            }
          }
          else if (!childContent.includes('<') && !childContent.includes('<!--')) {
            xml += `${indent}<${key}${attrs}>${childContent.trim()}</${key}>${newline}`
          }
          else {
            xml += `${indent}<${key}${attrs}>${newline}${childContent}${indent}</${key}>${newline}`
          }
        }
      }
    }

    return xml
  }

  private processTagValue(value: string): string {
    if (this.options.tagValueProcessor) {
      value = this.options.tagValueProcessor('', value)
    }
    if (this.options.processEntities) {
      return encodeEntities(value)
    }
    return value
  }

  private processAttrValue(value: string): string {
    if (this.options.attributeValueProcessor) {
      value = this.options.attributeValueProcessor('', value)
    }
    if (this.options.processEntities) {
      return encodeEntities(value)
    }
    return value
  }
}
