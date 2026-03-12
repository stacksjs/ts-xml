# Preserve Order

Standard JavaScript objects don't guarantee property order. Use `preserveOrder` mode to maintain the exact element sequence from the XML.

## Parsing with Order Preservation

```ts
import { XMLParser } from 'ts-xml'

const parser = new XMLParser({ preserveOrder: true })
const result = parser.parse('<root><a>1</a><b>2</b><a>3</a></root>')
```

The output is an array-based structure:

```json
[
  {
    "root": [
      { "a": [{ "#text": "1" }] },
      { "b": [{ "#text": "2" }] },
      { "a": [{ "#text": "3" }] }
    ]
  }
]
```

Each element is an object with a single key (the tag name) whose value is an array of children. This preserves the original order, including interleaved elements of the same name.

## Attributes in Ordered Mode

Attributes are stored under the `:@` key:

```ts
const parser = new XMLParser({
  preserveOrder: true,
  ignoreAttributes: false,
})
const result = parser.parse('<item id="1">text</item>')
```

```json
[
  {
    "item": [{ "#text": "text" }],
    ":@": { "@_id": "1" }
  }
]
```

## Building from Ordered Format

The builder can reconstruct XML from ordered data:

```ts
import { XMLBuilder } from 'ts-xml'

const builder = new XMLBuilder({ preserveOrder: true })
const xml = builder.build([
  {
    root: [
      { a: [{ '#text': '1' }] },
      { b: [{ '#text': '2' }] },
      { a: [{ '#text': '3' }] },
    ],
  },
])
// <root><a>1</a><b>2</b><a>3</a></root>
```

## Round-Trip Preservation

The ordered format enables lossless round-tripping:

```ts
import { XMLParser, XMLBuilder } from 'ts-xml'

const xml = '<root><a>1</a><b>2</b><a>3</a></root>'

const parser = new XMLParser({ preserveOrder: true })
const builder = new XMLBuilder({ preserveOrder: true })

const obj = parser.parse(xml)
const rebuilt = builder.build(obj)
// rebuilt === '<root><a>1</a><b>2</b><a>3</a></root>'
```

## When to Use Ordered Mode

Use `preserveOrder` when:

- Element order matters (e.g., mixed content documents)
- You need to round-trip XML without losing structure
- The same tag name appears multiple times at the same level and order matters
- You're processing document-oriented XML (not data-oriented)

Use standard (unordered) mode when:

- You're working with data-oriented XML (configs, APIs, feeds)
- Property access convenience is more important than order
- You don't need to reconstruct the exact original XML
