import { describe, expect, test } from 'bun:test'
import { XMLParser } from '../src/parser'

// ============================================================================
// Parser - exhaustive test suite
// ============================================================================

describe('XMLParser - basics', () => {
  test('returns empty object for empty input', () => {
    expect(new XMLParser().parse('')).toEqual({})
  })

  test('returns empty object for whitespace-only input', () => {
    expect(new XMLParser().parse('   ')).toEqual({})
  })

  test('handles BOM at start', () => {
    expect(new XMLParser().parse('\uFEFF<r>v</r>')).toEqual({ r: 'v' })
  })

  test('parses Uint8Array', () => {
    const buf = new TextEncoder().encode('<r>v</r>')
    expect(new XMLParser().parse(buf)).toEqual({ r: 'v' })
  })
})

describe('XMLParser - text content', () => {
  test('simple text', () => {
    expect(new XMLParser().parse('<r>hello</r>')).toEqual({ r: 'hello' })
  })

  test('text with leading/trailing whitespace is trimmed', () => {
    expect(new XMLParser().parse('<r>  hi  </r>')).toEqual({ r: 'hi' })
  })

  test('text with whitespace preserved', () => {
    expect(new XMLParser({ trimValues: false }).parse('<r>  hi  </r>')).toEqual({ r: '  hi  ' })
  })

  test('whitespace-only text is empty string after trim', () => {
    expect(new XMLParser().parse('<r>   </r>')).toEqual({ r: '' })
  })

  test('multiline text', () => {
    const xml = '<r>\n  line1\n  line2\n</r>'
    const result = new XMLParser().parse(xml)
    expect(result.r).toContain('line1')
    expect(result.r).toContain('line2')
  })

  test('text with entities', () => {
    expect(new XMLParser().parse('<r>&lt;&gt;&amp;</r>')).toEqual({ r: '<>&' })
  })

  test('text with numeric entities', () => {
    expect(new XMLParser().parse('<r>&#65;&#66;</r>')).toEqual({ r: 'AB' })
  })

  test('text with hex entities', () => {
    expect(new XMLParser().parse('<r>&#x41;&#x42;</r>')).toEqual({ r: 'AB' })
  })

  test('text entities disabled', () => {
    expect(new XMLParser({ processEntities: false }).parse('<r>&amp;</r>')).toEqual({ r: '&amp;' })
  })

  test('unicode text', () => {
    expect(new XMLParser().parse('<r>日本語</r>')).toEqual({ r: '日本語' })
  })

  test('emoji text', () => {
    expect(new XMLParser().parse('<r>🎉🚀</r>')).toEqual({ r: '🎉🚀' })
  })
})

