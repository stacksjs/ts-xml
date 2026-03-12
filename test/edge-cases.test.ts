import { describe, expect, test } from 'bun:test'
import { XMLBuilder, XMLParser, XMLValidator } from '../src/index'
import type { ValidationError } from '../src/types'

// ============================================================================
// PARSER EDGE CASES — MALFORMED / ADVERSARIAL INPUTS
// ============================================================================

describe('parser - malformed XML inputs', () => {
  test('only a < character', () => {
    const r = new XMLParser().parse('<')
    expect(r).toEqual({})
  })

  test('< at end of valid content', () => {
    const r = new XMLParser().parse('<r>text<')
    // Parser should handle gracefully, text recovered
    expect(r.r).toBeDefined()
  })

  test('</ at end of input', () => {
    const r = new XMLParser().parse('<r>text</')
    expect(r.r).toBeDefined()
  })

  test('</> empty closing tag', () => {
    const r = new XMLParser().parse('<r>text</>')
    // Lenient parse should not crash
    expect(r).toBeDefined()
  })

  test('<> empty tag name', () => {
    const r = new XMLParser().parse('<>text</>')
    expect(r).toBeDefined()
  })

  test('just text, no tags', () => {
    const r = new XMLParser().parse('just plain text')
    expect(r).toBeDefined()
  })

  test('unclosed opening tag', () => {
    const r = new XMLParser().parse('<root')
    expect(r).toBeDefined()
  })

  test('tag with no closing >', () => {
    const r = new XMLParser().parse('<root attr="value"')
    expect(r).toBeDefined()
  })

  test('mismatched tags', () => {
    const r = new XMLParser().parse('<a><b>text</a></b>')
    // Parser is lenient, should not crash
    expect(r).toBeDefined()
  })

  test('double closing tag', () => {
    const r = new XMLParser().parse('<r>text</r></r>')
    expect(r).toBeDefined()
  })

  test('closing tag without opening', () => {
    const r = new XMLParser().parse('</r>')
    expect(r).toBeDefined()
  })

  test('nested unclosed tags', () => {
    const r = new XMLParser().parse('<a><b><c>')
    expect(r).toBeDefined()
  })

  test('mixed valid and invalid', () => {
    const r = new XMLParser().parse('<r><valid>ok</valid><broken')
    expect(r.r).toBeDefined()
    expect(r.r.valid).toBe('ok')
  })

  test('CDATA-like but not CDATA', () => {
    const r = new XMLParser().parse('<r><![NOTCDATA[text]]></r>')
    expect(r).toBeDefined()
  })

  test('unclosed CDATA', () => {
    const r = new XMLParser().parse('<r><![CDATA[never closes</r>')
    // Parser should handle gracefully, not infinite loop
    expect(r).toBeDefined()
  })

  test('unclosed comment', () => {
    const r = new XMLParser().parse('<r><!-- never closes</r>')
    expect(r).toBeDefined()
  })

  test('unclosed PI', () => {
    const r = new XMLParser().parse('<?xml never closes')
    expect(r).toBeDefined()
  })

  test('unclosed attribute quote', () => {
    const r = new XMLParser({ ignoreAttributes: false }).parse('<r attr="never closes>')
    expect(r).toBeDefined()
  })

  test('extremely deeply nested (200 levels)', () => {
    let xml = ''
    for (let i = 0; i < 200; i++) xml += `<l${i}>`
    xml += 'v'
    for (let i = 199; i >= 0; i--) xml += `</l${i}>`
    const r = new XMLParser().parse(xml)
    let curr: any = r
    for (let i = 0; i < 200; i++) curr = curr[`l${i}`]
    expect(curr).toBe('v')
  })

  test('10000 siblings', () => {
    let xml = '<r>'
    for (let i = 0; i < 10000; i++) xml += `<i>${i}</i>`
    xml += '</r>'
    const r = new XMLParser().parse(xml)
    expect(r.r.i).toHaveLength(10000)
    expect(r.r.i[0]).toBe(0)
    expect(r.r.i[9999]).toBe(9999)
  })

  test('very long tag name (5000 chars)', () => {
    const name = 'x'.repeat(5000)
    const xml = `<${name}>v</${name}>`
    const r = new XMLParser().parse(xml)
    expect(r[name]).toBe('v')
  })

  test('very long attribute value (10000 chars)', () => {
    const val = 'x'.repeat(10000)
    const xml = `<r a="${val}">t</r>`
    const r = new XMLParser({ ignoreAttributes: false }).parse(xml)
    expect(r.r['@_a']).toBe(val)
  })

  test('very long text content (100000 chars)', () => {
    const text = 'x'.repeat(100000)
    const xml = `<r>${text}</r>`
    const r = new XMLParser().parse(xml)
    expect(r.r).toBe(text)
  })

  test('null bytes in content', () => {
    const xml = '<r>hello\x00world</r>'
    const r = new XMLParser().parse(xml)
    expect(r.r).toContain('hello')
  })

  test('tab and CR in content', () => {
    const xml = '<r>hello\t\r\nworld</r>'
    const r = new XMLParser().parse(xml)
    expect(r.r).toContain('hello')
    expect(r.r).toContain('world')
  })

  test('tag with only whitespace in name position', () => {
    const r = new XMLParser().parse('< root>text</ root>')
    // space after < means invalid tag name
    expect(r).toBeDefined()
  })

  test('attribute with no value and no equals (not boolean mode)', () => {
    // ignoreAttributes: false, allowBooleanAttributes: false
    // Parser should handle gracefully
    const r = new XMLParser({ ignoreAttributes: false, allowBooleanAttributes: false }).parse('<r attr>text</r>')
    expect(r).toBeDefined()
  })

  test('multiple spaces between attributes', () => {
    const r = new XMLParser({ ignoreAttributes: false }).parse('<r   a="1"    b="2"   >t</r>')
    expect(r.r['@_a']).toBe('1')
    expect(r.r['@_b']).toBe('2')
  })

  test('newlines in attribute area', () => {
    const xml = `<r
  a="1"
  b="2"
>text</r>`
    const r = new XMLParser({ ignoreAttributes: false }).parse(xml)
    expect(r.r['@_a']).toBe('1')
    expect(r.r['@_b']).toBe('2')
    expect(r.r['#text']).toBe('text')
  })

  test('space around = in attributes', () => {
    const r = new XMLParser({ ignoreAttributes: false }).parse('<r a = "1" b= "2" c ="3">t</r>')
    expect(r.r['@_a']).toBe('1')
    expect(r.r['@_b']).toBe('2')
    expect(r.r['@_c']).toBe('3')
  })
})

