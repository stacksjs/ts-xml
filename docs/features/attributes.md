# Attributes

By default, `XMLParser` ignores attributes (`ignoreAttributes: true`). Set it to `false` to include them.

## Attribute Prefix

Attributes are prefixed to distinguish them from child elements:

```ts
import { XMLParser } from 'ts-xml'

const parser = new XMLParser({ ignoreAttributes: false })
parser.parse('<user id="1"><name>Alice</name></user>')
// { user: { '@_id': '1', name: 'Alice' } }
```

Change the prefix:

```ts
const parser = new XMLParser({
  ignoreAttributes: false,
  attributeNamePrefix: '$',
})
parser.parse('<item type="book"/>')
// { item: { '$type': 'book' } }
```

## Attributes Group

Group all attributes under a single key:

```ts
const parser = new XMLParser({
  ignoreAttributes: false,
  attributesGroupName: '@',
})
parser.parse('<user id="1" role="admin"><name>Alice</name></user>')
// { user: { '@': { '@_id': '1', '@_role': 'admin' }, name: 'Alice' } }
```

## Attribute Value Parsing

Parse attribute values as numbers and booleans:

```ts
const parser = new XMLParser({
  ignoreAttributes: false,
  parseAttributeValue: true,
})
parser.parse('<item count="42" active="true"/>')
// { item: { '@_count': 42, '@_active': true } }
```

## Boolean Attributes

Support attributes without values:

```ts
const parser = new XMLParser({
  ignoreAttributes: false,
  allowBooleanAttributes: true,
})
parser.parse('<input disabled type="text"/>')
// { input: { '@_disabled': 'true', '@_type': 'text' } }
```

## Attribute Value Processing

Transform attribute values during parsing:

```ts
const parser = new XMLParser({
  ignoreAttributes: false,
  attributeValueProcessor: (name, value, jPath) => {
    if (name === 'date') return new Date(value).toISOString()
    return value
  },
})
```

## Attribute Name Transformation

```ts
const parser = new XMLParser({
  ignoreAttributes: false,
  transformAttributeName: (name) => name.toLowerCase(),
})
parser.parse('<item MyAttr="val"/>')
// { item: { '@_myattr': 'val' } }
```

## Building with Attributes

The builder uses the same prefix convention:

```ts
import { XMLBuilder } from 'ts-xml'

const builder = new XMLBuilder({ ignoreAttributes: false })
builder.build({
  book: {
    '@_isbn': '978-0-123',
    title: 'XML Guide',
  },
})
// <book isbn="978-0-123"><title>XML Guide</title></book>
```
