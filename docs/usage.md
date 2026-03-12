# Usage

ts-xml provides three main APIs: parsing, building, and validating XML.

## Parsing XML

```ts
import { XMLParser } from 'ts-xml'

const parser = new XMLParser()
const result = parser.parse('<root><item>Hello</item><item>World</item></root>')
// { root: { item: ['Hello', 'World'] } }
```

### With Attributes

```ts
const parser = new XMLParser({ ignoreAttributes: false })
const result = parser.parse('<user id="1" role="admin"><name>Alice</name></user>')
// { user: { '@_id': '1', '@_role': 'admin', name: 'Alice' } }
```

### Parse Uint8Array

```ts
const parser = new XMLParser()
const bytes = new TextEncoder().encode('<root>data</root>')
const result = parser.parse(bytes)
// { root: 'data' }
```

## Building XML

```ts
import { XMLBuilder } from 'ts-xml'

const builder = new XMLBuilder({ format: true, indentBy: '  ' })
const xml = builder.build({
  catalog: {
    product: [
      { name: 'Widget', price: 9.99 },
      { name: 'Gadget', price: 19.99 },
    ],
  },
})
```

### With Attributes

```ts
const builder = new XMLBuilder({ ignoreAttributes: false })
const xml = builder.build({
  user: { '@_id': '1', name: 'Alice' },
})
// <user id="1"><name>Alice</name></user>
```

## Validating XML

```ts
import { XMLValidator } from 'ts-xml'

const valid = XMLValidator('<root><child/></root>')
console.log(valid) // true

const invalid = XMLValidator('<root><child></root>')
if (invalid !== true) {
  console.log(invalid.err.code)  // 'InvalidTag'
  console.log(invalid.err.msg)   // error message
  console.log(invalid.err.line)  // line number
  console.log(invalid.err.col)   // column number
}
```

### Validator Options

```ts
// Allow boolean attributes (e.g., <input disabled/>)
XMLValidator('<input disabled/>', { allowBooleanAttributes: true })

// Allow unpaired tags (e.g., <br> without </br>)
XMLValidator('<p>text<br>more</p>', { unpairedTags: ['br'] })
```

## Custom Entities

```ts
const parser = new XMLParser()
parser.addEntity('copy', '\u00A9')
parser.addEntity('trade', '\u2122')

const result = parser.parse('<r>&copy; 2024 &trade;</r>')
// { r: '© 2024 ™' }
```

## Testing

```bash
bun test
```