// ============================================================================
// PARSER — ATTRIBUTE VALUE EDGE CASES
// ============================================================================

describe('parser - attribute values with special chars', () => {
  test('attribute value containing >', () => {
    const r = new XMLParser({ ignoreAttributes: false }).parse('<r a="x>y">t</r>')
    expect(r.r['@_a']).toBe('x>y')
  })

  test('attribute value containing <', () => {
    const r = new XMLParser({ ignoreAttributes: false }).parse('<r a="x&lt;y">t</r>')
    expect(r.r['@_a']).toBe('x<y')
  })

  test('attribute value containing /', () => {
    const r = new XMLParser({ ignoreAttributes: false }).parse('<r path="/usr/bin/sh">t</r>')
    expect(r.r['@_path']).toBe('/usr/bin/sh')
  })

  test('attribute value containing />', () => {
    const r = new XMLParser({ ignoreAttributes: false }).parse('<r a="val/>stuff">t</r>')
    expect(r.r['@_a']).toBe('val/>stuff')
  })

  test('attribute value containing double quote in single-quoted attr', () => {
    const r = new XMLParser({ ignoreAttributes: false }).parse(`<r a='say "hello"'>t</r>`)
    expect(r.r['@_a']).toBe('say "hello"')
  })

  test('attribute value containing single quote in double-quoted attr', () => {
    const r = new XMLParser({ ignoreAttributes: false }).parse(`<r a="it's">t</r>`)
    expect(r.r['@_a']).toBe("it's")
  })

  test('attribute value containing newlines', () => {
    const xml = `<r a="line1\nline2">t</r>`
    const r = new XMLParser({ ignoreAttributes: false }).parse(xml)
    expect(r.r['@_a']).toContain('line1')
  })

  test('attribute with > when ignoreAttributes true', () => {
    // This was a bug: skip loop didnt handle > inside quotes
    const r = new XMLParser({ ignoreAttributes: true }).parse('<r a="x>y">text</r>')
    expect(r.r).toBe('text')
  })

  test('attribute with /> when ignoreAttributes true', () => {
    const r = new XMLParser({ ignoreAttributes: true }).parse('<r a="x/>y">text</r>')
    expect(r.r).toBe('text')
  })

  test('attribute with > in preserveOrder + ignoreAttributes', () => {
    const r = new XMLParser({ preserveOrder: true, ignoreAttributes: true }).parse('<r a="x>y">text</r>') as any[]
    expect(r).toBeDefined()
    expect(r[0].r).toBeDefined()
  })

  test('attribute with /> in preserveOrder + ignoreAttributes', () => {
    const r = new XMLParser({ preserveOrder: true, ignoreAttributes: true }).parse('<r a="val/>ue">text</r>') as any[]
    expect(r).toBeDefined()
    expect(r[0].r).toBeDefined()
  })
})

// ============================================================================
// PARSER — NUMBER PARSING EDGE CASES
// ============================================================================

describe('parser - number parsing edge cases', () => {
  test('empty string is not parsed as number', () => {
    const r = new XMLParser().parse('<r></r>')
    expect(r.r).toBe('')
  })

  test('whitespace-only is not a number', () => {
    const r = new XMLParser().parse('<r>   </r>')
    expect(r.r).toBe('')
  })

  test('0 is parsed as number', () => {
    expect(new XMLParser().parse('<r>0</r>').r).toBe(0)
  })

  test('0.0 is parsed as number', () => {
    expect(new XMLParser().parse('<r>0.0</r>').r).toBe(0)
  })

  test('00 is preserved as string (leading zeros)', () => {
    expect(new XMLParser().parse('<r>00</r>').r).toBe('00')
  })

  test('00.5 is preserved as string (leading zeros)', () => {
    expect(new XMLParser().parse('<r>00.5</r>').r).toBe('00.5')
  })

  test('0x0 is parsed as hex', () => {
    expect(new XMLParser().parse('<r>0x0</r>').r).toBe(0)
  })

  test('0xGG is not valid hex', () => {
    expect(new XMLParser().parse('<r>0xGG</r>').r).toBe('0xGG')
  })

  test('+0 is parsed as number', () => {
    expect(new XMLParser().parse('<r>+0</r>').r).toBe(0)
  })

  test('-0 is parsed as number', () => {
    expect(new XMLParser().parse('<r>-0</r>').r).toBe(-0)
  })

  test('Infinity is not parsed as number', () => {
    expect(new XMLParser().parse('<r>Infinity</r>').r).toBe('Infinity')
  })

  test('NaN is not parsed as number', () => {
    expect(new XMLParser().parse('<r>NaN</r>').r).toBe('NaN')
  })

  test('1e999 (overflow) stays as number', () => {
    const r = new XMLParser().parse('<r>1e999</r>').r
    expect(r).toBe(Infinity)
  })

  test('very large integer', () => {
    const r = new XMLParser().parse('<r>99999999999999999</r>').r
    expect(typeof r).toBe('number')
  })

  test('number with trailing dot', () => {
    // "42." matches /^[+-]?(\d+\.?\d*|\.\d+)$/
    expect(new XMLParser().parse('<r>42.</r>').r).toBe(42)
  })

  test('number with leading dot', () => {
    expect(new XMLParser().parse('<r>.5</r>').r).toBe(0.5)
  })

  test('just a dot', () => {
    expect(new XMLParser().parse('<r>.</r>').r).toBe('.')
  })

  test('just a plus sign', () => {
    expect(new XMLParser().parse('<r>+</r>').r).toBe('+')
  })

  test('just a minus sign', () => {
    expect(new XMLParser().parse('<r>-</r>').r).toBe('-')
  })

  test('double negative', () => {
    expect(new XMLParser().parse('<r>--5</r>').r).toBe('--5')
  })

  test('number with spaces (trimmed)', () => {
    expect(new XMLParser().parse('<r> 42 </r>').r).toBe(42)
  })

  test('scientific with negative exponent', () => {
    expect(new XMLParser().parse('<r>1.5e-3</r>').r).toBe(0.0015)
  })

  test('scientific with positive exponent sign', () => {
    expect(new XMLParser().parse('<r>1.5e+3</r>').r).toBe(1500)
  })

  test('uppercase E in scientific', () => {
    expect(new XMLParser().parse('<r>1.5E3</r>').r).toBe(1500)
  })

  test('hex with uppercase X', () => {
    // 0X is not matched by regex /^0x/, only lowercase x
    expect(new XMLParser().parse('<r>0XFF</r>').r).toBe('0XFF')
  })
})