describe('XMLParser - value type parsing', () => {
  test('integer', () => {
    expect(new XMLParser().parse('<r>42</r>').r).toBe(42)
  })

  test('negative integer', () => {
    expect(new XMLParser().parse('<r>-7</r>').r).toBe(-7)
  })

  test('float', () => {
    expect(new XMLParser().parse('<r>3.14</r>').r).toBe(3.14)
  })

  test('negative float', () => {
    expect(new XMLParser().parse('<r>-0.5</r>').r).toBe(-0.5)
  })

  test('zero', () => {
    expect(new XMLParser().parse('<r>0</r>').r).toBe(0)
  })

  test('boolean true', () => {
    expect(new XMLParser().parse('<r>true</r>').r).toBe(true)
  })

  test('boolean false', () => {
    expect(new XMLParser().parse('<r>false</r>').r).toBe(false)
  })

  test('hex number', () => {
    expect(new XMLParser().parse('<r>0xFF</r>').r).toBe(255)
  })

  test('hex disabled', () => {
    expect(new XMLParser({ numberParseOptions: { hex: false, leadingZeros: true, scientific: true } }).parse('<r>0xFF</r>').r).toBe('0xFF')
  })

  test('leading zeros preserved as string', () => {
    expect(new XMLParser().parse('<r>007</r>').r).toBe('007')
  })

  test('leading zeros parsed when disabled', () => {
    expect(new XMLParser({ numberParseOptions: { hex: true, leadingZeros: false, scientific: true } }).parse('<r>007</r>').r).toBe(7)
  })

  test('scientific notation', () => {
    expect(new XMLParser().parse('<r>1e3</r>').r).toBe(1000)
  })

  test('scientific notation with decimal', () => {
    expect(new XMLParser().parse('<r>1.5e2</r>').r).toBe(150)
  })

  test('scientific notation disabled', () => {
    expect(new XMLParser({ numberParseOptions: { hex: true, leadingZeros: true, scientific: false } }).parse('<r>1e3</r>').r).toBe('1e3')
  })

  test('skipLike pattern', () => {
    const p = new XMLParser({ numberParseOptions: { hex: true, leadingZeros: true, scientific: true, skipLike: /^\d{3}-\d{4}$/ } })
    expect(p.parse('<r>123-4567</r>').r).toBe('123-4567')
  })

  test('value parsing disabled', () => {
    const p = new XMLParser({ parseTagValue: false })
    expect(p.parse('<r>42</r>').r).toBe('42')
    expect(p.parse('<r>true</r>').r).toBe('true')
  })

  test('decimal point only', () => {
    expect(new XMLParser().parse('<r>.5</r>').r).toBe(0.5)
  })

  test('positive sign', () => {
    expect(new XMLParser().parse('<r>+5</r>').r).toBe(5)
  })

  test('non-numeric strings', () => {
    expect(new XMLParser().parse('<r>hello</r>').r).toBe('hello')
    expect(new XMLParser().parse('<r>12abc</r>').r).toBe('12abc')
    expect(new XMLParser().parse('<r>abc12</r>').r).toBe('abc12')
  })
})

describe('XMLParser - nested elements', () => {
  test('single child', () => {
    const r = new XMLParser().parse('<a><b>v</b></a>')
    expect(r.a.b).toBe('v')
  })

  test('multiple different children', () => {
    const r = new XMLParser().parse('<a><b>1</b><c>2</c></a>')
    expect(r.a.b).toBe(1)
    expect(r.a.c).toBe(2)
  })

  test('repeated children become array', () => {
    const r = new XMLParser().parse('<a><b>1</b><b>2</b><b>3</b></a>')
    expect(r.a.b).toEqual([1, 2, 3])
  })

  test('deep nesting', () => {
    const r = new XMLParser().parse('<a><b><c><d><e>v</e></d></c></b></a>')
    expect(r.a.b.c.d.e).toBe('v')
  })

  test('mixed content: text and children', () => {
    const r = new XMLParser().parse('<a>text<b>child</b></a>')
    expect(r.a['#text']).toBe('text')
    expect(r.a.b).toBe('child')
  })

  test('empty child element', () => {
    const r = new XMLParser().parse('<a><b></b></a>')
    expect(r.a.b).toBe('')
  })

  test('self-closing child', () => {
    const r = new XMLParser().parse('<a><b/></a>')
    expect(r.a.b).toBe('')
  })

  test('mixed self-closing and regular', () => {
    const r = new XMLParser().parse('<a><b/><c>v</c></a>')
    expect(r.a.b).toBe('')
    expect(r.a.c).toBe('v')
  })

  test('text between sibling elements', () => {
    const r = new XMLParser().parse('<a>before<b>mid</b>after</a>')
    expect(r.a.b).toBe('mid')
    // text should be combined or both present
    expect(r.a['#text']).toBeDefined()
  })
})

