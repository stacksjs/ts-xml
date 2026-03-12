# Parsing XML

The `XMLParser` class converts XML strings into JavaScript objects. It performs character-by-character parsing using `charCodeAt` for performance.

## Basic Parsing

```ts
import { XMLParser } from 'ts-xml'

const parser = new XMLParser()

// Simple element
parser.parse('<root>hello</root>')
// { root: 'hello' }

// Nested elements
parser.parse('<root><child>value</child></root>')
// { root: { child: 'value' } }

// Repeated elements become arrays
parser.parse('<root><item>a</item><item>b</item></root>')
// { root: { item: ['a', 'b'] } }
```

## Parsing Uint8Array

The parser accepts both strings and `Uint8Array`:

```ts
const parser = new XMLParser()
const bytes = new TextEncoder().encode('<root>data</root>')
const result = parser.parse(bytes)
// { root: 'data' }
```

## Value Type Parsing

By default, text values are parsed into appropriate JavaScript types:

```ts
const parser = new XMLParser()

parser.parse('<r><n>42</n><b>true</b><s>text</s></r>')
// { r: { n: 42, b: true, s: 'text' } }
```

Disable with `parseTagValue: false` to keep all values as strings.

## Number Parsing Options

Fine-tune how numbers are parsed:

```ts
const parser = new XMLParser({
  numberParseOptions: {
    hex: true,          // 0xFF → 255
    leadingZeros: true, // '007' stays as string '007'
    scientific: true,   // '1e5' → 100000
    skipLike: /^\+\d+$/ // skip values matching regex
  }
})
```

## Force Array for Specific Tags

Use `isArray` to ensure certain tags always produce arrays, even with a single element:

```ts
const parser = new XMLParser({
  isArray: (tagName) => tagName === 'item',
})

parser.parse('<root><item>only-one</item></root>')
// { root: { item: ['only-one'] } }
```

## Always Create Text Nodes

By default, leaf elements with only text are collapsed to their value. Use `alwaysCreateTextNode` to always produce an object:

```ts
const parser = new XMLParser({ alwaysCreateTextNode: true })
parser.parse('<root><child>text</child></root>')
// { root: { child: { '#text': 'text' } } }
```

## Tag Filtering with updateTag

Skip specific tags during parsing:

```ts
const parser = new XMLParser({
  updateTag: (tagName, jPath, attrs) => {
    if (tagName === 'debug') return false // skip this tag
    return tagName
  },
})
```

## Tag Name Transformation

Transform tag names during parsing:

```ts
const parser = new XMLParser({
  transformTagName: (name) => name.toLowerCase(),
})

parser.parse('<Root><CHILD>v</CHILD></Root>')
// { root: { child: 'v' } }
```