// ============================================================================
// PARSER — ENTITY EDGE CASES
// ============================================================================

describe('parser - entity edge cases', () => {
  test('double-encoded entities', () => {
    // &amp;amp; -> first pass: &amp; (decoded to &), then "amp;" remains
    const r = new XMLParser().parse('<r>&amp;amp;</r>')
    expect(r.r).toBe('&amp;')
  })

  test('entity at start of text', () => {
    expect(new XMLParser().parse('<r>&lt;start</r>').r).toBe('<start')
  })

  test('entity at end of text', () => {
    expect(new XMLParser().parse('<r>end&gt;</r>').r).toBe('end>')
  })

  test('adjacent entities', () => {
    expect(new XMLParser().parse('<r>&lt;&gt;&amp;</r>').r).toBe('<>&')
  })

  test('unknown entity preserved', () => {
    expect(new XMLParser().parse('<r>&unknown;</r>').r).toBe('&unknown;')
  })

  test('bare & without semicolon preserved', () => {
    expect(new XMLParser().parse('<r>a & b</r>').r).toBe('a & b')
  })

  test('&#; no digits', () => {
    expect(new XMLParser().parse('<r>&#;</r>').r).toBe('&#;')
  })

  test('&#x; no hex digits', () => {
    expect(new XMLParser().parse('<r>&#x;</r>').r).toBe('&#x;')
  })

  test('very high code point entity', () => {
    // U+1F600 = 😀 = decimal 128512
    expect(new XMLParser().parse('<r>&#128512;</r>').r).toBe('😀')
  })

  test('entity in CDATA is NOT decoded', () => {
    const r = new XMLParser().parse('<r><![CDATA[&amp;]]></r>')
    expect(r.r).toBe('&amp;')
  })

  test('entity in attribute value', () => {
    const r = new XMLParser({ ignoreAttributes: false }).parse('<r a="&lt;">t</r>')
    expect(r.r['@_a']).toBe('<')
  })

  test('entities disabled still passes through text', () => {
    const r = new XMLParser({ processEntities: false }).parse('<r>&lt;text&gt;</r>')
    expect(r.r).toBe('&lt;text&gt;')
  })

  test('custom entity overrides XML entity', () => {
    const p = new XMLParser()
    p.addEntity('lt', 'CUSTOM_LT')
    expect(p.parse('<r>&lt;</r>').r).toBe('CUSTOM_LT')
  })

  test('HTML entity nbsp decoded properly', () => {
    const r = new XMLParser({ htmlEntities: true }).parse('<r>a&nbsp;b</r>')
    expect(r.r).toBe('a\u00A0b')
  })

  test('HTML entity not decoded when disabled', () => {
    const r = new XMLParser({ htmlEntities: false }).parse('<r>&nbsp;</r>')
    expect(r.r).toBe('&nbsp;')
  })
})

// ============================================================================
// PARSER — OPTION INTERACTIONS
// ============================================================================