describe('XMLParser - attributes', () => {
  test('attributes ignored by default', () => {
    const r = new XMLParser().parse('<r a="1">t</r>')
    expect(r.r).toBe('t')
  })

  test('attributes parsed when enabled', () => {
    const r = new XMLParser({ ignoreAttributes: false }).parse('<r a="1">t</r>')
    expect(r.r['@_a']).toBe('1')
    expect(r.r['#text']).toBe('t')
  })

  test('custom prefix', () => {
    const r = new XMLParser({ ignoreAttributes: false, attributeNamePrefix: '$$' }).parse('<r a="1">t</r>')
    expect(r.r['$$a']).toBe('1')
  })

  test('empty prefix', () => {
    const r = new XMLParser({ ignoreAttributes: false, attributeNamePrefix: '' }).parse('<r a="1">t</r>')
    expect(r.r.a).toBe('1')
  })

  test('attribute group name', () => {
    const r = new XMLParser({ ignoreAttributes: false, attributesGroupName: '$attrs' }).parse('<r a="1" b="2">t</r>')
    expect(r.r.$attrs['@_a']).toBe('1')
    expect(r.r.$attrs['@_b']).toBe('2')
  })

  test('single-quoted attribute', () => {
    const r = new XMLParser({ ignoreAttributes: false }).parse(`<r a='v'>t</r>`)
    expect(r.r['@_a']).toBe('v')
  })

  test('multiple attributes', () => {
    const r = new XMLParser({ ignoreAttributes: false }).parse('<r a="1" b="2" c="3">t</r>')
    expect(r.r['@_a']).toBe('1')
    expect(r.r['@_b']).toBe('2')
    expect(r.r['@_c']).toBe('3')
  })

  test('attribute on self-closing', () => {
    const r = new XMLParser({ ignoreAttributes: false }).parse('<r><e id="1"/></r>')
    expect(r.r.e['@_id']).toBe('1')
  })

  test('attribute value parsing', () => {
    const r = new XMLParser({ ignoreAttributes: false, parseAttributeValue: true }).parse('<r n="42" b="true">t</r>')
    expect(r.r['@_n']).toBe(42)
    expect(r.r['@_b']).toBe(true)
  })

  test('attribute value not parsed by default', () => {
    const r = new XMLParser({ ignoreAttributes: false }).parse('<r n="42">t</r>')
    expect(r.r['@_n']).toBe('42')
  })

  test('attribute with entities', () => {
    const r = new XMLParser({ ignoreAttributes: false }).parse('<r a="a &amp; b">t</r>')
    expect(r.r['@_a']).toBe('a & b')
  })

  test('boolean attribute', () => {
    const r = new XMLParser({ ignoreAttributes: false, allowBooleanAttributes: true }).parse('<r disabled>t</r>')
    expect(r.r['@_disabled']).toBe('true')
  })

  test('empty attribute value', () => {
    const r = new XMLParser({ ignoreAttributes: false }).parse('<r a="">t</r>')
    expect(r.r['@_a']).toBe('')
  })

  test('attribute with namespace', () => {
    const r = new XMLParser({ ignoreAttributes: false }).parse('<r xml:lang="en">t</r>')
    expect(r.r['@_xml:lang']).toBe('en')
  })

  test('namespace removal from attributes', () => {
    const r = new XMLParser({ ignoreAttributes: false, removeNSPrefix: true }).parse('<r ns:a="v">t</r>')
    expect(r.r['@_a']).toBe('v')
  })

  test('attribute name transformation', () => {
    const r = new XMLParser({ ignoreAttributes: false, transformAttributeName: n => n.toUpperCase() }).parse('<r abc="v">t</r>')
    expect(r.r['@_ABC']).toBe('v')
  })

  test('attribute value processor', () => {
    const r = new XMLParser({
      ignoreAttributes: false,
      attributeValueProcessor: (_n, v) => v.toUpperCase(),
    }).parse('<r a="hello">t</r>')
    expect(r.r['@_a']).toBe('HELLO')
  })

  test('attributes with > in quoted value (ignoreAttributes)', () => {
    // When ignoreAttributes is true, the skip loop must handle > inside quotes
    const r = new XMLParser().parse('<r attr="a>b">text</r>')
    expect(r.r).toBe('text')
  })

  test('attributes with / in quoted value', () => {
    const r = new XMLParser({ ignoreAttributes: false }).parse('<r path="/usr/bin">text</r>')
    expect(r.r['@_path']).toBe('/usr/bin')
  })
})

