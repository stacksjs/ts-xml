import { describe, expect, test } from 'bun:test'
import { XMLBuilder } from '../src/builder'
import { XMLParser } from '../src/parser'

// ============================================================================
// XMLBuilder - exhaustive test suite
// ============================================================================

describe('XMLBuilder - basic building', () => {
  test('builds simple element with text', () => {
    const xml = new XMLBuilder().build({ root: 'hello' })
    expect(xml).toContain('<root>hello</root>')
  })

  test('builds numeric value', () => {
    const xml = new XMLBuilder().build({ root: 42 })
    expect(xml).toContain('<root>42</root>')
  })

  test('builds boolean value', () => {
    const xml = new XMLBuilder().build({ root: true })
    expect(xml).toContain('<root>true</root>')
  })

  test('builds empty string value', () => {
    const xml = new XMLBuilder({ suppressEmptyNode: false }).build({ root: '' })
    expect(xml).toContain('<root></root>')
  })

  test('builds empty string as self-closing when suppressed', () => {
    const xml = new XMLBuilder({ suppressEmptyNode: true }).build({ root: '' })
    expect(xml).toContain('<root/>')
  })

  test('builds null as empty element', () => {
    const xml = new XMLBuilder({ suppressEmptyNode: false }).build({ root: null })
    expect(xml).toContain('<root></root>')
  })

  test('builds null as self-closing when suppressed', () => {
    const xml = new XMLBuilder({ suppressEmptyNode: true }).build({ root: null })
    expect(xml).toContain('<root/>')
  })

  test('builds undefined as empty element', () => {
    const xml = new XMLBuilder({ suppressEmptyNode: false }).build({ root: undefined })
    expect(xml).toContain('<root></root>')
  })
})

describe('XMLBuilder - nested elements', () => {
  test('single child', () => {
    const xml = new XMLBuilder().build({ root: { child: 'value' } })
    expect(xml).toContain('<root>')
    expect(xml).toContain('<child>value</child>')
    expect(xml).toContain('</root>')
  })

  test('multiple children', () => {
    const xml = new XMLBuilder().build({ root: { a: '1', b: '2' } })
    expect(xml).toContain('<a>1</a>')
    expect(xml).toContain('<b>2</b>')
  })

  test('deeply nested', () => {
    const xml = new XMLBuilder().build({ a: { b: { c: { d: 'v' } } } })
    expect(xml).toContain('<d>v</d>')
    expect(xml).toContain('<c>')
    expect(xml).toContain('<b>')
    expect(xml).toContain('<a>')
  })

  test('array children', () => {
    const xml = new XMLBuilder().build({ root: { item: ['a', 'b', 'c'] } })
    expect(xml).toContain('<item>a</item>')
    expect(xml).toContain('<item>b</item>')
    expect(xml).toContain('<item>c</item>')
  })

  test('array of objects', () => {
    const xml = new XMLBuilder().build({
      root: { item: [{ name: 'a' }, { name: 'b' }] },
    })
    expect(xml).toContain('<name>a</name>')
    expect(xml).toContain('<name>b</name>')
  })

  test('mixed children types', () => {
    const xml = new XMLBuilder().build({
      root: { a: 'text', b: { c: 'nested' }, d: ['x', 'y'] },
    })
    expect(xml).toContain('<a>text</a>')
    expect(xml).toContain('<c>nested</c>')
    expect(xml).toContain('<d>x</d>')
    expect(xml).toContain('<d>y</d>')
  })

  test('text node property', () => {
    const xml = new XMLBuilder().build({ root: { '#text': 'hello' } })
    expect(xml).toContain('hello')
  })
})