describe('parser - option interactions', () => {
  test('removeNSPrefix + ignoreAttributes skips xmlns correctly', () => {
    const xml = '<ns:root xmlns:ns="http://example.com/very/long/namespace">text</ns:root>'
    const r = new XMLParser({ removeNSPrefix: true, ignoreAttributes: true }).parse(xml)
    expect(r.root).toBe('text')
  })

  test('removeNSPrefix + ignoreAttributes with > in xmlns value', () => {
    // xmlns value shouldn't break the attribute skip loop
    const xml = '<ns:root xmlns:ns="http://example.com/?a>b">text</ns:root>'
    const r = new XMLParser({ removeNSPrefix: true, ignoreAttributes: true }).parse(xml)
    expect(r.root).toBe('text')
  })

  test('alwaysCreateTextNode + ignoreAttributes', () => {
    const r = new XMLParser({ alwaysCreateTextNode: true, ignoreAttributes: true }).parse('<r attr="v">text</r>')
    expect(r.r['#text']).toBe('text')
  })

  test('alwaysCreateTextNode with nested children', () => {
    const r = new XMLParser({ alwaysCreateTextNode: true }).parse('<r><a>text</a></r>')
    // a has text, alwaysCreateTextNode wraps it
    expect(r.r.a['#text']).toBe('text')
  })

  test('parseTagValue false + parseAttributeValue true', () => {
    const r = new XMLParser({
      ignoreAttributes: false,
      parseTagValue: false,
      parseAttributeValue: true,
    }).parse('<r n="42">42</r>')
    expect(r.r['@_n']).toBe(42) // attribute parsed
    expect(r.r['#text']).toBe('42') // text NOT parsed
  })

  test('parseTagValue true + parseAttributeValue false (default)', () => {
    const r = new XMLParser({
      ignoreAttributes: false,
    }).parse('<r n="42">42</r>')
    expect(r.r['@_n']).toBe('42') // attribute NOT parsed
    expect(r.r['#text']).toBe(42) // text parsed
  })

  test('commentPropName + cdataPropName at same time', () => {
    const r = new XMLParser({ commentPropName: '#c', cdataPropName: '#cd' })
      .parse('<r><!-- comment --><![CDATA[data]]></r>')
    expect(r.r['#c']).toBe(' comment ')
    expect(r.r['#cd']).toBe('data')
  })

  test('isArray + alwaysCreateTextNode', () => {
    const r = new XMLParser({
      alwaysCreateTextNode: true,
      isArray: name => name === 'item',
    }).parse('<r><item>one</item></r>')
    expect(Array.isArray(r.r.item)).toBe(true)
    expect(r.r.item[0]['#text']).toBe('one')
  })

  test('stopNodes + ignoreAttributes false', () => {
    const r = new XMLParser({
      ignoreAttributes: false,
      stopNodes: ['r.raw'],
    }).parse('<r><raw id="1"><b>not parsed</b></raw></r>')
    expect(r.r.raw['@_id']).toBe('1')
    expect(r.r.raw['#text']).toBe('<b>not parsed</b>')
  })

  test('unpairedTags multiple same unpaired in sequence', () => {
    const r = new XMLParser({ unpairedTags: ['br'] }).parse('<r>a<br>b<br>c</r>')
    expect(r.r).toBeDefined()
  })

  test('custom textNodeName', () => {
    const r = new XMLParser({ textNodeName: 'value' }).parse('<r>text<child>v</child></r>')
    expect(r.r.value).toBe('text')
    expect(r.r.child).toBe('v')
  })

  test('custom textNodeName conflicts with element name', () => {
    const r = new XMLParser({ textNodeName: 'child' }).parse('<r>text<child>v</child></r>')
    // Both text content and <child> element use key "child", collapsed to parent level as array
    expect(Array.isArray(r.r)).toBe(true)
    expect(r.r).toContain('text')
    expect(r.r).toContain('v')
  })

  test('preserveOrder + all special nodes', () => {
    const xml = '<r><!-- c --><![CDATA[cd]]><a>v</a></r>'
    const r = new XMLParser({
      preserveOrder: true,
      commentPropName: '#c',
      cdataPropName: '#cd',
    }).parse(xml) as any[]
    expect(r[0].r.length).toBeGreaterThanOrEqual(3)
  })

  test('transformTagName + removeNSPrefix', () => {
    const r = new XMLParser({
      removeNSPrefix: true,
      transformTagName: n => n.toLowerCase(),
    }).parse('<NS:ROOT><NS:CHILD>v</NS:CHILD></NS:ROOT>')
    expect(r.root.child).toBe('v')
  })

  test('attributeValueProcessor returning empty string', () => {
    const r = new XMLParser({
      ignoreAttributes: false,
      attributeValueProcessor: () => '',
    }).parse('<r a="something">t</r>')
    expect(r.r['@_a']).toBe('')
  })

  test('tagValueProcessor returning empty string', () => {
    const r = new XMLParser({
      tagValueProcessor: () => '',
    }).parse('<r>something</r>')
    // Empty string is filtered out in addToObj (processed !== '')
    expect(r.r).toBe('')
  })

  test('multiple stop nodes', () => {
    const r = new XMLParser({ stopNodes: ['r.a', 'r.b'] })
      .parse('<r><a><x>1</x></a><b><y>2</y></b><c><z>3</z></c></r>')
    expect(r.r.a['#text']).toBe('<x>1</x>')
    expect(r.r.b['#text']).toBe('<y>2</y>')
    expect(r.r.c.z).toBe(3) // parsed normally
  })
})

// ============================================================================
// PARSER — WHITESPACE / TEXT ACCUMULATION
// ============================================================================

describe('parser - text accumulation edge cases', () => {
  test('text before first child element', () => {
    const r = new XMLParser().parse('<r>before<c>v</c></r>')
    expect(r.r['#text']).toBe('before')
    expect(r.r.c).toBe('v')
  })

  test('text after last child element', () => {
    const r = new XMLParser().parse('<r><c>v</c>after</r>')
    expect(r.r['#text']).toBe('after')
    expect(r.r.c).toBe('v')
  })

  test('text between child elements', () => {
    const r = new XMLParser().parse('<r><a>1</a>between<b>2</b></r>')
    expect(r.r['#text']).toBe('between')
    expect(r.r.a).toBe(1)
    expect(r.r.b).toBe(2)
  })

  test('multiple text fragments between elements', () => {
    const r = new XMLParser().parse('<r>t1<a/>t2<b/>t3</r>')
    expect(r.r['#text']).toBeDefined()
    // Multiple text fragments should be accumulated
    if (Array.isArray(r.r['#text'])) {
      expect(r.r['#text'].length).toBeGreaterThanOrEqual(2)
    }
  })

  test('whitespace-only text between elements is dropped', () => {
    const r = new XMLParser().parse('<r>  <c>v</c>  </r>')
    // The whitespace "  " should be trimmed to "" and filtered
    expect(r.r.c).toBe('v')
  })

  test('whitespace-only text preserved when trimValues false', () => {
    const r = new XMLParser({ trimValues: false }).parse('<r>  <c>v</c>  </r>')
    // "  " is preserved as text
    expect(r.r['#text']).toBeDefined()
  })

  test('text with only newlines between elements', () => {
    const xml = '<r>\n<c>v</c>\n</r>'
    const r = new XMLParser().parse(xml)
    // newlines trimmed to empty, filtered
    expect(r.r.c).toBe('v')
  })

  test('CDATA concat with surrounding text', () => {
    const r = new XMLParser().parse('<r>hello<![CDATA[ world]]> end</r>')
    // text = "hello" + " world" + " end"
    expect(r.r).toContain('hello')
    expect(r.r).toContain('world')
  })

  test('multiple CDATA sections without cdataPropName merge as text', () => {
    const r = new XMLParser().parse('<r><![CDATA[a]]><![CDATA[b]]><![CDATA[c]]></r>')
    expect(r.r).toBe('abc')
  })

  test('comment between text fragments', () => {
    const r = new XMLParser().parse('<r>before<!-- comment -->after</r>')
    // Comments flush text. "before" is added, then "after" is added
    expect(r.r).toBeDefined()
  })
})

// ============================================================================
// PARSER — PRESERVEORDER EDGE CASES
// ============================================================================