describe('XMLParser - namespaces', () => {
  test('preserves namespace prefix by default', () => {
    const r = new XMLParser().parse('<ns:root>v</ns:root>')
    expect(r['ns:root']).toBe('v')
  })

  test('removes namespace prefix', () => {
    const r = new XMLParser({ removeNSPrefix: true }).parse('<ns:root>v</ns:root>')
    expect(r.root).toBe('v')
  })

  test('removes namespace from nested elements', () => {
    const r = new XMLParser({ removeNSPrefix: true }).parse('<ns:a><ns:b>v</ns:b></ns:a>')
    expect(r.a.b).toBe('v')
  })

  test('handles multiple namespace prefixes', () => {
    const r = new XMLParser({ removeNSPrefix: true }).parse('<a:root><b:child>v</b:child></a:root>')
    expect(r.root.child).toBe('v')
  })

  test('handles xmlns attributes when ignoring attributes', () => {
    const r = new XMLParser().parse('<root xmlns="http://example.com">v</root>')
    expect(r.root).toBe('v')
  })
})

describe('XMLParser - CDATA', () => {
  test('CDATA content included as text by default', () => {
    expect(new XMLParser().parse('<r><![CDATA[hello]]></r>').r).toBe('hello')
  })

  test('CDATA preserves special characters', () => {
    expect(new XMLParser().parse('<r><![CDATA[<b>&stuff</b>]]></r>').r).toBe('<b>&stuff</b>')
  })

  test('CDATA with cdataPropName', () => {
    const r = new XMLParser({ cdataPropName: '#cdata' }).parse('<r><![CDATA[data]]></r>')
    expect(r.r['#cdata']).toBe('data')
  })

  test('multiple CDATA sections', () => {
    const r = new XMLParser({ cdataPropName: '#cdata' }).parse('<r><![CDATA[a]]><![CDATA[b]]></r>')
    expect(r.r['#cdata']).toEqual(['a', 'b'])
  })

  test('CDATA mixed with text (no cdataPropName)', () => {
    const r = new XMLParser().parse('<r>text<![CDATA[cdata]]></r>')
    expect(r.r).toContain('text')
    expect(r.r).toContain('cdata')
  })

  test('empty CDATA', () => {
    expect(new XMLParser().parse('<r><![CDATA[]]></r>').r).toBe('')
  })

  test('CDATA with newlines', () => {
    const r = new XMLParser().parse('<r><![CDATA[\nline1\nline2\n]]></r>')
    expect(r.r).toContain('line1')
    expect(r.r).toContain('line2')
  })

  test('CDATA with script content', () => {
    const r = new XMLParser().parse('<r><![CDATA[<script>alert("xss")</script>]]></r>')
    expect(r.r).toBe('<script>alert("xss")</script>')
  })
})

describe('XMLParser - comments', () => {
  test('comments ignored by default', () => {
    const r = new XMLParser().parse('<r><!-- comment -->text</r>')
    expect(r.r).toBe('text')
  })

  test('comments captured with prop name', () => {
    const r = new XMLParser({ commentPropName: '#comment' }).parse('<r><!-- hello -->text</r>')
    expect(r.r['#comment']).toBe(' hello ')
    expect(r.r['#text']).toBe('text')
  })

  test('multiple comments', () => {
    const r = new XMLParser({ commentPropName: '#c' }).parse('<r><!-- a --><!-- b --></r>')
    expect(r.r['#c']).toEqual([' a ', ' b '])
  })

  test('empty comment', () => {
    const r = new XMLParser({ commentPropName: '#c' }).parse('<r><!----></r>')
    expect(r.r['#c']).toBe('')
  })

  test('comment with XML-like content', () => {
    const r = new XMLParser({ commentPropName: '#c' }).parse('<r><!-- <tag attr="v"/> --></r>')
    expect(r.r['#c']).toBe(' <tag attr="v"/> ')
  })
})

