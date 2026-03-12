# Entity Handling

ts-xml supports XML entities, HTML entities, numeric entities, and custom entities.

## XML Entities

The five standard XML entities are always supported:

| Entity | Character |
|--------|-----------|
| `&amp;` | `&` |
| `&lt;` | `<` |
| `&gt;` | `>` |
| `&quot;` | `"` |
| `&apos;` | `'` |

```ts
import { XMLParser } from 'ts-xml'

const parser = new XMLParser()
parser.parse('<r>a &amp; b &lt; c</r>')
// { r: 'a & b < c' }
```

## HTML Entities

Enable HTML entity decoding for entities like `&nbsp;`, `&copy;`, etc.:

```ts
const parser = new XMLParser({ htmlEntities: true })
parser.parse('<r>&copy; 2024 &mdash; Hello&nbsp;World</r>')
// { r: '© 2024 — Hello\u00A0World' }
```

## Numeric Entities

Decimal and hexadecimal character references are automatically decoded:

```ts
const parser = new XMLParser()

// Decimal: &#169; → ©
parser.parse('<r>&#169;</r>')
// { r: '©' }

// Hex: &#x00A9; → ©
parser.parse('<r>&#x00A9;</r>')
// { r: '©' }

// High Unicode: &#128512; → 😀
parser.parse('<r>&#128512;</r>')
// { r: '😀' }
```

## Custom Entities

Add custom entity mappings:

```ts
const parser = new XMLParser()
parser.addEntity('company', 'Acme Corp')
parser.addEntity('year', '2024')

parser.parse('<footer>&company; &copy; &year;</footer>')
// { footer: 'Acme Corp © 2024' }
```

## CDATA and Entities

CDATA sections are **not** entity-decoded. This is correct XML behavior:

```ts
const parser = new XMLParser()

// Entity in text: decoded
parser.parse('<r>&amp;</r>')
// { r: '&' }

// Entity in CDATA: preserved as-is
parser.parse('<r><![CDATA[&amp;]]></r>')
// { r: '&amp;' }
```

## Entity Encoding in Builder

The builder automatically encodes special characters:

```ts
import { XMLBuilder } from 'ts-xml'

const builder = new XMLBuilder()
builder.build({ root: 'a & b < c > d' })
// <root>a &amp; b &lt; c &gt; d</root>
```

Attribute values are also encoded:

```ts
const builder = new XMLBuilder({ ignoreAttributes: false })
builder.build({ root: { '@_title': 'a & "b"' } })
// <root title="a &amp; &quot;b&quot;"></root>
```

## Disabling Entity Processing

```ts
// Parser: don't decode entities
const parser = new XMLParser({ processEntities: false })
parser.parse('<r>&amp;</r>')
// { r: '&amp;' }

// Builder: don't encode entities
const builder = new XMLBuilder({ processEntities: false })
builder.build({ root: 'a & b' })
// <root>a & b</root>
```

## Using EntityDecoder Directly

```ts
import { EntityDecoder, encodeEntities } from 'ts-xml'

const decoder = new EntityDecoder()
decoder.decodeEntities('&amp; &lt; &#169;')
// '& < ©'

encodeEntities('a & b < c')
// 'a &amp; b &lt; c'
```