describe('parser - preserveOrder edge cases', () => {
  test('empty document', () => {
    const r = new XMLParser({ preserveOrder: true }).parse('') as any[]
    expect(r).toEqual([])
  })

  test('single self-closing element', () => {
    const r = new XMLParser({ preserveOrder: true }).parse('<r/>') as any[]
    expect(r.length).toBe(1)
    expect(r[0].r).toBeDefined()
    expect(Array.isArray(r[0].r)).toBe(true)
    expect(r[0].r.length).toBe(0)
  })

  test('interleaved text and elements', () => {
    const r = new XMLParser({ preserveOrder: true }).parse('<r>t1<a>v</a>t2</r>') as any[]
    const children = r[0].r
    // Should have: text, a element, text
    expect(children.length).toBe(3)
  })

  test('preserveOrder skips DOCTYPE gracefully', () => {
    const r = new XMLParser({ preserveOrder: true }).parse('<!DOCTYPE html><r>v</r>') as any[]
    expect(r.length).toBe(1)
  })

  test('preserveOrder skips PI', () => {
    const r = new XMLParser({ preserveOrder: true }).parse('<?xml version="1.0"?><r>v</r>') as any[]
    expect(r.length).toBe(1)
    expect(r[0].r).toBeDefined()
  })

  test('preserveOrder with deeply nested', () => {
    const r = new XMLParser({ preserveOrder: true }).parse('<a><b><c>v</c></b></a>') as any[]
    expect(r[0].a[0].b[0].c[0]['#text']).toBe('v')
  })

  test('preserveOrder with multiple same-name elements', () => {
    const r = new XMLParser({ preserveOrder: true }).parse('<r><a>1</a><a>2</a><a>3</a></r>') as any[]
    const children = r[0].r
    expect(children.length).toBe(3)
    expect(children[0].a).toBeDefined()
    expect(children[1].a).toBeDefined()
    expect(children[2].a).toBeDefined()
  })
})

// ============================================================================
// BUILDER EDGE CASES
// ============================================================================

describe('builder - edge cases', () => {
  test('build empty object', () => {
    expect(new XMLBuilder().build({})).toBe('')
  })

  test('build with 0 as value', () => {
    const xml = new XMLBuilder().build({ r: 0 })
    expect(xml).toContain('<r>0</r>')
  })

  test('build with false as value', () => {
    const xml = new XMLBuilder().build({ r: false })
    expect(xml).toContain('<r>false</r>')
  })

  test('build with empty string value and suppressEmptyNode', () => {
    const xml = new XMLBuilder({ suppressEmptyNode: true }).build({ r: '' })
    expect(xml).toContain('<r/>')
  })

  test('build with empty string value without suppress', () => {
    const xml = new XMLBuilder({ suppressEmptyNode: false }).build({ r: '' })
    expect(xml).toContain('<r></r>')
  })

  test('build array at root level', () => {
    const xml = new XMLBuilder().build({ item: ['a', 'b', 'c'] })
    expect(xml).toContain('<item>a</item>')
    expect(xml).toContain('<item>b</item>')
    expect(xml).toContain('<item>c</item>')
  })

  test('build deeply nested (20 levels)', () => {
    let obj: any = 'deep'
    for (let i = 19; i >= 0; i--) obj = { [`l${i}`]: obj }
    const xml = new XMLBuilder({ format: true }).build(obj)
    expect(xml).toContain('deep')
    expect(xml).toContain('<l0>')
    expect(xml).toContain('<l19>')
  })

  test('build with special chars in tag name', () => {
    const xml = new XMLBuilder().build({ 'my-tag': 'v' })
    expect(xml).toContain('<my-tag>v</my-tag>')
  })

  test('build with unicode tag name', () => {
    const xml = new XMLBuilder().build({ 'données': 'valeur' })
    expect(xml).toContain('<données>')
  })

  test('build preserveOrder with empty array children', () => {
    const xml = new XMLBuilder({ preserveOrder: true, suppressEmptyNode: false }).build([
      { r: [] },
    ])
    expect(xml).toContain('<r></r>')
  })

  test('build comment with special characters', () => {
    const xml = new XMLBuilder({ commentPropName: '#c' }).build({
      r: { '#c': ' <tag> & stuff ' },
    })
    expect(xml).toContain('<!-- <tag> & stuff -->')
  })

  test('build CDATA with special characters', () => {
    const xml = new XMLBuilder({ cdataPropName: '#cd' }).build({
      r: { '#cd': '<script>alert("xss")</script>' },
    })
    expect(xml).toContain('<![CDATA[<script>alert("xss")</script>]]>')
  })

  test('build with all entity chars in text', () => {
    const xml = new XMLBuilder().build({ r: '& < > " \'' })
    expect(xml).toContain('&amp;')
    expect(xml).toContain('&lt;')
    expect(xml).toContain('&gt;')
    expect(xml).toContain('&quot;')
    expect(xml).toContain('&apos;')
  })

  test('build with all entity chars in attribute', () => {
    const xml = new XMLBuilder({ ignoreAttributes: false }).build({
      r: { '@_a': '& < > " \'', '#text': 't' },
    })
    expect(xml).toContain('&amp;')
    expect(xml).toContain('&lt;')
  })

  test('build empty prefix does not treat non-attr keys as attributes', () => {
    const xml = new XMLBuilder({ ignoreAttributes: false, attributeNamePrefix: '' }).build({
      r: { id: '1', '#text': 'text' },
    })
    // id should be treated as attribute
    expect(xml).toContain('id="1"')
    // #text should be treated as text content, not attribute
    expect(xml).toContain('text')
    expect(xml).not.toContain('#text="')
  })

  test('build formatted with empty children', () => {
    const xml = new XMLBuilder({ format: true, suppressEmptyNode: true }).build({
      r: { a: null, b: null },
    })
    expect(xml).toContain('<a/>')
    expect(xml).toContain('<b/>')
  })

  test('build preserveOrder formatted', () => {
    const xml = new XMLBuilder({ preserveOrder: true, format: true }).build([
      { r: [{ a: [{ '#text': '1' }] }, { b: [{ '#text': '2' }] }] },
    ])
    expect(xml).toContain('\n')
    expect(xml).toContain('<a>1</a>')
    expect(xml).toContain('<b>2</b>')
  })
})

// ============================================================================
// BUILDER — ATTRIBUTE PREFIX EDGE CASES
// ============================================================================