describe('XMLParser - processing instructions', () => {
  test('PI skipped by default', () => {
    const r = new XMLParser().parse('<?xml version="1.0"?><r>v</r>')
    expect(r.r).toBe('v')
    expect(r['?xml']).toBeUndefined()
  })

  test('PI captured with piPropName', () => {
    const r = new XMLParser({ piPropName: '?pi' }).parse('<?xml version="1.0"?><r>v</r>')
    expect(r['?pi']).toBeDefined()
  })

  test('ignoreDeclaration', () => {
    const r = new XMLParser({ piPropName: '?pi', ignoreDeclaration: true }).parse('<?xml version="1.0"?><r>v</r>')
    expect(r.r).toBe('v')
  })

  test('custom PI', () => {
    const r = new XMLParser({ piPropName: '?pi', ignorePiTags: false }).parse('<?mypi some data?><r>v</r>')
    expect(r['?pi']).toBeDefined()
  })

  test('ignorePiTags', () => {
    const r = new XMLParser({ piPropName: '?pi', ignorePiTags: true }).parse('<?mypi data?><r>v</r>')
    // mypi should be skipped
    expect(r.r).toBe('v')
  })
})

describe('XMLParser - stop nodes', () => {
  test('stop node content as raw text', () => {
    const r = new XMLParser({ stopNodes: ['r.s'] }).parse('<r><s><b>raw</b></s></r>')
    expect(r.r.s['#text']).toBe('<b>raw</b>')
  })

  test('wildcard stop node', () => {
    const r = new XMLParser({ stopNodes: ['*.s'] }).parse('<r><s><b>raw</b></s></r>')
    expect(r.r.s['#text']).toBe('<b>raw</b>')
  })

  test('stop node with attributes', () => {
    const r = new XMLParser({ ignoreAttributes: false, stopNodes: ['r.s'] }).parse('<r><s id="1"><b>raw</b></s></r>')
    expect(r.r.s['@_id']).toBe('1')
    expect(r.r.s['#text']).toBe('<b>raw</b>')
  })

  test('stop node preserves entities as-is', () => {
    const r = new XMLParser({ stopNodes: ['r.s'] }).parse('<r><s>&amp; not decoded</s></r>')
    expect(r.r.s['#text']).toBe('&amp; not decoded')
  })

  test('nested stop nodes only stops specified', () => {
    const r = new XMLParser({ stopNodes: ['r.s'] }).parse('<r><s><x>raw</x></s><t>parsed</t></r>')
    expect(r.r.s['#text']).toBe('<x>raw</x>')
    expect(r.r.t).toBe('parsed')
  })
})

describe('XMLParser - unpaired tags', () => {
  test('br as unpaired', () => {
    const r = new XMLParser({ unpairedTags: ['br'] }).parse('<r>a<br>b</r>')
    expect(r.r).toBeDefined()
  })

  test('multiple unpaired tags', () => {
    const r = new XMLParser({ unpairedTags: ['br', 'hr'] }).parse('<r><br><hr>text</r>')
    expect(r.r).toBeDefined()
  })

  test('unpaired with closing tag', () => {
    const r = new XMLParser({ unpairedTags: ['br'] }).parse('<r>a<br></br>b</r>')
    expect(r.r).toBeDefined()
  })

  test('unpaired with attributes', () => {
    const r = new XMLParser({ ignoreAttributes: false, unpairedTags: ['br'] }).parse('<r>a<br class="clear">b</r>')
    expect(r.r).toBeDefined()
  })
})

