import { describe, expect, test } from 'bun:test'
import { EntityDecoder, encodeEntities } from '../src/entities'

// ============================================================================
// EntityDecoder
// ============================================================================

describe('EntityDecoder', () => {
  describe('XML entities', () => {
    test('decodes &lt;', () => {
      const d = new EntityDecoder()
      expect(d.decodeEntities('&lt;')).toBe('<')
    })

    test('decodes &gt;', () => {
      const d = new EntityDecoder()
      expect(d.decodeEntities('&gt;')).toBe('>')
    })

    test('decodes &amp;', () => {
      const d = new EntityDecoder()
      expect(d.decodeEntities('&amp;')).toBe('&')
    })

    test('decodes &quot;', () => {
      const d = new EntityDecoder()
      expect(d.decodeEntities('&quot;')).toBe('"')
    })

    test('decodes &apos;', () => {
      const d = new EntityDecoder()
      expect(d.decodeEntities('&apos;')).toBe('\'')
    })

    test('decodes all XML entities together', () => {
      const d = new EntityDecoder()
      expect(d.decodeEntities('&lt;&gt;&amp;&quot;&apos;')).toBe('<>&"\'')
    })

    test('decodes entities mixed with text', () => {
      const d = new EntityDecoder()
      expect(d.decodeEntities('hello &amp; world')).toBe('hello & world')
    })

    test('decodes multiple occurrences of same entity', () => {
      const d = new EntityDecoder()
      expect(d.decodeEntities('&amp; and &amp; and &amp;')).toBe('& and & and &')
    })

    test('handles adjacent entities', () => {
      const d = new EntityDecoder()
      expect(d.decodeEntities('&lt;&gt;')).toBe('<>')
    })
  })

  describe('numeric entities (decimal)', () => {
    test('decodes basic ASCII', () => {
      const d = new EntityDecoder()
      expect(d.decodeEntities('&#65;')).toBe('A')
      expect(d.decodeEntities('&#97;')).toBe('a')
      expect(d.decodeEntities('&#48;')).toBe('0')
    })

    test('decodes space', () => {
      const d = new EntityDecoder()
      expect(d.decodeEntities('&#32;')).toBe(' ')
    })

    test('decodes newline', () => {
      const d = new EntityDecoder()
      expect(d.decodeEntities('&#10;')).toBe('\n')
    })

    test('decodes tab', () => {
      const d = new EntityDecoder()
      expect(d.decodeEntities('&#9;')).toBe('\t')
    })

    test('decodes full word', () => {
      const d = new EntityDecoder()
      expect(d.decodeEntities('&#72;&#101;&#108;&#108;&#111;')).toBe('Hello')
    })

    test('decodes high Unicode code points', () => {
      const d = new EntityDecoder()
      expect(d.decodeEntities('&#8364;')).toBe('€')
      expect(d.decodeEntities('&#169;')).toBe('©')
      expect(d.decodeEntities('&#174;')).toBe('®')
    })

    test('decodes emoji via numeric entity', () => {
      const d = new EntityDecoder()
      expect(d.decodeEntities('&#128512;')).toBe('😀')
    })

    test('handles zero', () => {
      const d = new EntityDecoder()
      // &#0; -> NUL character
      expect(d.decodeEntities('&#0;')).toBe('\0')
    })
  })

  describe('hex entities', () => {
    test('decodes lowercase hex', () => {
      const d = new EntityDecoder()
      expect(d.decodeEntities('&#x41;')).toBe('A')
      expect(d.decodeEntities('&#x61;')).toBe('a')
    })

    test('decodes uppercase hex', () => {
      const d = new EntityDecoder()
      expect(d.decodeEntities('&#x4A;')).toBe('J')
    })

    test('decodes mixed case hex', () => {
      const d = new EntityDecoder()
      expect(d.decodeEntities('&#x4a;')).toBe('J')
    })

    test('decodes full word in hex', () => {
      const d = new EntityDecoder()
      expect(d.decodeEntities('&#x48;&#x65;&#x6C;&#x6C;&#x6F;')).toBe('Hello')
    })

    test('decodes high code points in hex', () => {
      const d = new EntityDecoder()
      expect(d.decodeEntities('&#x20AC;')).toBe('€')
    })

    test('decodes emoji in hex', () => {
      const d = new EntityDecoder()
      expect(d.decodeEntities('&#x1F600;')).toBe('😀')
    })
  })

  describe('HTML entities', () => {
    test('does not decode HTML entities by default', () => {
      const d = new EntityDecoder()
      expect(d.decodeEntities('&nbsp;')).toBe('&nbsp;')
      expect(d.decodeEntities('&copy;')).toBe('&copy;')
    })

    test('decodes common HTML entities when enabled', () => {
      const d = new EntityDecoder(true)
      expect(d.decodeEntities('&nbsp;')).toBe('\u00A0')
      expect(d.decodeEntities('&copy;')).toBe('©')
      expect(d.decodeEntities('&reg;')).toBe('®')
      expect(d.decodeEntities('&trade;')).toBe('™')
    })

    test('decodes currency symbols', () => {
      const d = new EntityDecoder(true)
      expect(d.decodeEntities('&euro;')).toBe('€')
      expect(d.decodeEntities('&pound;')).toBe('£')
      expect(d.decodeEntities('&yen;')).toBe('¥')
      expect(d.decodeEntities('&cent;')).toBe('¢')
    })

    test('decodes punctuation entities', () => {
      const d = new EntityDecoder(true)
      expect(d.decodeEntities('&ndash;')).toBe('–')
      expect(d.decodeEntities('&mdash;')).toBe('—')
      expect(d.decodeEntities('&bull;')).toBe('•')
      expect(d.decodeEntities('&hellip;')).toBe('…')
    })

    test('decodes quote entities', () => {
      const d = new EntityDecoder(true)
      expect(d.decodeEntities('&lsquo;')).toBe('\u2018')
      expect(d.decodeEntities('&rsquo;')).toBe('\u2019')
      expect(d.decodeEntities('&ldquo;')).toBe('\u201C')
      expect(d.decodeEntities('&rdquo;')).toBe('\u201D')
    })

    test('decodes arrow entities', () => {
      const d = new EntityDecoder(true)
      expect(d.decodeEntities('&larr;')).toBe('←')
      expect(d.decodeEntities('&rarr;')).toBe('→')
      expect(d.decodeEntities('&uarr;')).toBe('↑')
      expect(d.decodeEntities('&darr;')).toBe('↓')
    })

    test('decodes Greek letters', () => {
      const d = new EntityDecoder(true)
      expect(d.decodeEntities('&alpha;')).toBe('α')
      expect(d.decodeEntities('&beta;')).toBe('β')
      expect(d.decodeEntities('&gamma;')).toBe('γ')
      expect(d.decodeEntities('&delta;')).toBe('δ')
      expect(d.decodeEntities('&pi;')).toBe('π')
      expect(d.decodeEntities('&omega;')).toBe('ω')
    })

    test('decodes uppercase Greek letters', () => {
      const d = new EntityDecoder(true)
      expect(d.decodeEntities('&Alpha;')).toBe('Α')
      expect(d.decodeEntities('&Omega;')).toBe('Ω')
      expect(d.decodeEntities('&Sigma;')).toBe('Σ')
    })

    test('decodes math symbols', () => {
      const d = new EntityDecoder(true)
      expect(d.decodeEntities('&times;')).toBe('×')
      expect(d.decodeEntities('&divide;')).toBe('÷')
      expect(d.decodeEntities('&plusmn;')).toBe('±')
      expect(d.decodeEntities('&infin;')).toBe('∞')
      expect(d.decodeEntities('&ne;')).toBe('≠')
      expect(d.decodeEntities('&le;')).toBe('≤')
      expect(d.decodeEntities('&ge;')).toBe('≥')
    })

    test('decodes accented characters', () => {
      const d = new EntityDecoder(true)
      expect(d.decodeEntities('&Agrave;')).toBe('À')
      expect(d.decodeEntities('&eacute;')).toBe('é')
      expect(d.decodeEntities('&ntilde;')).toBe('ñ')
      expect(d.decodeEntities('&uuml;')).toBe('ü')
      expect(d.decodeEntities('&ccedil;')).toBe('ç')
    })

    test('decodes card suit symbols', () => {
      const d = new EntityDecoder(true)
      expect(d.decodeEntities('&spades;')).toBe('♠')
      expect(d.decodeEntities('&clubs;')).toBe('♣')
      expect(d.decodeEntities('&hearts;')).toBe('♥')
      expect(d.decodeEntities('&diams;')).toBe('♦')
    })

    test('HTML entities still decode XML entities', () => {
      const d = new EntityDecoder(true)
      expect(d.decodeEntities('&amp;')).toBe('&')
      expect(d.decodeEntities('&lt;')).toBe('<')
    })
  })

  describe('custom entities', () => {
    test('adds and decodes custom entity', () => {
      const d = new EntityDecoder()
      d.addEntity('foo', 'bar')
      expect(d.decodeEntities('&foo;')).toBe('bar')
    })

    test('custom entity overrides XML entity', () => {
      const d = new EntityDecoder()
      d.addEntity('amp', 'CUSTOM')
      expect(d.decodeEntities('&amp;')).toBe('CUSTOM')
    })

    test('multiple custom entities', () => {
      const d = new EntityDecoder()
      d.addEntity('greet', 'hello')
      d.addEntity('name', 'world')
      expect(d.decodeEntities('&greet; &name;')).toBe('hello world')
    })

    test('custom entity with special characters in value', () => {
      const d = new EntityDecoder()
      d.addEntity('special', '<b>bold</b>')
      expect(d.decodeEntities('&special;')).toBe('<b>bold</b>')
    })

    test('custom entity with unicode value', () => {
      const d = new EntityDecoder()
      d.addEntity('star', '★')
      expect(d.decodeEntities('&star;')).toBe('★')
    })
  })

  describe('edge cases', () => {
    test('returns input unchanged when no & present', () => {
      const d = new EntityDecoder()
      const text = 'hello world no entities'
      expect(d.decodeEntities(text)).toBe(text)
    })

    test('preserves bare & without semicolon', () => {
      const d = new EntityDecoder()
      expect(d.decodeEntities('a & b')).toBe('a & b')
    })

    test('preserves unknown named entities', () => {
      const d = new EntityDecoder()
      expect(d.decodeEntities('&doesnotexist;')).toBe('&doesnotexist;')
    })

    test('handles empty string', () => {
      const d = new EntityDecoder()
      expect(d.decodeEntities('')).toBe('')
    })

    test('handles string with only entities', () => {
      const d = new EntityDecoder()
      expect(d.decodeEntities('&lt;&gt;')).toBe('<>')
    })

    test('handles entity at start of string', () => {
      const d = new EntityDecoder()
      expect(d.decodeEntities('&lt;hello')).toBe('<hello')
    })

    test('handles entity at end of string', () => {
      const d = new EntityDecoder()
      expect(d.decodeEntities('hello&gt;')).toBe('hello>')
    })

    test('handles incomplete entity (no semicolon)', () => {
      const d = new EntityDecoder()
      expect(d.decodeEntities('&amp')).toBe('&amp')
    })

    test('handles nested & in entity-like patterns', () => {
      const d = new EntityDecoder()
      expect(d.decodeEntities('&amp;amp;')).toBe('&amp;')
    })

    test('handles very long input efficiently', () => {
      const d = new EntityDecoder()
      const longText = 'a'.repeat(10000)
      expect(d.decodeEntities(longText)).toBe(longText)
    })

    test('handles many entities in sequence', () => {
      const d = new EntityDecoder()
      const input = '&lt;'.repeat(100)
      const expected = '<'.repeat(100)
      expect(d.decodeEntities(input)).toBe(expected)
    })
  })
})