describe('builder - attribute prefix edge cases', () => {
  test('prefix that is a substring of key names', () => {
    const xml = new XMLBuilder({ ignoreAttributes: false, attributeNamePrefix: 'attr_' }).build({
      r: { attr_id: '1', name: 'test', '#text': 'text' },
    })
    expect(xml).toContain('id="1"')
    // 'name' does not start with 'attr_', so it should NOT be an attribute
    expect(xml).toContain('<name>test</name>')
  })

  test('long attribute prefix', () => {
    const xml = new XMLBuilder({ ignoreAttributes: false, attributeNamePrefix: 'ATTRIBUTE_' }).build({
      r: { ATTRIBUTE_id: '1', '#text': 'text' },
    })
    expect(xml).toContain('id="1"')
  })

  test('attribute group prevents prefix confusion', () => {
    const xml = new XMLBuilder({
      ignoreAttributes: false,
      attributesGroupName: '@attrs',
    }).build({
      r: { '@attrs': { '@_id': '1' }, child: 'v', '#text': 'text' },
    })
    expect(xml).toContain('id="1"')
    expect(xml).toContain('<child>v</child>')
  })
})

// ============================================================================
// VALIDATOR EDGE CASES
// ============================================================================

describe('validator - edge cases', () => {
  test('empty string is valid', () => {
    expect(XMLValidator('')).toBe(true)
  })

  test('whitespace only is valid', () => {
    expect(XMLValidator('   \n\t  ')).toBe(true)
  })

  test('just a comment is valid', () => {
    expect(XMLValidator('<!-- comment -->')).toBe(true)
  })

  test('just a PI is valid', () => {
    expect(XMLValidator('<?xml version="1.0"?>')).toBe(true)
  })

  test('comment + PI + root', () => {
    expect(XMLValidator('<!-- c --><?xml version="1.0"?><r/>')).toBe(true)
  })

  test('BOM + comment + PI + root', () => {
    expect(XMLValidator('\uFEFF<!-- c --><?xml version="1.0"?><r/>')).toBe(true)
  })

  test('unclosed PI returns error', () => {
    const r = XMLValidator('<?xml version="1.0"')
    expect(r).not.toBe(true)
    expect((r as ValidationError).err.code).toBe('InvalidXml')
  })

  test('unclosed DOCTYPE returns error', () => {
    const r = XMLValidator('<!DOCTYPE html')
    expect(r).not.toBe(true)
  })

  test('attribute value with > is valid', () => {
    expect(XMLValidator('<r a="x>y"/>')).toBe(true)
  })

  test('attribute value with newline is valid', () => {
    expect(XMLValidator(`<r a="line1\nline2"/>`)).toBe(true)
  })

  test('tag name starting with digit is invalid', () => {
    const r = XMLValidator('<1tag/>')
    expect(r).not.toBe(true)
  })

  test('tag name starting with - is invalid', () => {
    const r = XMLValidator('<-tag/>')
    expect(r).not.toBe(true)
  })

  test('tag name starting with . is invalid', () => {
    const r = XMLValidator('<.tag/>')
    expect(r).not.toBe(true)
  })

  test('tag name with digits after first char is valid', () => {
    expect(XMLValidator('<tag123/>')).toBe(true)
  })

  test('tag name with hyphens is valid', () => {
    expect(XMLValidator('<my-tag/>')).toBe(true)
  })

  test('tag name with dots is valid', () => {
    expect(XMLValidator('<my.tag/>')).toBe(true)
  })

  test('tag name with underscores is valid', () => {
    expect(XMLValidator('<my_tag/>')).toBe(true)
  })

  test('tag name with colon is valid', () => {
    expect(XMLValidator('<ns:tag/>')).toBe(true)
  })

  test('whitespace after closing tag name', () => {
    expect(XMLValidator('<r>text</r  >')).toBe(true)
  })

  test('whitespace before /> in self-closing', () => {
    // The validator skips whitespace and checks for >, not / immediately
    // Actually the validator reads attributes until it hits / or >
    // It would try to read "   " as attributes, find no name, and...
    // Let me check: after tag name, enters attribute loop, skipWhitespace,
    // then ch = 47 (/), enters self-closing branch. Should be fine.
    expect(XMLValidator('<r  />')).toBe(true)
  })

  test('DOCTYPE with nested angle brackets', () => {
    expect(XMLValidator('<!DOCTYPE note [<!ELEMENT note (#PCDATA)><!ATTLIST note type CDATA #IMPLIED>]><note/>')).toBe(true)
  })

  test('very deeply nested valid XML', () => {
    let xml = ''
    for (let i = 0; i < 200; i++) xml += `<l${i}>`
    xml += 'text'
    for (let i = 199; i >= 0; i--) xml += `</l${i}>`
    expect(XMLValidator(xml)).toBe(true)
  })

  test('very deeply nested with mismatch at bottom', () => {
    let xml = ''
    for (let i = 0; i < 50; i++) xml += `<l${i}>`
    xml += '<wrong>'
    for (let i = 49; i >= 0; i--) xml += `</l${i}>`
    const r = XMLValidator(xml)
    expect(r).not.toBe(true)
  })

  test('unicode tag name in validator', () => {
    expect(XMLValidator('<données>texte</données>')).toBe(true)
  })

  test('CDATA inside nested element', () => {
    expect(XMLValidator('<a><b><![CDATA[data]]></b></a>')).toBe(true)
  })

  test('multiple CDATA in one element', () => {
    expect(XMLValidator('<r><![CDATA[a]]><![CDATA[b]]></r>')).toBe(true)
  })

  test('comment outside and inside root', () => {
    expect(XMLValidator('<!-- outside --><r><!-- inside --></r>')).toBe(true)
  })

  test('self-closing root counts as root', () => {
    // After self-closing root, text should be rejected
    const r = XMLValidator('<r/>text')
    expect(r).not.toBe(true)
  })

  test('attribute after / in tag', () => {
    // <r / attr="v"> is invalid (/ must be followed by >)
    const r = XMLValidator('<r / >')
    expect(r).not.toBe(true)
  })

  test('error message contains tag name', () => {
    const r = XMLValidator('<root></wrong>') as ValidationError
    expect(r.err.msg).toContain('wrong')
  })

  test('error for unclosed tag contains tag name', () => {
    const r = XMLValidator('<open>text') as ValidationError
    expect(r.err.msg).toContain('open')
  })
})

// ============================================================================
// ROUNDTRIP STRESS TESTS
// ============================================================================

