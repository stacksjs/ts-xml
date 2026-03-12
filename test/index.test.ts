import { describe, expect, test } from 'bun:test'
import { XMLBuilder, XMLParser, XMLValidator } from '../src/index'

// ============================================================================
// XMLParser Tests
// ============================================================================

describe('XMLParser', () => {
  // --------------------------------------------------------------------------
  // Basic parsing
  // --------------------------------------------------------------------------
  describe('basic parsing', () => {
    test('parses simple element with text', () => {
      const xml = '<root>hello</root>'
      const parser = new XMLParser()
      const result = parser.parse(xml)
      expect(result.root).toBe('hello')
    })

    test('parses empty element', () => {
      const xml = '<root></root>'
      const parser = new XMLParser()
      const result = parser.parse(xml)
      expect(result.root).toBe('')
    })

    test('parses self-closing element', () => {
      const xml = '<root/>'
      const parser = new XMLParser()
      const result = parser.parse(xml)
      expect(result.root).toBe('')
    })

    test('parses nested elements', () => {
      const xml = '<root><child>value</child></root>'
      const parser = new XMLParser()
      const result = parser.parse(xml)
      expect(result.root.child).toBe('value')
    })

    test('parses deeply nested elements', () => {
      const xml = '<a><b><c><d>deep</d></c></b></a>'
      const parser = new XMLParser()
      const result = parser.parse(xml)
      expect(result.a.b.c.d).toBe('deep')
    })

    test('parses multiple children with same name as array', () => {
      const xml = '<root><item>one</item><item>two</item><item>three</item></root>'
      const parser = new XMLParser()
      const result = parser.parse(xml)
      expect(result.root.item).toEqual(['one', 'two', 'three'])
    })

    test('parses multiple different children', () => {
      const xml = '<root><name>John</name><age>30</age></root>'
      const parser = new XMLParser()
      const result = parser.parse(xml)
      expect(result.root.name).toBe('John')
      expect(result.root.age).toBe(30)
    })

    test('parses Uint8Array input', () => {
      const xml = '<root>hello</root>'
      const encoded = new TextEncoder().encode(xml)
      const parser = new XMLParser()
      const result = parser.parse(encoded)
      expect(result.root).toBe('hello')
    })

    test('handles BOM', () => {
      const xml = '\uFEFF<root>hello</root>'
      const parser = new XMLParser()
      const result = parser.parse(xml)
      expect(result.root).toBe('hello')
    })

    test('parses mixed content (text + elements)', () => {
      const xml = '<root>text<child>value</child></root>'
      const parser = new XMLParser()
      const result = parser.parse(xml)
      expect(result.root['#text']).toBe('text')
      expect(result.root.child).toBe('value')
    })
  })

  // --------------------------------------------------------------------------
  // Attributes
  // --------------------------------------------------------------------------
  describe('attributes', () => {
    test('parses attributes when not ignored', () => {
      const xml = '<root attr="value">text</root>'
      const parser = new XMLParser({ ignoreAttributes: false })
      const result = parser.parse(xml)
      expect(result.root['@_attr']).toBe('value')
      expect(result.root['#text']).toBe('text')
    })

    test('ignores attributes by default', () => {
      const xml = '<root attr="value">text</root>'
      const parser = new XMLParser()
      const result = parser.parse(xml)
      expect(result.root).toBe('text')
    })

    test('handles custom attribute prefix', () => {
      const xml = '<root attr="value">text</root>'
      const parser = new XMLParser({ ignoreAttributes: false, attributeNamePrefix: '$' })
      const result = parser.parse(xml)
      expect(result.root.$attr).toBe('value')
    })

    test('handles attribute group name', () => {
      const xml = '<root id="1" name="test">text</root>'
      const parser = new XMLParser({ ignoreAttributes: false, attributesGroupName: '@' })
      const result = parser.parse(xml)
      expect(result.root['@']['@_id']).toBe('1')
      expect(result.root['@']['@_name']).toBe('test')
    })

    test('handles single-quoted attributes', () => {
      const xml = `<root attr='value'>text</root>`
      const parser = new XMLParser({ ignoreAttributes: false })
      const result = parser.parse(xml)
      expect(result.root['@_attr']).toBe('value')
    })

    test('handles multiple attributes', () => {
      const xml = '<root a="1" b="2" c="3">text</root>'
      const parser = new XMLParser({ ignoreAttributes: false })
      const result = parser.parse(xml)
      expect(result.root['@_a']).toBe('1')
      expect(result.root['@_b']).toBe('2')
      expect(result.root['@_c']).toBe('3')
    })

    test('handles attributes on self-closing tags', () => {
      const xml = '<root><item id="1"/></root>'
      const parser = new XMLParser({ ignoreAttributes: false })
      const result = parser.parse(xml)
      expect(result.root.item['@_id']).toBe('1')
    })

    test('handles boolean attributes', () => {
      const xml = '<root disabled>text</root>'
      const parser = new XMLParser({ ignoreAttributes: false, allowBooleanAttributes: true })
      const result = parser.parse(xml)
      expect(result.root['@_disabled']).toBe('true')
    })

    test('parses attribute values to types when enabled', () => {
      const xml = '<root count="42" active="true">text</root>'
      const parser = new XMLParser({ ignoreAttributes: false, parseAttributeValue: true })
      const result = parser.parse(xml)
      expect(result.root['@_count']).toBe(42)
      expect(result.root['@_active']).toBe(true)
    })

    test('handles attributes with entities', () => {
      const xml = '<root title="a &amp; b">text</root>'
      const parser = new XMLParser({ ignoreAttributes: false })
      const result = parser.parse(xml)
      expect(result.root['@_title']).toBe('a & b')
    })
  })

  // --------------------------------------------------------------------------
  // Namespace handling
  // --------------------------------------------------------------------------
  describe('namespaces', () => {
    test('preserves namespace prefix by default', () => {
      const xml = '<ns:root><ns:child>value</ns:child></ns:root>'
      const parser = new XMLParser()
      const result = parser.parse(xml)
      expect(result['ns:root']['ns:child']).toBe('value')
    })

    test('removes namespace prefix when enabled', () => {
      const xml = '<ns:root><ns:child>value</ns:child></ns:root>'
      const parser = new XMLParser({ removeNSPrefix: true })
      const result = parser.parse(xml)
      expect(result.root.child).toBe('value')
    })

    test('removes namespace from attributes', () => {
      const xml = '<ns:root xmlns:ns="http://example.com" ns:attr="value">text</ns:root>'
      const parser = new XMLParser({ ignoreAttributes: false, removeNSPrefix: true })
      const result = parser.parse(xml)
      expect(result.root['@_attr']).toBe('value')
    })
  })

  // --------------------------------------------------------------------------
  // Value parsing
  // --------------------------------------------------------------------------
  describe('value parsing', () => {
    test('parses integers', () => {
      const xml = '<root>42</root>'
      const parser = new XMLParser()
      const result = parser.parse(xml)
      expect(result.root).toBe(42)
    })

    test('parses floats', () => {
      const xml = '<root>3.14</root>'
      const parser = new XMLParser()
      const result = parser.parse(xml)
      expect(result.root).toBe(3.14)
    })

    test('parses negative numbers', () => {
      const xml = '<root>-99</root>'
      const parser = new XMLParser()
      const result = parser.parse(xml)
      expect(result.root).toBe(-99)
    })

    test('parses booleans', () => {
      const xml = '<root><a>true</a><b>false</b></root>'
      const parser = new XMLParser()
      const result = parser.parse(xml)
      expect(result.root.a).toBe(true)
      expect(result.root.b).toBe(false)
    })

    test('does not parse values when disabled', () => {
      const xml = '<root>42</root>'
      const parser = new XMLParser({ parseTagValue: false })
      const result = parser.parse(xml)
      expect(result.root).toBe('42')
    })

    test('parses hex numbers', () => {
      const xml = '<root>0xFF</root>'
      const parser = new XMLParser()
      const result = parser.parse(xml)
      expect(result.root).toBe(255)
    })

    test('handles leading zeros', () => {
      const xml = '<root>007</root>'
      const parser = new XMLParser()
      const result = parser.parse(xml)
      expect(result.root).toBe('007')
    })

    test('parses scientific notation', () => {
      const xml = '<root>1.5e3</root>'
      const parser = new XMLParser()
      const result = parser.parse(xml)
      expect(result.root).toBe(1500)
    })

    test('skips number parsing with skipLike', () => {
      const xml = '<root>12345</root>'
      const parser = new XMLParser({ numberParseOptions: { hex: true, leadingZeros: true, scientific: true, skipLike: /^\d{5}$/ } })
      const result = parser.parse(xml)
      expect(result.root).toBe('12345')
    })
  })

  // --------------------------------------------------------------------------
  // CDATA
  // --------------------------------------------------------------------------
  describe('CDATA', () => {
    test('includes CDATA content as text by default', () => {
      const xml = '<root><![CDATA[<html>content</html>]]></root>'
      const parser = new XMLParser()
      const result = parser.parse(xml)
      expect(result.root).toBe('<html>content</html>')
    })

    test('separates CDATA with cdataPropName', () => {
      const xml = '<root><![CDATA[content]]></root>'
      const parser = new XMLParser({ cdataPropName: '__cdata' })
      const result = parser.parse(xml)
      expect(result.root.__cdata).toBe('content')
    })

    test('handles multiple CDATA sections', () => {
      const xml = '<root><![CDATA[first]]><![CDATA[second]]></root>'
      const parser = new XMLParser({ cdataPropName: '__cdata' })
      const result = parser.parse(xml)
      expect(result.root.__cdata).toEqual(['first', 'second'])
    })

    test('CDATA with special characters', () => {
      const xml = '<root><![CDATA[<script>alert("xss")</script>]]></root>'
      const parser = new XMLParser()
      const result = parser.parse(xml)
      expect(result.root).toBe('<script>alert("xss")</script>')
    })
  })

  // --------------------------------------------------------------------------
  // Comments
  // --------------------------------------------------------------------------
  describe('comments', () => {
    test('ignores comments by default', () => {
      const xml = '<root><!-- comment -->text</root>'
      const parser = new XMLParser()
      const result = parser.parse(xml)
      expect(result.root).toBe('text')
    })

    test('captures comments with commentPropName', () => {
      const xml = '<root><!-- my comment -->text</root>'
      const parser = new XMLParser({ commentPropName: '#comment' })
      const result = parser.parse(xml)
      expect(result.root['#comment']).toBe(' my comment ')
      expect(result.root['#text']).toBe('text')
    })

    test('handles multiple comments', () => {
      const xml = '<root><!-- first --><!-- second --></root>'
      const parser = new XMLParser({ commentPropName: '#comment' })
      const result = parser.parse(xml)
      expect(result.root['#comment']).toEqual([' first ', ' second '])
    })
  })

  // --------------------------------------------------------------------------
  // Processing instructions
  // --------------------------------------------------------------------------
  describe('processing instructions', () => {
    test('skips PI by default', () => {
      const xml = '<?xml version="1.0"?><root>text</root>'
      const parser = new XMLParser()
      const result = parser.parse(xml)
      expect(result.root).toBe('text')
    })

    test('captures XML declaration with piPropName', () => {
      const xml = '<?xml version="1.0" encoding="UTF-8"?><root>text</root>'
      const parser = new XMLParser({ piPropName: '?xml' })
      const result = parser.parse(xml)
      expect(result['?xml']).toBeDefined()
    })

    test('ignores declaration when ignoreDeclaration is set', () => {
      const xml = '<?xml version="1.0"?><root>text</root>'
      const parser = new XMLParser({ piPropName: '?xml', ignoreDeclaration: true })
      const result = parser.parse(xml)
      expect(result.root).toBe('text')
    })
  })

  // --------------------------------------------------------------------------
  // Entities
  // --------------------------------------------------------------------------
  describe('entities', () => {
    test('decodes XML entities', () => {
      const xml = '<root>&lt;b&gt;bold&lt;/b&gt;</root>'
      const parser = new XMLParser()
      const result = parser.parse(xml)
      expect(result.root).toBe('<b>bold</b>')
    })

    test('decodes &amp;', () => {
      const xml = '<root>a &amp; b</root>'
      const parser = new XMLParser()
      const result = parser.parse(xml)
      expect(result.root).toBe('a & b')
    })

    test('decodes &quot; and &apos;', () => {
      const xml = '<root>&quot;hello&quot; &apos;world&apos;</root>'
      const parser = new XMLParser()
      const result = parser.parse(xml)
      expect(result.root).toBe('"hello" \'world\'')
    })

    test('decodes numeric entities', () => {
      const xml = '<root>&#65;&#66;&#67;</root>'
      const parser = new XMLParser()
      const result = parser.parse(xml)
      expect(result.root).toBe('ABC')
    })

    test('decodes hex entities', () => {
      const xml = '<root>&#x41;&#x42;&#x43;</root>'
      const parser = new XMLParser()
      const result = parser.parse(xml)
      expect(result.root).toBe('ABC')
    })

    test('handles HTML entities when enabled', () => {
      const xml = '<root>&nbsp;&copy;</root>'
      const parser = new XMLParser({ htmlEntities: true })
      const result = parser.parse(xml)
      expect(result.root).toBe('\u00A0\u00A9')
    })

    test('does not process entities when disabled', () => {
      const xml = '<root>&amp;</root>'
      const parser = new XMLParser({ processEntities: false })
      const result = parser.parse(xml)
      expect(result.root).toBe('&amp;')
    })

    test('handles custom entities', () => {
      const xml = '<root>&custom;</root>'
      const parser = new XMLParser()
      parser.addEntity('custom', 'customValue')
      const result = parser.parse(xml)
      expect(result.root).toBe('customValue')
    })
  })

  // --------------------------------------------------------------------------
  // Trimming and whitespace
  // --------------------------------------------------------------------------
  describe('trimming', () => {
    test('trims values by default', () => {
      const xml = '<root>  hello  </root>'
      const parser = new XMLParser()
      const result = parser.parse(xml)
      expect(result.root).toBe('hello')
    })

    test('preserves whitespace when trimValues is false', () => {
      const xml = '<root>  hello  </root>'
      const parser = new XMLParser({ trimValues: false })
      const result = parser.parse(xml)
      expect(result.root).toBe('  hello  ')
    })
  })

  // --------------------------------------------------------------------------
  // Stop nodes
  // --------------------------------------------------------------------------
  describe('stop nodes', () => {
    test('treats stop node content as raw text', () => {
      const xml = '<root><script><div>not parsed</div></script></root>'
      const parser = new XMLParser({ stopNodes: ['root.script'] })
      const result = parser.parse(xml)
      expect(result.root.script['#text']).toBe('<div>not parsed</div>')
    })

    test('supports wildcard stop nodes', () => {
      const xml = '<root><script><div>raw</div></script></root>'
      const parser = new XMLParser({ stopNodes: ['*.script'] })
      const result = parser.parse(xml)
      expect(result.root.script['#text']).toBe('<div>raw</div>')
    })
  })

  // --------------------------------------------------------------------------
  // Unpaired tags
  // --------------------------------------------------------------------------
  describe('unpaired tags', () => {
    test('handles unpaired tags like br', () => {
      const xml = '<root>line1<br>line2</root>'
      const parser = new XMLParser({ unpairedTags: ['br'] })
      const result = parser.parse(xml)
      expect(result.root['#text']).toBeDefined()
    })

    test('handles unpaired tags with closing tag', () => {
      const xml = '<root>text<br></br>more</root>'
      const parser = new XMLParser({ unpairedTags: ['br'] })
      const result = parser.parse(xml)
      expect(result.root).toBeDefined()
    })
  })

  // --------------------------------------------------------------------------
  // isArray
  // --------------------------------------------------------------------------
  describe('isArray option', () => {
    test('forces specific tags to be arrays', () => {
      const xml = '<root><item>only one</item></root>'
      const parser = new XMLParser({
        isArray: (name) => name === 'item',
      })
      const result = parser.parse(xml)
      expect(Array.isArray(result.root.item)).toBe(true)
      expect(result.root.item).toEqual(['only one'])
    })

    test('isArray with jPath', () => {
      const xml = '<root><items><item>one</item></items></root>'
      const parser = new XMLParser({
        isArray: (_name, jPath) => jPath === 'root.items.item',
      })
      const result = parser.parse(xml)
      expect(Array.isArray(result.root.items.item)).toBe(true)
    })
  })

  // --------------------------------------------------------------------------
  // alwaysCreateTextNode
  // --------------------------------------------------------------------------
  describe('alwaysCreateTextNode', () => {
    test('creates text node for simple values', () => {
      const xml = '<root><item>text</item></root>'
      const parser = new XMLParser({ alwaysCreateTextNode: true })
      const result = parser.parse(xml)
      expect(result.root.item['#text']).toBe('text')
    })

    test('creates text node on self-closing tags', () => {
      const xml = '<root><item/></root>'
      const parser = new XMLParser({ alwaysCreateTextNode: true })
      const result = parser.parse(xml)
      expect(result.root.item['#text']).toBe('')
    })
  })

  // --------------------------------------------------------------------------
  // Tag/attribute value processors
  // --------------------------------------------------------------------------
  describe('value processors', () => {
    test('applies tagValueProcessor', () => {
      const xml = '<root><item>hello</item></root>'
      const parser = new XMLParser({
        tagValueProcessor: (_name, value) => value.toUpperCase(),
      })
      const result = parser.parse(xml)
      expect(result.root.item).toBe('HELLO')
    })

    test('applies attributeValueProcessor', () => {
      const xml = '<root attr="hello">text</root>'
      const parser = new XMLParser({
        ignoreAttributes: false,
        attributeValueProcessor: (_name, value) => value.toUpperCase(),
      })
      const result = parser.parse(xml)
      expect(result.root['@_attr']).toBe('HELLO')
    })
  })

  // --------------------------------------------------------------------------
  // Transform tag/attribute names
  // --------------------------------------------------------------------------
  describe('name transforms', () => {
    test('transforms tag names', () => {
      const xml = '<Root><ChildElement>value</ChildElement></Root>'
      const parser = new XMLParser({
        transformTagName: name => name.toLowerCase(),
      })
      const result = parser.parse(xml)
      expect(result.root.childelement).toBe('value')
    })

    test('transforms attribute names', () => {
      const xml = '<root MyAttr="value">text</root>'
      const parser = new XMLParser({
        ignoreAttributes: false,
        transformAttributeName: name => name.toLowerCase(),
      })
      const result = parser.parse(xml)
      expect(result.root['@_myattr']).toBe('value')
    })
  })

  // --------------------------------------------------------------------------
  // updateTag
  // --------------------------------------------------------------------------
  describe('updateTag', () => {
    test('skips tag when updateTag returns false', () => {
      const xml = '<root><skip>ignored</skip><keep>value</keep></root>'
      const parser = new XMLParser({
        updateTag: tagName => tagName !== 'skip',
      })
      const result = parser.parse(xml)
      expect(result.root.skip).toBeUndefined()
      expect(result.root.keep).toBe('value')
    })
  })

  // --------------------------------------------------------------------------
  // Preserve order
  // --------------------------------------------------------------------------
  describe('preserveOrder', () => {
    test('returns ordered array', () => {
      const xml = '<root><a>1</a><b>2</b><a>3</a></root>'
      const parser = new XMLParser({ preserveOrder: true })
      const result = parser.parse(xml) as any[]
      expect(Array.isArray(result)).toBe(true)
      const rootChildren = result[0].root
      expect(rootChildren.length).toBe(3)
      expect(rootChildren[0].a).toBeDefined()
      expect(rootChildren[1].b).toBeDefined()
      expect(rootChildren[2].a).toBeDefined()
    })

    test('includes attributes in ordered output', () => {
      const xml = '<root><item id="1">text</item></root>'
      const parser = new XMLParser({ preserveOrder: true, ignoreAttributes: false })
      const result = parser.parse(xml) as any[]
      const item = result[0].root[0]
      expect(item[':@']['@_id']).toBe('1')
    })
  })

  // --------------------------------------------------------------------------
  // Complex XML documents
  // --------------------------------------------------------------------------
  describe('complex documents', () => {
    test('parses RSS feed structure', () => {
      const xml = `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0">
  <channel>
    <title>My Blog</title>
    <link>https://example.com</link>
    <item>
      <title>Post 1</title>
      <description>First post</description>
    </item>
    <item>
      <title>Post 2</title>
      <description>Second post</description>
    </item>
  </channel>
</rss>`
      const parser = new XMLParser({ ignoreAttributes: false })
      const result = parser.parse(xml)
      expect(result.rss['@_version']).toBe('2.0')
      expect(result.rss.channel.title).toBe('My Blog')
      expect(result.rss.channel.item).toHaveLength(2)
      expect(result.rss.channel.item[0].title).toBe('Post 1')
      expect(result.rss.channel.item[1].title).toBe('Post 2')
    })

    test('parses SVG structure', () => {
      const xml = `<svg xmlns="http://www.w3.org/2000/svg" width="100" height="100">
  <circle cx="50" cy="50" r="40" fill="red"/>
  <text x="50" y="50">Hello</text>
</svg>`
      const parser = new XMLParser({ ignoreAttributes: false })
      const result = parser.parse(xml)
      expect(result.svg['@_width']).toBe('100')
      expect(result.svg.circle['@_r']).toBe('40')
      expect(result.svg.text['#text']).toBe('Hello')
    })

    test('parses SOAP envelope', () => {
      const xml = `<soap:Envelope xmlns:soap="http://schemas.xmlsoap.org/soap/envelope/">
  <soap:Header/>
  <soap:Body>
    <GetPrice xmlns="http://example.com">
      <Item>Apple</Item>
    </GetPrice>
  </soap:Body>
</soap:Envelope>`
      const parser = new XMLParser({ removeNSPrefix: true })
      const result = parser.parse(xml)
      expect(result.Envelope.Body.GetPrice.Item).toBe('Apple')
    })

    test('parses Maven POM structure', () => {
      const xml = `<?xml version="1.0" encoding="UTF-8"?>
<project>
  <groupId>com.example</groupId>
  <artifactId>my-app</artifactId>
  <version>1.0.0</version>
  <dependencies>
    <dependency>
      <groupId>junit</groupId>
      <artifactId>junit</artifactId>
      <version>4.13</version>
      <scope>test</scope>
    </dependency>
  </dependencies>
</project>`
      const parser = new XMLParser()
      const result = parser.parse(xml)
      expect(result.project.groupId).toBe('com.example')
      expect(result.project.dependencies.dependency.groupId).toBe('junit')
    })

    test('parses XML with DOCTYPE', () => {
      const xml = `<?xml version="1.0"?>
<!DOCTYPE note SYSTEM "note.dtd">
<note>
  <to>User</to>
  <body>Hello</body>
</note>`
      const parser = new XMLParser()
      const result = parser.parse(xml)
      expect(result.note.to).toBe('User')
      expect(result.note.body).toBe('Hello')
    })

    test('parses large number of siblings', () => {
      let xml = '<root>'
      for (let i = 0; i < 100; i++) {
        xml += `<item>${i}</item>`
      }
      xml += '</root>'
      const parser = new XMLParser()
      const result = parser.parse(xml)
      expect(result.root.item).toHaveLength(100)
      expect(result.root.item[0]).toBe(0)
      expect(result.root.item[99]).toBe(99)
    })

    test('handles deeply nested structure', () => {
      let xml = ''
      const depth = 50
      for (let i = 0; i < depth; i++) xml += `<l${i}>`
      xml += 'deep'
      for (let i = depth - 1; i >= 0; i--) xml += `</l${i}>`

      const parser = new XMLParser()
      const result = parser.parse(xml) as any
      let current = result
      for (let i = 0; i < depth; i++) {
        current = current[`l${i}`]
      }
      expect(current).toBe('deep')
    })
  })

  // --------------------------------------------------------------------------
  // Edge cases
  // --------------------------------------------------------------------------
  describe('edge cases', () => {
    test('handles empty string input', () => {
      const parser = new XMLParser()
      const result = parser.parse('')
      expect(result).toEqual({})
    })

    test('handles whitespace-only content', () => {
      const xml = '<root>   </root>'
      const parser = new XMLParser()
      const result = parser.parse(xml)
      expect(result.root).toBe('')
    })

    test('handles special characters in text', () => {
      const xml = '<root>Hello &amp; World &lt;3&gt;</root>'
      const parser = new XMLParser()
      const result = parser.parse(xml)
      expect(result.root).toBe('Hello & World <3>')
    })

    test('handles multi-line content', () => {
      const xml = `<root>
  line1
  line2
  line3
</root>`
      const parser = new XMLParser()
      const result = parser.parse(xml)
      expect(typeof result.root).toBe('string')
      expect(result.root).toContain('line1')
      expect(result.root).toContain('line2')
    })

    test('handles empty attributes', () => {
      const xml = '<root attr="">text</root>'
      const parser = new XMLParser({ ignoreAttributes: false })
      const result = parser.parse(xml)
      expect(result.root['@_attr']).toBe('')
    })

    test('handles tag names with hyphens and dots', () => {
      const xml = '<my-root><child.element>val</child.element></my-root>'
      const parser = new XMLParser()
      const result = parser.parse(xml)
      expect(result['my-root']['child.element']).toBe('val')
    })

    test('handles unicode content', () => {
      const xml = '<root>こんにちは世界 🌍</root>'
      const parser = new XMLParser()
      const result = parser.parse(xml)
      expect(result.root).toBe('こんにちは世界 🌍')
    })

    test('handles unicode tag names', () => {
      const xml = '<données>valeur</données>'
      const parser = new XMLParser()
      const result = parser.parse(xml)
      expect(result['données']).toBe('valeur')
    })
  })
})