describe('XMLParser - isArray', () => {
  test('single element forced to array', () => {
    const r = new XMLParser({ isArray: name => name === 'item' }).parse('<r><item>v</item></r>')
    expect(Array.isArray(r.r.item)).toBe(true)
    expect(r.r.item).toEqual(['v'])
  })

  test('multiple elements already array, isArray not needed', () => {
    const r = new XMLParser({ isArray: name => name === 'item' }).parse('<r><item>1</item><item>2</item></r>')
    expect(r.r.item).toEqual([1, 2])
  })

  test('isArray based on jPath', () => {
    const r = new XMLParser({
      isArray: (_n, jPath) => jPath === 'r.items.item',
    }).parse('<r><items><item>v</item></items></r>')
    expect(Array.isArray(r.r.items.item)).toBe(true)
  })

  test('isArray not triggered for non-matching tags', () => {
    const r = new XMLParser({ isArray: name => name === 'item' }).parse('<r><other>v</other></r>')
    expect(Array.isArray(r.r.other)).toBe(false)
  })
})

describe('XMLParser - alwaysCreateTextNode', () => {
  test('text node for simple value', () => {
    const r = new XMLParser({ alwaysCreateTextNode: true }).parse('<r><a>text</a></r>')
    expect(r.r.a).toEqual({ '#text': 'text' })
  })

  test('text node for self-closing', () => {
    const r = new XMLParser({ alwaysCreateTextNode: true }).parse('<r><a/></r>')
    expect(r.r.a).toEqual({ '#text': '' })
  })

  test('text node for empty element', () => {
    const r = new XMLParser({ alwaysCreateTextNode: true }).parse('<r><a></a></r>')
    // Empty element has no text content, so it's an empty object
    expect(r.r.a).toEqual({})
  })

  test('text node with attributes', () => {
    const r = new XMLParser({ alwaysCreateTextNode: true, ignoreAttributes: false }).parse('<r><a id="1">v</a></r>')
    expect(r.r.a['#text']).toBe('v')
    expect(r.r.a['@_id']).toBe('1')
  })
})

describe('XMLParser - value processors', () => {
  test('tagValueProcessor modifies text', () => {
    const r = new XMLParser({ tagValueProcessor: (_n, v) => v.toUpperCase() }).parse('<r>hello</r>')
    expect(r.r).toBe('HELLO')
  })

  test('tagValueProcessor returns undefined keeps original', () => {
    const r = new XMLParser({ tagValueProcessor: () => undefined }).parse('<r>hello</r>')
    expect(r.r).toBe('hello')
  })

  test('attributeValueProcessor', () => {
    const r = new XMLParser({
      ignoreAttributes: false,
      attributeValueProcessor: (_n, v) => `[${v}]`,
    }).parse('<r a="v">t</r>')
    expect(r.r['@_a']).toBe('[v]')
  })
})

describe('XMLParser - name transforms', () => {
  test('transform tag name to lowercase', () => {
    const r = new XMLParser({ transformTagName: n => n.toLowerCase() }).parse('<ROOT><CHILD>v</CHILD></ROOT>')
    expect(r.root.child).toBe('v')
  })

  test('transform tag name to camelCase', () => {
    const r = new XMLParser({
      transformTagName: n => n.replace(/-(\w)/g, (_, c) => c.toUpperCase()),
    }).parse('<my-element>v</my-element>')
    expect(r.myElement).toBe('v')
  })

  test('transform attribute name', () => {
    const r = new XMLParser({
      ignoreAttributes: false,
      transformAttributeName: n => n.toUpperCase(),
    }).parse('<r abc="v">t</r>')
    expect(r.r['@_ABC']).toBe('v')
  })
})

describe('XMLParser - updateTag', () => {
  test('skip tag returns false', () => {
    const r = new XMLParser({ updateTag: n => n !== 'skip' }).parse('<r><skip>x</skip><keep>v</keep></r>')
    expect(r.r.skip).toBeUndefined()
    expect(r.r.keep).toBe('v')
  })

  test('skip self-closing tag', () => {
    const r = new XMLParser({ updateTag: n => n !== 'skip' }).parse('<r><skip/><keep>v</keep></r>')
    expect(r.r.skip).toBeUndefined()
    expect(r.r.keep).toBe('v')
  })
})