describe('roundtrip stress tests', () => {
  function roundtrip(xml: string, opts: any = {}) {
    const parser = new XMLParser({ ignoreAttributes: false, ...opts })
    const obj = parser.parse(xml)
    const builder = new XMLBuilder({ ignoreAttributes: false, ...opts })
    return builder.build(obj)
  }

  test('entities survive roundtrip', () => {
    const xml = '<r>a &amp; b &lt; c &gt; d</r>'
    const rebuilt = roundtrip(xml)
    // After parse: "a & b < c > d"
    // After build: "a &amp; b &lt; c &gt; d"
    expect(rebuilt).toContain('&amp;')
    expect(rebuilt).toContain('&lt;')
    expect(rebuilt).toContain('&gt;')
  })

  test('attribute entities survive roundtrip', () => {
    const rebuilt = roundtrip('<r a="x &amp; y">t</r>')
    expect(rebuilt).toContain('&amp;')
  })

  test('nested structure roundtrip', () => {
    const xml = '<a><b id="1"><c>text</c><d/></b><b id="2"><c>more</c></b></a>'
    const rebuilt = roundtrip(xml)
    expect(rebuilt).toContain('id="1"')
    expect(rebuilt).toContain('id="2"')
    expect(rebuilt).toContain('text')
    expect(rebuilt).toContain('more')
  })

  test('preserveOrder roundtrip with mixed content', () => {
    const xml = '<r>text1<a>v1</a>text2<b>v2</b>text3</r>'
    const opts = { preserveOrder: true }
    const rebuilt = roundtrip(xml, opts)
    expect(rebuilt).toContain('text1')
    expect(rebuilt).toContain('<a>v1</a>')
    expect(rebuilt).toContain('text2')
    expect(rebuilt).toContain('<b>v2</b>')
    expect(rebuilt).toContain('text3')
  })

  test('comment roundtrip', () => {
    const opts = { commentPropName: '#c' }
    const rebuilt = roundtrip('<r><!-- hello world --></r>', opts)
    expect(rebuilt).toContain('<!-- hello world -->')
  })

  test('CDATA roundtrip', () => {
    const opts = { cdataPropName: '#cd' }
    const rebuilt = roundtrip('<r><![CDATA[<raw>&data</raw>]]></r>', opts)
    expect(rebuilt).toContain('<![CDATA[<raw>&data</raw>]]>')
  })

  test('numeric values roundtrip', () => {
    const xml = '<r><n>42</n><f>3.14</f></r>'
    const rebuilt = roundtrip(xml)
    // Numbers are encoded back as text
    expect(rebuilt).toContain('42')
    expect(rebuilt).toContain('3.14')
  })

  test('boolean values roundtrip', () => {
    const rebuilt = roundtrip('<r><a>true</a><b>false</b></r>')
    expect(rebuilt).toContain('true')
    expect(rebuilt).toContain('false')
  })

  test('large document roundtrip', () => {
    let xml = '<root>'
    for (let i = 0; i < 100; i++) {
      xml += `<item id="${i}"><name>Item ${i}</name><value>${i * 2.5}</value></item>`
    }
    xml += '</root>'
    const rebuilt = roundtrip(xml)
    expect(rebuilt).toContain('id="0"')
    expect(rebuilt).toContain('id="99"')
    expect(rebuilt).toContain('Item 0')
    expect(rebuilt).toContain('Item 99')
  })
})

// ============================================================================
// ADVERSARIAL / SECURITY-RELATED
// ============================================================================

describe('security edge cases', () => {
  test('billion laughs style expansion - parser does not expand DOCTYPE entities', () => {
    // Our parser doesn't expand DOCTYPE-defined entities, so this is safe
    const xml = `<?xml version="1.0"?>
<!DOCTYPE lolz [
  <!ENTITY lol "lol">
  <!ENTITY lol2 "&lol;&lol;&lol;&lol;&lol;&lol;&lol;&lol;&lol;&lol;">
]>
<r>&lol2;</r>`
    // Should not hang or consume excessive memory
    const r = new XMLParser().parse(xml)
    expect(r).toBeDefined()
    // &lol2; is not a registered entity, so it stays as-is
    expect(r.r).toBe('&lol2;')
  })

  test('XXE-style external entity reference - parser ignores', () => {
    const xml = `<?xml version="1.0"?>
<!DOCTYPE foo [
  <!ENTITY xxe SYSTEM "file:///etc/passwd">
]>
<r>&xxe;</r>`
    const r = new XMLParser().parse(xml)
    // Parser doesn't resolve external entities
    expect(r.r).toBe('&xxe;')
  })

  test('deeply nested to test stack overflow resistance', () => {
    let xml = ''
    const depth = 500
    for (let i = 0; i < depth; i++) xml += '<x>'
    xml += 'v'
    for (let i = 0; i < depth; i++) xml += '</x>'
    // Should not stack overflow (500 recursive calls is fine)
    const r = new XMLParser().parse(xml)
    let curr: any = r
    for (let i = 0; i < depth; i++) curr = curr.x
    expect(curr).toBe('v')
  })

  test('CDATA with ]]> lookalike inside', () => {
    // Valid: CDATA ends at first ]]>
    const r = new XMLParser().parse('<r><![CDATA[text]]>after</r>')
    // CDATA is "text", then "after" is regular text
    expect(r.r).toContain('text')
  })

  test('script injection in attribute values', () => {
    const r = new XMLParser({ ignoreAttributes: false }).parse('<r onclick="alert(1)">t</r>')
    expect(r.r['@_onclick']).toBe('alert(1)')
    // Builder should encode it properly
    const xml = new XMLBuilder({ ignoreAttributes: false }).build(r)
    expect(xml).toContain('alert(1)') // kept as-is in attribute (no < > to encode)
  })

  test('script injection in text content', () => {
    // If text contains <script>, it should be entity-encoded on rebuild
    const r = new XMLParser().parse('<r>&lt;script&gt;alert(1)&lt;/script&gt;</r>')
    expect(r.r).toBe('<script>alert(1)</script>')
    const xml = new XMLBuilder().build({ r: r.r })
    expect(xml).toContain('&lt;script&gt;')
    expect(xml).not.toContain('<script>')
  })
})

// ============================================================================
// COMPLEX REAL-WORLD EDGE CASES
// ============================================================================