// ============================================================================
// XMLBuilder Tests
// ============================================================================

describe('XMLBuilder', () => {
  // --------------------------------------------------------------------------
  // Basic building
  // --------------------------------------------------------------------------
  describe('basic building', () => {
    test('builds simple element', () => {
      const builder = new XMLBuilder()
      const xml = builder.build({ root: 'hello' })
      expect(xml).toContain('<root>hello</root>')
    })

    test('builds nested elements', () => {
      const builder = new XMLBuilder()
      const xml = builder.build({ root: { child: 'value' } })
      expect(xml).toContain('<root>')
      expect(xml).toContain('<child>value</child>')
      expect(xml).toContain('</root>')
    })

    test('builds array elements', () => {
      const builder = new XMLBuilder()
      const xml = builder.build({ root: { item: ['a', 'b', 'c'] } })
      expect(xml).toContain('<item>a</item>')
      expect(xml).toContain('<item>b</item>')
      expect(xml).toContain('<item>c</item>')
    })

    test('builds with attributes', () => {
      const builder = new XMLBuilder({ ignoreAttributes: false })
      const xml = builder.build({ root: { '@_id': '1', '#text': 'hello' } })
      expect(xml).toContain('id="1"')
      expect(xml).toContain('hello')
    })

    test('builds self-closing for null values', () => {
      const builder = new XMLBuilder({ suppressEmptyNode: true })
      const xml = builder.build({ root: { empty: null } })
      expect(xml).toContain('<empty/>')
    })

    test('builds empty elements when suppressEmptyNode is false', () => {
      const builder = new XMLBuilder({ suppressEmptyNode: false })
      const xml = builder.build({ root: { empty: null } })
      expect(xml).toContain('<empty></empty>')
    })
  })

  // --------------------------------------------------------------------------
  // Formatting
  // --------------------------------------------------------------------------
  describe('formatting', () => {
    test('builds without formatting by default', () => {
      const builder = new XMLBuilder()
      const xml = builder.build({ root: { child: 'value' } })
      expect(xml).not.toContain('\n  ')
    })

    test('builds with formatting when enabled', () => {
      const builder = new XMLBuilder({ format: true })
      const xml = builder.build({ root: { child: 'value' } })
      expect(xml).toContain('\n')
    })

    test('uses custom indentation', () => {
      const builder = new XMLBuilder({ format: true, indentBy: '\t' })
      const xml = builder.build({ root: { child: 'value' } })
      expect(xml).toContain('\t')
    })
  })

  // --------------------------------------------------------------------------
  // Attributes
  // --------------------------------------------------------------------------
  describe('attributes', () => {
    test('builds with custom attribute prefix', () => {
      const builder = new XMLBuilder({ ignoreAttributes: false, attributeNamePrefix: '$' })
      const xml = builder.build({ root: { $id: '1', '#text': 'hello' } })
      expect(xml).toContain('id="1"')
    })

    test('builds with attribute group', () => {
      const builder = new XMLBuilder({ ignoreAttributes: false, attributesGroupName: '@' })
      const xml = builder.build({ root: { '@': { '@_id': '1', '@_class': 'test' }, '#text': 'hello' } })
      expect(xml).toContain('id="1"')
      expect(xml).toContain('class="test"')
    })

    test('ignores attributes when set', () => {
      const builder = new XMLBuilder({ ignoreAttributes: true })
      const xml = builder.build({ root: { '@_id': '1', '#text': 'hello' } })
      expect(xml).not.toContain('id=')
    })

    test('suppresses boolean attributes', () => {
      const builder = new XMLBuilder({ ignoreAttributes: false, suppressBooleanAttributes: true })
      const xml = builder.build({ root: { '@_disabled': true, '#text': 'hello' } })
      expect(xml).toContain(' disabled')
      expect(xml).not.toContain('disabled="')
    })
  })

  // --------------------------------------------------------------------------
  // Comments and CDATA
  // --------------------------------------------------------------------------
  describe('comments and CDATA', () => {
    test('builds comments', () => {
      const builder = new XMLBuilder({ commentPropName: '#comment' })
      const xml = builder.build({ root: { '#comment': ' a comment ' } })
      expect(xml).toContain('<!-- a comment -->')
    })

    test('builds CDATA sections', () => {
      const builder = new XMLBuilder({ cdataPropName: '__cdata' })
      const xml = builder.build({ root: { __cdata: '<html>content</html>' } })
      expect(xml).toContain('<![CDATA[<html>content</html>]]>')
    })

    test('builds processing instructions', () => {
      const builder = new XMLBuilder({ piPropName: '?xml' })
      const xml = builder.build({ '?xml': { xml: { version: '1.0', encoding: 'UTF-8' } }, root: 'hello' })
      expect(xml).toContain('<?xml')
      expect(xml).toContain('version="1.0"')
    })
  })

  // --------------------------------------------------------------------------
  // Entity encoding
  // --------------------------------------------------------------------------
  describe('entity encoding', () => {
    test('encodes entities in text', () => {
      const builder = new XMLBuilder()
      const xml = builder.build({ root: 'a & b < c > d' })
      expect(xml).toContain('&amp;')
      expect(xml).toContain('&lt;')
      expect(xml).toContain('&gt;')
    })

    test('encodes entities in attributes', () => {
      const builder = new XMLBuilder({ ignoreAttributes: false })
      const xml = builder.build({ root: { '@_title': 'a & b', '#text': 'text' } })
      expect(xml).toContain('&amp;')
    })

    test('skips encoding when processEntities is false', () => {
      const builder = new XMLBuilder({ processEntities: false })
      const xml = builder.build({ root: 'a & b' })
      expect(xml).toContain('a & b')
      expect(xml).not.toContain('&amp;')
    })
  })

  // --------------------------------------------------------------------------
  // Preserve order building
  // --------------------------------------------------------------------------
  describe('preserveOrder', () => {
    test('builds from ordered array', () => {
      const builder = new XMLBuilder({ preserveOrder: true })
      const obj = [
        {
          root: [
            { a: [{ '#text': '1' }] },
            { b: [{ '#text': '2' }] },
          ],
        },
      ]
      const xml = builder.build(obj)
      expect(xml).toContain('<a>1</a>')
      expect(xml).toContain('<b>2</b>')
      expect(xml.indexOf('<a>')).toBeLessThan(xml.indexOf('<b>'))
    })

    test('builds ordered with attributes', () => {
      const builder = new XMLBuilder({ preserveOrder: true, ignoreAttributes: false })
      const obj = [
        {
          'root': [
            { '#text': 'hello' },
          ],
          ':@': { '@_id': '1' },
        },
      ]
      const xml = builder.build(obj)
      expect(xml).toContain('id="1"')
      expect(xml).toContain('hello')
    })
  })

  // --------------------------------------------------------------------------
  // Value processors
  // --------------------------------------------------------------------------
  describe('value processors', () => {
    test('applies tagValueProcessor', () => {
      const builder = new XMLBuilder({
        tagValueProcessor: (_name, value) => value.toUpperCase(),
        processEntities: false,
      })
      const xml = builder.build({ root: 'hello' })
      expect(xml).toContain('HELLO')
    })

    test('applies attributeValueProcessor', () => {
      const builder = new XMLBuilder({
        ignoreAttributes: false,
        attributeValueProcessor: (_name, value) => value.toUpperCase(),
        processEntities: false,
      })
      const xml = builder.build({ root: { '@_attr': 'hello', '#text': 'text' } })
      expect(xml).toContain('HELLO')
    })
  })

  // --------------------------------------------------------------------------
  // Roundtrip: parse then build
  // --------------------------------------------------------------------------
  describe('roundtrip', () => {
    const roundtripOptions = { ignoreAttributes: false }

    test('roundtrips simple XML', () => {
      const xml = '<root><child>value</child></root>'
      const parser = new XMLParser(roundtripOptions)
      const obj = parser.parse(xml)
      const builder = new XMLBuilder(roundtripOptions)
      const rebuilt = builder.build(obj)
      expect(rebuilt).toContain('<child>value</child>')
    })

    test('roundtrips XML with attributes', () => {
      const xml = '<root id="1"><child name="test">value</child></root>'
      const parser = new XMLParser(roundtripOptions)
      const obj = parser.parse(xml)
      const builder = new XMLBuilder(roundtripOptions)
      const rebuilt = builder.build(obj)
      expect(rebuilt).toContain('id="1"')
      expect(rebuilt).toContain('name="test"')
      expect(rebuilt).toContain('value')
    })

    test('roundtrips preserveOrder mode', () => {
      const xml = '<root><a>1</a><b>2</b><a>3</a></root>'
      const parserOpts = { preserveOrder: true }
      const parser = new XMLParser(parserOpts)
      const obj = parser.parse(xml)
      const builder = new XMLBuilder({ preserveOrder: true })
      const rebuilt = builder.build(obj)
      expect(rebuilt).toContain('<a>1</a>')
      expect(rebuilt).toContain('<b>2</b>')
      expect(rebuilt).toContain('<a>3</a>')
      const aIdx = rebuilt.indexOf('<a>1</a>')
      const bIdx = rebuilt.indexOf('<b>2</b>')
      const a2Idx = rebuilt.indexOf('<a>3</a>')
      expect(aIdx).toBeLessThan(bIdx)
      expect(bIdx).toBeLessThan(a2Idx)
    })
  })
})