// ============================================================================
// encodeEntities
// ============================================================================

describe('encodeEntities', () => {
  test('encodes ampersand', () => {
    expect(encodeEntities('&')).toBe('&amp;')
  })

  test('encodes less-than', () => {
    expect(encodeEntities('<')).toBe('&lt;')
  })

  test('encodes greater-than', () => {
    expect(encodeEntities('>')).toBe('&gt;')
  })

  test('encodes double quote', () => {
    expect(encodeEntities('"')).toBe('&quot;')
  })

  test('encodes single quote', () => {
    expect(encodeEntities('\'')).toBe('&apos;')
  })

  test('encodes all special characters', () => {
    expect(encodeEntities('&<>"\'')).toBe('&amp;&lt;&gt;&quot;&apos;')
  })

  test('leaves regular text unchanged', () => {
    expect(encodeEntities('hello world')).toBe('hello world')
  })

  test('handles empty string', () => {
    expect(encodeEntities('')).toBe('')
  })

  test('handles text with mixed special and normal', () => {
    expect(encodeEntities('a & b < c')).toBe('a &amp; b &lt; c')
  })

  test('handles unicode text without encoding', () => {
    expect(encodeEntities('こんにちは')).toBe('こんにちは')
  })

  test('handles numbers and special chars', () => {
    expect(encodeEntities('100% <done>')).toBe('100% &lt;done&gt;')
  })

  test('handles long strings', () => {
    const input = 'hello & world '.repeat(1000)
    const result = encodeEntities(input)
    expect(result).toContain('&amp;')
    expect(result.split('&amp;').length).toBe(1001)
  })

  test('roundtrips with EntityDecoder', () => {
    const d = new EntityDecoder()
    const original = 'a & b < c > d " e \' f'
    const encoded = encodeEntities(original)
    const decoded = d.decodeEntities(encoded)
    expect(decoded).toBe(original)
  })
})