describe('complex real-world edge cases', () => {
  test('mixed namespace prefixes in deeply nested structure', () => {
    const xml = `<root xmlns:a="http://a.com" xmlns:b="http://b.com">
  <a:section>
    <b:item a:id="1" b:type="main">
      <a:title>Hello</a:title>
      <b:content>World</b:content>
    </b:item>
  </a:section>
</root>`
    const r = new XMLParser({ ignoreAttributes: false, removeNSPrefix: true }).parse(xml)
    expect(r.root.section.item['@_id']).toBe('1')
    expect(r.root.section.item['@_type']).toBe('main')
    expect(r.root.section.item.title).toBe('Hello')
    expect(r.root.section.item.content).toBe('World')
  })

  test('XML with every feature simultaneously', () => {
    const xml = `<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE root>
<!-- Top level comment -->
<root xmlns:ns="http://example.com" id="main">
  <?processing instruction?>
  <!-- Inner comment -->
  <ns:section class="primary">
    <![CDATA[Raw <content> & stuff]]>
    <item type="text">Regular &amp; text</item>
    <item type="number">42</item>
    <item type="bool">true</item>
    <empty/>
    <self-closing attr="val"/>
  </ns:section>
  <list>
    <entry>1</entry>
    <entry>2</entry>
    <entry>3</entry>
  </list>
</root>`
    const r = new XMLParser({
      ignoreAttributes: false,
      commentPropName: '#comment',
      removeNSPrefix: true,
    }).parse(xml)

    expect(r.root['@_id']).toBe('main')
    expect(r.root.section['@_class']).toBe('primary')
    expect(r.root.section.item).toHaveLength(3)
    expect(r.root.section.item[0]['#text']).toBe('Regular & text')
    expect(r.root.section.item[1]['#text']).toBe(42)
    expect(r.root.section.item[2]['#text']).toBe(true)
    expect(r.root.section.empty).toBe('')
    expect(r.root.section['self-closing']['@_attr']).toBe('val')
    expect(r.root.list.entry).toEqual([1, 2, 3])
  })

  test('RSS 2.0 with CDATA descriptions', () => {
    const xml = `<?xml version="1.0"?>
<rss version="2.0">
  <channel>
    <title>My Blog</title>
    <item>
      <title>Post &amp; Title</title>
      <description><![CDATA[<p>HTML content with <b>bold</b></p>]]></description>
    </item>
    <item>
      <title>Another Post</title>
      <description><![CDATA[<p>More <i>HTML</i></p>]]></description>
    </item>
  </channel>
</rss>`
    const r = new XMLParser({ ignoreAttributes: false }).parse(xml)
    expect(r.rss.channel.item).toHaveLength(2)
    expect(r.rss.channel.item[0].title).toBe('Post & Title')
    expect(r.rss.channel.item[0].description).toBe('<p>HTML content with <b>bold</b></p>')
    expect(r.rss.channel.item[1].description).toBe('<p>More <i>HTML</i></p>')
  })

  test('XML with Windows-style line endings', () => {
    const xml = '<root>\r\n  <child>text</child>\r\n</root>'
    const r = new XMLParser().parse(xml)
    expect(r.root.child).toBe('text')
  })

  test('XML with mixed line endings', () => {
    const xml = '<root>\r\n  <a>1</a>\n  <b>2</b>\r</root>'
    const r = new XMLParser().parse(xml)
    expect(r.root.a).toBe(1)
    expect(r.root.b).toBe(2)
  })

  test('HTML5-like structure with unpaired tags', () => {
    const xml = `<html>
  <head><title>Test</title></head>
  <body>
    <p>Para 1</p>
    <br>
    <p>Para 2</p>
    <hr>
    <img src="test.png">
  </body>
</html>`
    const r = new XMLParser({
      ignoreAttributes: false,
      unpairedTags: ['br', 'hr', 'img'],
    }).parse(xml)
    expect(r.html.head.title).toBe('Test')
    expect(r.html.body.p).toHaveLength(2)
    expect(r.html.body.img['@_src']).toBe('test.png')
  })

  test('plist XML format', () => {
    const xml = `<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0">
  <dict>
    <key>CFBundleName</key>
    <string>MyApp</string>
    <key>CFBundleVersion</key>
    <string>1.0.0</string>
  </dict>
</plist>`
    const r = new XMLParser({ ignoreAttributes: false }).parse(xml)
    expect(r.plist['@_version']).toBe('1.0')
    expect(r.plist.dict.key).toHaveLength(2)
    expect(r.plist.dict.string).toHaveLength(2)
    expect(r.plist.dict.key[0]).toBe('CFBundleName')
    expect(r.plist.dict.string[0]).toBe('MyApp')
  })

  test('SVG with complex paths', () => {
    const xml = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100">
  <path d="M 10 10 L 90 10 L 90 90 L 10 90 Z" fill="none" stroke="black"/>
  <circle cx="50" cy="50" r="40" fill="rgba(255,0,0,0.5)"/>
  <text x="50" y="55" text-anchor="middle" font-size="12">Hello &amp; World</text>
</svg>`
    const r = new XMLParser({ ignoreAttributes: false }).parse(xml)
    expect(r.svg.path['@_d']).toBe('M 10 10 L 90 10 L 90 90 L 10 90 Z')
    expect(r.svg.circle['@_fill']).toBe('rgba(255,0,0,0.5)')
    expect(r.svg.text['#text']).toBe('Hello & World')
  })

  test('SOAP fault response', () => {
    const xml = `<soap:Envelope xmlns:soap="http://schemas.xmlsoap.org/soap/envelope/">
  <soap:Body>
    <soap:Fault>
      <faultcode>soap:Server</faultcode>
      <faultstring>Internal Server Error</faultstring>
      <detail>
        <error code="500">Something went wrong &amp; badly</error>
      </detail>
    </soap:Fault>
  </soap:Body>
</soap:Envelope>`
    const r = new XMLParser({ ignoreAttributes: false, removeNSPrefix: true }).parse(xml)
    expect(r.Envelope.Body.Fault.faultcode).toBe('soap:Server')
    expect(r.Envelope.Body.Fault.faultstring).toBe('Internal Server Error')
    expect(r.Envelope.Body.Fault.detail.error['#text']).toBe('Something went wrong & badly')
    expect(r.Envelope.Body.Fault.detail.error['@_code']).toBe('500')
  })
})