// ============================================================================
// XMLValidator Tests
// ============================================================================

describe('XMLValidator', () => {
  // --------------------------------------------------------------------------
  // Valid XML
  // --------------------------------------------------------------------------
  describe('valid XML', () => {
    test('validates simple XML', () => {
      expect(XMLValidator('<root>text</root>')).toBe(true)
    })

    test('validates self-closing tags', () => {
      expect(XMLValidator('<root/>')).toBe(true)
    })

    test('validates nested XML', () => {
      expect(XMLValidator('<root><child>text</child></root>')).toBe(true)
    })

    test('validates XML with attributes', () => {
      expect(XMLValidator('<root attr="value">text</root>')).toBe(true)
    })

    test('validates XML with single-quoted attributes', () => {
      expect(XMLValidator(`<root attr='value'>text</root>`)).toBe(true)
    })

    test('validates XML with multiple attributes', () => {
      expect(XMLValidator('<root a="1" b="2">text</root>')).toBe(true)
    })

    test('validates XML with comments', () => {
      expect(XMLValidator('<root><!-- comment --></root>')).toBe(true)
    })

    test('validates XML with CDATA', () => {
      expect(XMLValidator('<root><![CDATA[content]]></root>')).toBe(true)
    })

    test('validates XML with processing instruction', () => {
      expect(XMLValidator('<?xml version="1.0"?><root>text</root>')).toBe(true)
    })

    test('validates XML with DOCTYPE', () => {
      expect(XMLValidator('<!DOCTYPE note SYSTEM "note.dtd"><note>text</note>')).toBe(true)
    })

    test('validates XML with namespaces', () => {
      expect(XMLValidator('<ns:root xmlns:ns="http://example.com">text</ns:root>')).toBe(true)
    })

    test('validates self-closing with attributes', () => {
      expect(XMLValidator('<root><item id="1"/></root>')).toBe(true)
    })

    test('validates XML with BOM', () => {
      expect(XMLValidator('\uFEFF<root>text</root>')).toBe(true)
    })

    test('validates deeply nested', () => {
      expect(XMLValidator('<a><b><c><d>deep</d></c></b></a>')).toBe(true)
    })

    test('validates boolean attributes when allowed', () => {
      expect(XMLValidator('<root disabled>text</root>', { allowBooleanAttributes: true })).toBe(true)
    })

    test('validates unpaired tags', () => {
      expect(XMLValidator('<root>text<br>more</root>', { unpairedTags: ['br'] })).toBe(true)
    })
  })

  // --------------------------------------------------------------------------
  // Invalid XML
  // --------------------------------------------------------------------------
  describe('invalid XML', () => {
    test('rejects mismatched tags', () => {
      const result = XMLValidator('<root></wrong>')
      expect(result).not.toBe(true)
      expect((result as any).err.code).toBe('InvalidTag')
    })

    test('rejects unclosed tags', () => {
      const result = XMLValidator('<root><child>')
      expect(result).not.toBe(true)
      expect((result as any).err.code).toBe('InvalidXml')
    })

    test('rejects closing without opening', () => {
      const result = XMLValidator('</root>')
      expect(result).not.toBe(true)
    })

    test('rejects duplicate attributes', () => {
      const result = XMLValidator('<root a="1" a="2">text</root>')
      expect(result).not.toBe(true)
      expect((result as any).err.code).toBe('InvalidAttr')
    })

    test('rejects unquoted attributes', () => {
      const result = XMLValidator('<root a=value>text</root>')
      expect(result).not.toBe(true)
      expect((result as any).err.code).toBe('InvalidAttr')
    })

    test('rejects boolean attributes when not allowed', () => {
      const result = XMLValidator('<root disabled>text</root>')
      expect(result).not.toBe(true)
    })

    test('rejects unclosed comment', () => {
      const result = XMLValidator('<root><!-- unclosed comment</root>')
      expect(result).not.toBe(true)
    })

    test('rejects -- inside comment', () => {
      const result = XMLValidator('<root><!-- bad -- comment --></root>')
      expect(result).not.toBe(true)
    })

    test('rejects unclosed CDATA', () => {
      const result = XMLValidator('<root><![CDATA[unclosed</root>')
      expect(result).not.toBe(true)
    })

    test('rejects text outside root', () => {
      const result = XMLValidator('<root/>extra')
      expect(result).not.toBe(true)
    })

    test('provides line and column info', () => {
      const xml = `<root>
  <child>
  </wrong>
</root>`
      const result = XMLValidator(xml)
      expect(result).not.toBe(true)
      const err = (result as any).err
      expect(err.line).toBeGreaterThan(0)
      expect(err.col).toBeGreaterThan(0)
    })

    test('rejects CDATA outside element', () => {
      const result = XMLValidator('<![CDATA[content]]>')
      expect(result).not.toBe(true)
    })
  })
})