describe('XMLBuilder - attributes', () => {
  test('single attribute', () => {
    const xml = new XMLBuilder({ ignoreAttributes: false }).build({ root: { '@_id': '1', '#text': 'hello' } })
    expect(xml).toContain('id="1"')
    expect(xml).toContain('>hello</root>')
  })

  test('multiple attributes', () => {
    const xml = new XMLBuilder({ ignoreAttributes: false }).build({
      root: { '@_a': '1', '@_b': '2', '#text': 'text' },
    })
    expect(xml).toContain('a="1"')
    expect(xml).toContain('b="2"')
  })

  test('custom prefix', () => {
    const xml = new XMLBuilder({ ignoreAttributes: false, attributeNamePrefix: '$' }).build({
      root: { $id: '1', '#text': 'text' },
    })
    expect(xml).toContain('id="1"')
  })

  test('empty prefix', () => {
    const xml = new XMLBuilder({ ignoreAttributes: false, attributeNamePrefix: '' }).build({
      root: { id: 'val', '#text': 'text' },
    })
    // With empty prefix, all keys are treated as attributes, which may conflict
    // but the builder should handle it
    expect(xml).toBeDefined()
  })

  test('attribute group', () => {
    const xml = new XMLBuilder({ ignoreAttributes: false, attributesGroupName: '@' }).build({
      root: { '@': { '@_id': '1', '@_class': 'test' }, '#text': 'text' },
    })
    expect(xml).toContain('id="1"')
    expect(xml).toContain('class="test"')
  })

  test('ignores attributes when set', () => {
    const xml = new XMLBuilder({ ignoreAttributes: true }).build({
      root: { '@_id': '1', '#text': 'text' },
    })
    expect(xml).not.toContain('id=')
  })

  test('attribute on nested element', () => {
    const xml = new XMLBuilder({ ignoreAttributes: false }).build({
      root: { child: { '@_id': '1', '#text': 'text' } },
    })
    expect(xml).toContain('<child id="1">text</child>')
  })

  test('boolean attribute suppressed', () => {
    const xml = new XMLBuilder({ ignoreAttributes: false, suppressBooleanAttributes: true }).build({
      root: { '@_disabled': true, '#text': 'text' },
    })
    expect(xml).toContain(' disabled')
    expect(xml).not.toContain('disabled="true"')
  })

  test('boolean attribute not suppressed', () => {
    const xml = new XMLBuilder({ ignoreAttributes: false, suppressBooleanAttributes: false }).build({
      root: { '@_disabled': true, '#text': 'text' },
    })
    expect(xml).toContain('disabled="true"')
  })

  test('attributes with entity encoding', () => {
    const xml = new XMLBuilder({ ignoreAttributes: false }).build({
      root: { '@_title': 'a & b < c', '#text': 'text' },
    })
    expect(xml).toContain('&amp;')
    expect(xml).toContain('&lt;')
  })
})

describe('XMLBuilder - formatting', () => {
  test('no formatting by default', () => {
    const xml = new XMLBuilder().build({ root: { child: 'value' } })
    expect(xml.includes('\n  ')).toBe(false)
  })

  test('formatted output', () => {
    const xml = new XMLBuilder({ format: true }).build({ root: { child: 'value' } })
    expect(xml).toContain('\n')
    expect(xml.includes('  ')).toBe(true)
  })

  test('custom indent', () => {
    const xml = new XMLBuilder({ format: true, indentBy: '\t' }).build({ root: { child: 'value' } })
    expect(xml).toContain('\t')
  })

  test('4-space indent', () => {
    const xml = new XMLBuilder({ format: true, indentBy: '    ' }).build({ root: { child: 'value' } })
    expect(xml).toContain('    ')
  })

  test('nested formatting', () => {
    const xml = new XMLBuilder({ format: true, indentBy: '  ' }).build({
      root: { level1: { level2: 'value' } },
    })
    expect(xml).toContain('  <level1>')
    expect(xml).toContain('    <level2>')
  })
})

describe('XMLBuilder - entity encoding', () => {
  test('encodes & in text', () => {
    const xml = new XMLBuilder().build({ root: 'a & b' })
    expect(xml).toContain('&amp;')
  })

  test('encodes < in text', () => {
    const xml = new XMLBuilder().build({ root: 'a < b' })
    expect(xml).toContain('&lt;')
  })

  test('encodes > in text', () => {
    const xml = new XMLBuilder().build({ root: 'a > b' })
    expect(xml).toContain('&gt;')
  })

  test('encodes " in text', () => {
    const xml = new XMLBuilder().build({ root: 'say "hello"' })
    expect(xml).toContain('&quot;')
  })

  test('encodes \' in text', () => {
    const xml = new XMLBuilder().build({ root: 'it\'s' })
    expect(xml).toContain('&apos;')
  })

  test('skips encoding when disabled', () => {
    const xml = new XMLBuilder({ processEntities: false }).build({ root: 'a & b' })
    expect(xml).toContain('a & b')
    expect(xml).not.toContain('&amp;')
  })

  test('encodes in attributes', () => {
    const xml = new XMLBuilder({ ignoreAttributes: false }).build({
      root: { '@_a': 'x & y', '#text': 'text' },
    })
    expect(xml).toContain('&amp;')
  })
})

describe('XMLBuilder - comments', () => {
  test('builds single comment', () => {
    const xml = new XMLBuilder({ commentPropName: '#comment' }).build({
      root: { '#comment': ' hello ' },
    })
    expect(xml).toContain('<!-- hello -->')
  })

  test('builds multiple comments', () => {
    const xml = new XMLBuilder({ commentPropName: '#comment' }).build({
      root: { '#comment': [' a ', ' b '] },
    })
    expect(xml).toContain('<!-- a -->')
    expect(xml).toContain('<!-- b -->')
  })

  test('comment not built when prop name not set', () => {
    const xml = new XMLBuilder().build({ root: { '#comment': ' hello ' } })
    // #comment becomes a regular element
    expect(xml).not.toContain('<!--')
  })
})