describe('XMLParser - preserveOrder', () => {
  test('returns array', () => {
    const r = new XMLParser({ preserveOrder: true }).parse('<r>v</r>')
    expect(Array.isArray(r)).toBe(true)
  })

  test('maintains element order', () => {
    const r = new XMLParser({ preserveOrder: true }).parse('<r><a>1</a><b>2</b><a>3</a></r>') as any[]
    const children = r[0].r
    expect(children[0].a).toBeDefined()
    expect(children[1].b).toBeDefined()
    expect(children[2].a).toBeDefined()
  })

  test('preserveOrder with attributes', () => {
    const r = new XMLParser({ preserveOrder: true, ignoreAttributes: false }).parse('<r id="1"><a>v</a></r>') as any[]
    expect(r[0][':@']['@_id']).toBe('1')
  })

  test('preserveOrder with text nodes', () => {
    const r = new XMLParser({ preserveOrder: true }).parse('<r>text<a>v</a></r>') as any[]
    const children = r[0].r
    const hasText = children.some((c: any) => c['#text'] !== undefined)
    expect(hasText).toBe(true)
  })

  test('preserveOrder with comments', () => {
    const r = new XMLParser({ preserveOrder: true, commentPropName: '#c' }).parse('<r><!-- hi --><a>v</a></r>') as any[]
    const children = r[0].r
    const hasComment = children.some((c: any) => c['#c'] !== undefined)
    expect(hasComment).toBe(true)
  })

  test('preserveOrder with CDATA', () => {
    const r = new XMLParser({ preserveOrder: true, cdataPropName: '#cd' }).parse('<r><![CDATA[data]]></r>') as any[]
    const children = r[0].r
    const hasCdata = children.some((c: any) => c['#cd'] !== undefined)
    expect(hasCdata).toBe(true)
  })

  test('preserveOrder self-closing', () => {
    const r = new XMLParser({ preserveOrder: true }).parse('<r><a/></r>') as any[]
    const children = r[0].r
    expect(children[0].a).toBeDefined()
    expect(Array.isArray(children[0].a)).toBe(true)
  })
})

describe('XMLParser - DOCTYPE', () => {
  test('skips DOCTYPE', () => {
    const r = new XMLParser().parse('<!DOCTYPE html><html>v</html>')
    expect(r.html).toBe('v')
  })

  test('DOCTYPE with internal subset', () => {
    const r = new XMLParser().parse('<!DOCTYPE note [<!ELEMENT note (#PCDATA)>]><note>text</note>')
    expect(r.note).toBe('text')
  })

  test('DOCTYPE with SYSTEM', () => {
    const r = new XMLParser().parse('<!DOCTYPE note SYSTEM "note.dtd"><note>v</note>')
    expect(r.note).toBe('v')
  })
})

describe('XMLParser - custom entities', () => {
  test('addEntity then parse', () => {
    const p = new XMLParser()
    p.addEntity('foo', 'bar')
    expect(p.parse('<r>&foo;</r>').r).toBe('bar')
  })

  test('multiple custom entities', () => {
    const p = new XMLParser()
    p.addEntity('a', 'X')
    p.addEntity('b', 'Y')
    expect(p.parse('<r>&a;&b;</r>').r).toBe('XY')
  })

  test('custom entity in attribute', () => {
    const p = new XMLParser({ ignoreAttributes: false })
    p.addEntity('custom', 'val')
    const r = p.parse('<r a="&custom;">t</r>')
    expect(r.r['@_a']).toBe('val')
  })
})