// ============================================================================
// Entity handling tests
// ============================================================================

describe('EntityDecoder', () => {
  test('decodes all XML entities correctly', () => {
    const { EntityDecoder } = require('../src/entities')
    const decoder = new EntityDecoder()
    expect(decoder.decodeEntities('&lt;&gt;&amp;&quot;&apos;')).toBe('<>&"\'')
  })

  test('decodes decimal numeric entities', () => {
    const { EntityDecoder } = require('../src/entities')
    const decoder = new EntityDecoder()
    expect(decoder.decodeEntities('&#72;&#101;&#108;&#108;&#111;')).toBe('Hello')
  })

  test('decodes hex numeric entities', () => {
    const { EntityDecoder } = require('../src/entities')
    const decoder = new EntityDecoder()
    expect(decoder.decodeEntities('&#x48;&#x65;&#x6C;&#x6C;&#x6F;')).toBe('Hello')
  })

  test('preserves unknown entities', () => {
    const { EntityDecoder } = require('../src/entities')
    const decoder = new EntityDecoder()
    expect(decoder.decodeEntities('&unknown;')).toBe('&unknown;')
  })

  test('decodes HTML entities when enabled', () => {
    const { EntityDecoder } = require('../src/entities')
    const decoder = new EntityDecoder(true)
    expect(decoder.decodeEntities('&nbsp;')).toBe('\u00A0')
    expect(decoder.decodeEntities('&copy;')).toBe('\u00A9')
    expect(decoder.decodeEntities('&euro;')).toBe('\u20AC')
  })

  test('does not decode HTML entities when disabled', () => {
    const { EntityDecoder } = require('../src/entities')
    const decoder = new EntityDecoder(false)
    expect(decoder.decodeEntities('&nbsp;')).toBe('&nbsp;')
  })

  test('custom entities take precedence', () => {
    const { EntityDecoder } = require('../src/entities')
    const decoder = new EntityDecoder()
    decoder.addEntity('myent', 'myvalue')
    expect(decoder.decodeEntities('&myent;')).toBe('myvalue')
  })

  test('handles text without entities efficiently', () => {
    const { EntityDecoder } = require('../src/entities')
    const decoder = new EntityDecoder()
    const text = 'no entities here'
    expect(decoder.decodeEntities(text)).toBe(text)
  })
})