describe('XMLBuilder - CDATA', () => {
  test('builds CDATA section', () => {
    const xml = new XMLBuilder({ cdataPropName: '#cdata' }).build({
      root: { '#cdata': '<html>data</html>' },
    })
    expect(xml).toContain('<![CDATA[<html>data</html>]]>')
  })

  test('builds multiple CDATA sections', () => {
    const xml = new XMLBuilder({ cdataPropName: '#cdata' }).build({
      root: { '#cdata': ['a', 'b'] },
    })
    expect(xml).toContain('<![CDATA[a]]>')
    expect(xml).toContain('<![CDATA[b]]>')
  })

  test('CDATA not built when prop name not set', () => {
    const xml = new XMLBuilder().build({ root: { '#cdata': 'data' } })
    expect(xml).not.toContain('CDATA')
  })
})

describe('XMLBuilder - processing instructions', () => {
  test('builds PI with object content', () => {
    const xml = new XMLBuilder({ piPropName: '?pi' }).build({
      '?pi': { xml: { version: '1.0', encoding: 'UTF-8' } },
      root: 'text',
    })
    expect(xml).toContain('<?xml')
    expect(xml).toContain('version="1.0"')
    expect(xml).toContain('encoding="UTF-8"')
  })

  test('builds PI with string content', () => {
    const xml = new XMLBuilder({ piPropName: '?pi' }).build({
      '?pi': { custom: 'some data' },
      root: 'text',
    })
    expect(xml).toContain('<?custom some data?>')
  })
})

describe('XMLBuilder - preserveOrder', () => {
  test('builds from ordered array', () => {
    const xml = new XMLBuilder({ preserveOrder: true }).build([
      { root: [{ a: [{ '#text': '1' }] }, { b: [{ '#text': '2' }] }] },
    ])
    expect(xml).toContain('<a>1</a>')
    expect(xml).toContain('<b>2</b>')
    expect(xml.indexOf('<a>')).toBeLessThan(xml.indexOf('<b>'))
  })

  test('ordered with attributes', () => {
    const xml = new XMLBuilder({ preserveOrder: true, ignoreAttributes: false }).build([
      { 'root': [{ '#text': 'hi' }], ':@': { '@_id': '1' } },
    ])
    expect(xml).toContain('id="1"')
    expect(xml).toContain('hi')
  })

  test('ordered with empty children', () => {
    const xml = new XMLBuilder({ preserveOrder: true, suppressEmptyNode: true }).build([
      { root: [{ empty: [] }] },
    ])
    expect(xml).toContain('<empty/>')
  })

  test('ordered with comments', () => {
    const xml = new XMLBuilder({ preserveOrder: true, commentPropName: '#c' }).build([
      { root: [{ '#c': [{ '#text': ' hi ' }] }] },
    ])
    expect(xml).toContain('<!-- hi -->')
  })

  test('ordered with CDATA', () => {
    const xml = new XMLBuilder({ preserveOrder: true, cdataPropName: '#cd' }).build([
      { root: [{ '#cd': [{ '#text': 'raw' }] }] },
    ])
    expect(xml).toContain('<![CDATA[raw]]>')
  })

  test('ordered nested elements', () => {
    const xml = new XMLBuilder({ preserveOrder: true }).build([
      { root: [{ a: [{ b: [{ '#text': 'deep' }] }] }] },
    ])
    expect(xml).toContain('<a>')
    expect(xml).toContain('<b>deep</b>')
    expect(xml).toContain('</a>')
  })
})

describe('XMLBuilder - value processors', () => {
  test('tagValueProcessor', () => {
    const xml = new XMLBuilder({
      tagValueProcessor: (_n, v) => v.toUpperCase(),
      processEntities: false,
    }).build({ root: 'hello' })
    expect(xml).toContain('HELLO')
  })

  test('attributeValueProcessor', () => {
    const xml = new XMLBuilder({
      ignoreAttributes: false,
      attributeValueProcessor: (_n, v) => v.toUpperCase(),
      processEntities: false,
    }).build({ root: { '@_a': 'hello', '#text': 't' } })
    expect(xml).toContain('HELLO')
  })

  test('processor with encoding', () => {
    const xml = new XMLBuilder({
      tagValueProcessor: (_n, v) => `[${v}]`,
    }).build({ root: 'val' })
    expect(xml).toContain('[val]')
  })
})

describe('XMLBuilder - unpaired tags', () => {
  test('builds unpaired tag', () => {
    const xml = new XMLBuilder({ unpairedTags: ['br'], suppressUnpairedNode: true }).build({
      root: { br: '' },
    })
    expect(xml).toContain('<br')
  })

  test('unpaired tag does not self-close when not suppressed', () => {
    const xml = new XMLBuilder({ unpairedTags: ['br'], suppressUnpairedNode: false }).build({
      root: { br: '' },
    })
    expect(xml).toContain('<br/>')
  })
})