describe('XMLParser - edge cases', () => {
  test('many siblings of same type', () => {
    let xml = '<r>'
    for (let i = 0; i < 200; i++) xml += `<i>${i}</i>`
    xml += '</r>'
    const r = new XMLParser().parse(xml)
    expect(r.r.i).toHaveLength(200)
  })

  test('50 levels deep', () => {
    let xml = ''
    for (let i = 0; i < 50; i++) xml += `<l${i}>`
    xml += 'v'
    for (let i = 49; i >= 0; i--) xml += `</l${i}>`
    const r = new XMLParser().parse(xml) as any
    let curr = r
    for (let i = 0; i < 50; i++) curr = curr[`l${i}`]
    expect(curr).toBe('v')
  })

  test('tag names with hyphens', () => {
    expect(new XMLParser().parse('<my-tag>v</my-tag>')['my-tag']).toBe('v')
  })

  test('tag names with dots', () => {
    expect(new XMLParser().parse('<my.tag>v</my.tag>')['my.tag']).toBe('v')
  })

  test('tag names with underscores', () => {
    expect(new XMLParser().parse('<my_tag>v</my_tag>').my_tag).toBe('v')
  })

  test('unicode tag names', () => {
    expect(new XMLParser().parse('<données>v</données>')['données']).toBe('v')
  })

  test('multiple roots via parse (only first captured properly)', () => {
    // Parser is lenient, may parse both
    const r = new XMLParser().parse('<a>1</a>')
    expect(r.a).toBeDefined()
  })

  test('cdata concat with text', () => {
    const r = new XMLParser().parse('<r>hello<![CDATA[ world]]></r>')
    expect(r.r).toBe('hello world')
  })

  test('attributes with special characters in values', () => {
    const r = new XMLParser({ ignoreAttributes: false }).parse('<r a="hello world" b="a+b=c">t</r>')
    expect(r.r['@_a']).toBe('hello world')
    expect(r.r['@_b']).toBe('a+b=c')
  })

  test('empty element with attributes collapses to object', () => {
    const r = new XMLParser({ ignoreAttributes: false }).parse('<r><e id="1"/></r>')
    expect(typeof r.r.e).toBe('object')
    expect(r.r.e['@_id']).toBe('1')
  })

  test('whitespace handling in attribute values', () => {
    const r = new XMLParser({ ignoreAttributes: false }).parse('<r a="  spaced  ">t</r>')
    // trimValues trims attribute values too
    expect(r.r['@_a']).toBe('spaced')
  })

  test('whitespace in attribute values preserved when trimValues false', () => {
    const r = new XMLParser({ ignoreAttributes: false, trimValues: false }).parse('<r a="  spaced  ">t</r>')
    expect(r.r['@_a']).toBe('  spaced  ')
  })
})

describe('XMLParser - performance', () => {
  test('parses 1000 items under 100ms', () => {
    let xml = '<r>'
    for (let i = 0; i < 1000; i++) xml += `<item id="${i}"><name>Item ${i}</name><value>${i}</value></item>`
    xml += '</r>'
    const start = performance.now()
    const r = new XMLParser({ ignoreAttributes: false }).parse(xml)
    const elapsed = performance.now() - start
    expect(r.r.item).toHaveLength(1000)
    expect(elapsed).toBeLessThan(100)
  })

  test('parses 5000 simple elements under 200ms', () => {
    let xml = '<r>'
    for (let i = 0; i < 5000; i++) xml += `<i>${i}</i>`
    xml += '</r>'
    const start = performance.now()
    const r = new XMLParser().parse(xml)
    const elapsed = performance.now() - start
    expect(r.r.i).toHaveLength(5000)
    expect(elapsed).toBeLessThan(200)
  })

  test('parses large text content efficiently', () => {
    const bigText = 'x'.repeat(100000)
    const xml = `<r>${bigText}</r>`
    const start = performance.now()
    const r = new XMLParser().parse(xml)
    const elapsed = performance.now() - start
    expect(r.r).toBe(bigText)
    expect(elapsed).toBeLessThan(100)
  })
})