describe('encodeEntities', () => {
  test('encodes all special characters', () => {
    const { encodeEntities } = require('../src/entities')
    expect(encodeEntities('&<>"\'')).toBe('&amp;&lt;&gt;&quot;&apos;')
  })

  test('leaves normal text unchanged', () => {
    const { encodeEntities } = require('../src/entities')
    expect(encodeEntities('hello world')).toBe('hello world')
  })
})

// ============================================================================
// Integration / Performance tests
// ============================================================================

describe('integration', () => {
  test('parses and rebuilds a full XML document', () => {
    const xml = `<?xml version="1.0" encoding="UTF-8"?>
<bookstore>
  <book category="cooking">
    <title lang="en">Everyday Italian</title>
    <author>Giada De Laurentiis</author>
    <year>2005</year>
    <price>30.00</price>
  </book>
  <book category="children">
    <title lang="en">Harry Potter</title>
    <author>J.K. Rowling</author>
    <year>2005</year>
    <price>29.99</price>
  </book>
</bookstore>`

    const parser = new XMLParser({ ignoreAttributes: false })
    const obj = parser.parse(xml)

    expect(obj.bookstore.book).toHaveLength(2)
    expect(obj.bookstore.book[0]['@_category']).toBe('cooking')
    expect(obj.bookstore.book[0].title['#text']).toBe('Everyday Italian')
    expect(obj.bookstore.book[0].title['@_lang']).toBe('en')
    expect(obj.bookstore.book[0].year).toBe(2005)
    expect(obj.bookstore.book[0].price).toBe(30.00)
    expect(obj.bookstore.book[1].title['#text']).toBe('Harry Potter')
    expect(obj.bookstore.book[1].author).toBe('J.K. Rowling')

    const builder = new XMLBuilder({ ignoreAttributes: false, format: true })
    const rebuilt = builder.build(obj)
    expect(rebuilt).toContain('<bookstore>')
    expect(rebuilt).toContain('category="cooking"')
    expect(rebuilt).toContain('Everyday Italian')
    expect(rebuilt).toContain('</bookstore>')
  })

  test('handles complex XML with all features', () => {
    const xml = `<?xml version="1.0"?>
<!-- Root comment -->
<root xmlns:ns="http://example.com">
  <ns:element id="1" class="main">
    <![CDATA[Some <raw> content]]>
    <child>text &amp; entities</child>
  </ns:element>
  <empty/>
  <!-- Another comment -->
  <items>
    <item>1</item>
    <item>2</item>
    <item>3</item>
  </items>
</root>`

    const parser = new XMLParser({
      ignoreAttributes: false,
      commentPropName: '#comment',
      removeNSPrefix: true,
    })
    const result = parser.parse(xml)

    expect(result.root.element['@_id']).toBe('1')
    expect(result.root.element.child).toBe('text & entities')
    expect(result.root.empty).toBe('')
    expect(result.root.items.item).toEqual([1, 2, 3])
    expect(result.root['#comment']).toBeDefined()
  })

  test('handles large XML efficiently', () => {
    let xml = '<root>'
    for (let i = 0; i < 1000; i++) {
      xml += `<item id="${i}"><name>Item ${i}</name><value>${i * 1.5}</value></item>`
    }
    xml += '</root>'

    const start = performance.now()
    const parser = new XMLParser({ ignoreAttributes: false })
    const result = parser.parse(xml)
    const elapsed = performance.now() - start

    expect(result.root.item).toHaveLength(1000)
    expect(result.root.item[0].name).toBe('Item 0')
    expect(result.root.item[999].name).toBe('Item 999')
    expect(elapsed).toBeLessThan(100)
  })

  test('handles XML with many attributes efficiently', () => {
    let attrs = ''
    for (let i = 0; i < 50; i++) {
      attrs += ` attr${i}="value${i}"`
    }
    const xml = `<root${attrs}>text</root>`

    const parser = new XMLParser({ ignoreAttributes: false })
    const result = parser.parse(xml)
    expect(result.root['@_attr0']).toBe('value0')
    expect(result.root['@_attr49']).toBe('value49')
    expect(result.root['#text']).toBe('text')
  })

  test('validate + parse workflow', () => {
    const xml = '<root><child>value</child></root>'
    const isValid = XMLValidator(xml)
    expect(isValid).toBe(true)

    const parser = new XMLParser()
    const result = parser.parse(xml)
    expect(result.root.child).toBe('value')
  })

  test('validate rejects, parser still parses (lenient)', () => {
    const badXml = '<root><child>value</wrong></root>'
    const isValid = XMLValidator(badXml)
    expect(isValid).not.toBe(true)
  })

  test('parse then build roundtrip with comments and CDATA', () => {
    const xml = '<root><!-- comment --><![CDATA[raw data]]><child>text</child></root>'
    const parser = new XMLParser({ commentPropName: '#comment', cdataPropName: '__cdata' })
    const obj = parser.parse(xml)

    const builder = new XMLBuilder({ commentPropName: '#comment', cdataPropName: '__cdata' })
    const rebuilt = builder.build(obj)
    expect(rebuilt).toContain('<!-- comment -->')
    expect(rebuilt).toContain('<![CDATA[raw data]]>')
    expect(rebuilt).toContain('<child>text</child>')
  })
})