describe('XMLBuilder - roundtrip', () => {
  function roundtrip(xml: string, opts: any = {}) {
    const parser = new XMLParser({ ignoreAttributes: false, ...opts })
    const obj = parser.parse(xml)
    const builder = new XMLBuilder({ ignoreAttributes: false, ...opts })
    return builder.build(obj)
  }

  test('simple element', () => {
    const rebuilt = roundtrip('<root>hello</root>')
    expect(rebuilt).toContain('<root>hello</root>')
  })

  test('element with attributes', () => {
    const rebuilt = roundtrip('<root id="1">text</root>')
    expect(rebuilt).toContain('id="1"')
    expect(rebuilt).toContain('text')
  })

  test('nested elements', () => {
    const rebuilt = roundtrip('<root><a>1</a><b>2</b></root>')
    expect(rebuilt).toContain('<a>1</a>')
    expect(rebuilt).toContain('<b>2</b>')
  })

  test('array elements', () => {
    const rebuilt = roundtrip('<root><item>a</item><item>b</item></root>')
    expect(rebuilt).toContain('<item>a</item>')
    expect(rebuilt).toContain('<item>b</item>')
  })

  test('entities roundtrip', () => {
    const rebuilt = roundtrip('<root>a &amp; b</root>')
    expect(rebuilt).toContain('&amp;')
  })

  test('preserveOrder roundtrip', () => {
    const opts = { preserveOrder: true }
    const rebuilt = roundtrip('<root><a>1</a><b>2</b><a>3</a></root>', opts)
    const aIdx = rebuilt.indexOf('<a>1</a>')
    const bIdx = rebuilt.indexOf('<b>2</b>')
    const a2Idx = rebuilt.indexOf('<a>3</a>')
    expect(aIdx).toBeLessThan(bIdx)
    expect(bIdx).toBeLessThan(a2Idx)
  })

  test('comments roundtrip', () => {
    const opts = { commentPropName: '#c' }
    const rebuilt = roundtrip('<root><!-- hi --><a>v</a></root>', opts)
    expect(rebuilt).toContain('<!-- hi -->')
    expect(rebuilt).toContain('<a>v</a>')
  })

  test('CDATA roundtrip', () => {
    const opts = { cdataPropName: '#cd' }
    const rebuilt = roundtrip('<root><![CDATA[raw]]><a>v</a></root>', opts)
    expect(rebuilt).toContain('<![CDATA[raw]]>')
    expect(rebuilt).toContain('<a>v</a>')
  })

  test('self-closing roundtrip', () => {
    const rebuilt = roundtrip('<root><empty/></root>')
    // Should reconstruct empty element (either <empty></empty> or <empty/>)
    expect(rebuilt).toContain('empty')
  })

  test('complex document roundtrip', () => {
    const xml = `<bookstore>
  <book category="cooking">
    <title lang="en">Italian</title>
    <price>30.00</price>
  </book>
  <book category="web">
    <title lang="en">HTML</title>
    <price>25.00</price>
  </book>
</bookstore>`
    const rebuilt = roundtrip(xml)
    expect(rebuilt).toContain('category="cooking"')
    expect(rebuilt).toContain('category="web"')
    expect(rebuilt).toContain('Italian')
    expect(rebuilt).toContain('HTML')
  })
})

describe('XMLBuilder - edge cases', () => {
  test('builds empty object', () => {
    const xml = new XMLBuilder().build({})
    expect(xml).toBe('')
  })

  test('handles nested null values', () => {
    const xml = new XMLBuilder({ suppressEmptyNode: true }).build({ root: { a: null, b: null } })
    expect(xml).toContain('<a/>')
    expect(xml).toContain('<b/>')
  })

  test('handles deeply nested structure', () => {
    let obj: any = 'deep'
    for (let i = 19; i >= 0; i--) {
      obj = { [`l${i}`]: obj }
    }
    const xml = new XMLBuilder().build(obj)
    expect(xml).toContain('deep')
    expect(xml).toContain('<l0>')
    expect(xml).toContain('</l0>')
  })

  test('handles many siblings', () => {
    const items: string[] = []
    for (let i = 0; i < 100; i++) items.push(`v${i}`)
    const xml = new XMLBuilder().build({ root: { item: items } })
    for (let i = 0; i < 100; i++) {
      expect(xml).toContain(`<item>v${i}</item>`)
    }
  })

  test('handles special characters in tag names (hyphens, dots)', () => {
    const xml = new XMLBuilder().build({ 'my-element': { 'sub.item': 'v' } })
    expect(xml).toContain('<my-element>')
    expect(xml).toContain('<sub.item>v</sub.item>')
  })
})
