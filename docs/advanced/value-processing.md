# Value Processing

ts-xml provides several callbacks and options to customize how values are transformed during parsing and building.

## Tag Value Processor

Transform text content during parsing:

```ts
import { XMLParser } from 'ts-xml'

const parser = new XMLParser({
  tagValueProcessor: (tagName, value, jPath, hasAttributes, isLeaf) => {
    // Trim and uppercase all values
    return value.trim().toUpperCase()
  },
})

parser.parse('<root><name>alice</name></root>')
// { root: { name: 'ALICE' } }
```

### Conditional Processing

```ts
const parser = new XMLParser({
  tagValueProcessor: (tagName, value, jPath) => {
    if (tagName === 'date') {
      return new Date(value).toISOString()
    }
    return value
  },
})
```

## Attribute Value Processor

Transform attribute values during parsing:

```ts
const parser = new XMLParser({
  ignoreAttributes: false,
  attributeValueProcessor: (attrName, value, jPath) => {
    if (attrName === 'count') return String(Number(value) * 100)
    return value
  },
})
```

## Builder Tag Value Processor

Transform values during XML building:

```ts
import { XMLBuilder } from 'ts-xml'

const builder = new XMLBuilder({
  tagValueProcessor: (name, value) => {
    if (typeof value === 'string') return value.trim()
    return value
  },
})
```

## Builder Attribute Value Processor

```ts
const builder = new XMLBuilder({
  ignoreAttributes: false,
  attributeValueProcessor: (name, value) => {
    return value.replace(/"/g, "'")
  },
})
```

## Number Parsing Options

Fine-tune how numeric values are parsed:

```ts
const parser = new XMLParser({
  numberParseOptions: {
    hex: true,           // 0xFF → 255
    leadingZeros: true,  // '007' stays as string
    scientific: true,    // '1e5' → 100000
    skipLike: /^\+\d+$/, // skip values matching this regex
  },
})
```

### Leading Zeros

When `leadingZeros: true` (default), values like `007` are preserved as strings. Set to `false` to parse them as numbers:

```ts
// leadingZeros: true (default) — preserve as string
parser.parse('<r>007</r>') // { r: '007' }

// leadingZeros: false — parse as number
parser.parse('<r>007</r>') // { r: 7 }
```

### Skip Pattern

Use `skipLike` to prevent specific patterns from being parsed as numbers:

```ts
const parser = new XMLParser({
  numberParseOptions: {
    hex: true,
    leadingZeros: true,
    scientific: true,
    skipLike: /^\d{2}:\d{2}$/, // don't parse time-like strings
  },
})
parser.parse('<r><t>12:30</t><n>42</n></r>')
// { r: { t: '12:30', n: 42 } }
```

## Transform Tag Names

Transform tag names during parsing:

```ts
const parser = new XMLParser({
  transformTagName: (name) => {
    // camelCase to snake_case
    return name.replace(/([A-Z])/g, '_$1').toLowerCase()
  },
})
parser.parse('<myElement><childNode>v</childNode></myElement>')
// { my_element: { child_node: 'v' } }
```

## Transform Attribute Names

```ts
const parser = new XMLParser({
  ignoreAttributes: false,
  transformAttributeName: (name) => name.toUpperCase(),
})
parser.parse('<root myAttr="val"/>')
// { root: { '@_MYATTR': 'val' } }
```

## updateTag Callback

Filter or rename tags during parsing:

```ts
const parser = new XMLParser({
  updateTag: (tagName, jPath, attrs) => {
    // Skip debug elements
    if (tagName === 'debug') return false

    // Rename elements
    if (tagName === 'old-name') return 'new-name'

    return tagName
  },
})
```