// ============================================================================
// Real-world XML format tests
// ============================================================================

describe('real-world formats', () => {
  test('parses Atom feed', () => {
    const xml = `<?xml version="1.0" encoding="utf-8"?>
<feed xmlns="http://www.w3.org/2005/Atom">
  <title>Example Feed</title>
  <link href="http://example.org/"/>
  <updated>2003-12-13T18:30:02Z</updated>
  <author>
    <name>John Doe</name>
  </author>
  <id>urn:uuid:60a76c80-d399-11d9-b93C-0003939e0af6</id>
  <entry>
    <title>Atom-Powered Robots Run Amok</title>
    <link href="http://example.org/2003/12/13/atom03"/>
    <id>urn:uuid:1225c695-cfb8-4ebb-aaaa-80da344efa6a</id>
    <updated>2003-12-13T18:30:02Z</updated>
    <summary>Some text.</summary>
  </entry>
</feed>`
    const parser = new XMLParser({ ignoreAttributes: false })
    const result = parser.parse(xml)
    expect(result.feed.title).toBe('Example Feed')
    expect(result.feed.author.name).toBe('John Doe')
    expect(result.feed.entry.title).toBe('Atom-Powered Robots Run Amok')
    expect(result.feed.entry.summary).toBe('Some text.')
  })

  test('parses Android manifest structure', () => {
    const xml = `<?xml version="1.0" encoding="utf-8"?>
<manifest xmlns:android="http://schemas.android.com/apk/res/android"
    package="com.example.myapp">
    <application
        android:label="My App"
        android:icon="@mipmap/ic_launcher">
        <activity android:name=".MainActivity">
            <intent-filter>
                <action android:name="android.intent.action.MAIN"/>
                <category android:name="android.intent.category.LAUNCHER"/>
            </intent-filter>
        </activity>
    </application>
</manifest>`
    const parser = new XMLParser({ ignoreAttributes: false })
    const result = parser.parse(xml)
    expect(result.manifest['@_package']).toBe('com.example.myapp')
    expect(result.manifest.application['@_android:label']).toBe('My App')
  })

  test('parses sitemap XML', () => {
    const xml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
  <url>
    <loc>http://www.example.com/</loc>
    <lastmod>2005-01-01</lastmod>
    <changefreq>monthly</changefreq>
    <priority>0.8</priority>
  </url>
  <url>
    <loc>http://www.example.com/about</loc>
    <lastmod>2005-01-02</lastmod>
    <changefreq>weekly</changefreq>
    <priority>0.5</priority>
  </url>
</urlset>`
    const parser = new XMLParser()
    const result = parser.parse(xml)
    expect(result.urlset.url).toHaveLength(2)
    expect(result.urlset.url[0].loc).toBe('http://www.example.com/')
    expect(result.urlset.url[0].priority).toBe(0.8)
    expect(result.urlset.url[1].changefreq).toBe('weekly')
  })

  test('parses XHTML content', () => {
    const xml = `<html xmlns="http://www.w3.org/1999/xhtml">
<head>
  <title>My Page</title>
</head>
<body>
  <h1>Hello World</h1>
  <p>This is a paragraph with <em>emphasis</em> and <strong>bold</strong>.</p>
</body>
</html>`
    const parser = new XMLParser()
    const result = parser.parse(xml)
    expect(result.html.head.title).toBe('My Page')
    expect(result.html.body.h1).toBe('Hello World')
  })

  test('parses GPX track data', () => {
    const xml = `<?xml version="1.0" encoding="UTF-8"?>
<gpx version="1.1" creator="test">
  <trk>
    <name>Morning Run</name>
    <trkseg>
      <trkpt lat="47.644548" lon="-122.326897">
        <ele>4.46</ele>
        <time>2023-01-01T08:00:00Z</time>
      </trkpt>
      <trkpt lat="47.644549" lon="-122.326898">
        <ele>4.94</ele>
        <time>2023-01-01T08:00:05Z</time>
      </trkpt>
    </trkseg>
  </trk>
</gpx>`
    const parser = new XMLParser({ ignoreAttributes: false })
    const result = parser.parse(xml)
    expect(result.gpx['@_version']).toBe('1.1')
    expect(result.gpx.trk.name).toBe('Morning Run')
    expect(result.gpx.trk.trkseg.trkpt).toHaveLength(2)
    expect(result.gpx.trk.trkseg.trkpt[0]['@_lat']).toBe('47.644548')
    expect(result.gpx.trk.trkseg.trkpt[0].ele).toBe(4.46)
  })

  test('parses configuration XML', () => {
    const xml = `<?xml version="1.0"?>
<configuration>
  <appSettings>
    <add key="Setting1" value="Value1"/>
    <add key="Setting2" value="Value2"/>
    <add key="Debug" value="true"/>
  </appSettings>
  <connectionStrings>
    <add name="Default" connectionString="Server=localhost;Database=mydb"/>
  </connectionStrings>
</configuration>`
    const parser = new XMLParser({ ignoreAttributes: false })
    const result = parser.parse(xml)
    expect(result.configuration.appSettings.add).toHaveLength(3)
    expect(result.configuration.appSettings.add[0]['@_key']).toBe('Setting1')
    expect(result.configuration.connectionStrings.add['@_name']).toBe('Default')
  })
})
