# Building XML

The `XMLBuilder` class converts JavaScript objects into XML strings.

## Basic Building

```ts
import { XMLBuilder } from 'ts-xml'

const builder = new XMLBuilder()
const xml = builder.build({ root: { child: 'value' } })
// <root><child>value</child></root>
```

## Formatted Output

```ts
const builder = new XMLBuilder({ format: true, indentBy: '  ' })
const xml = builder.build({
  catalog: {
    product: [
      'Widget',
      'Gadget',
    ],
  },
})
// <catalog>
//   <product>Widget</product>
//   <product>Gadget</product>
// </catalog>
```

## Building with Attributes

```ts
const builder = new XMLBuilder({ ignoreAttributes: false })
const xml = builder.build({
  user: {
    '@_id': '1',
    '@_role': 'admin',
    name: 'Alice',
  },
})
// <user id="1" role="admin"><name>Alice</name></user>
```

## Empty Nodes

Control how empty elements are rendered:

```ts
// Default: <tag></tag>
new XMLBuilder().build({ tag: null })

// With suppressEmptyNode: <tag/>
new XMLBuilder({ suppressEmptyNode: true }).build({ tag: null })
```

## Boolean Attributes

```ts
const builder = new XMLBuilder({
  ignoreAttributes: false,
  suppressBooleanAttributes: true,
})
builder.build({ input: { '@_disabled': true, '@_type': 'text' } })
// <input disabled type="text"></input>
```

## Unpaired Tags

```ts
const builder = new XMLBuilder({
  unpairedTags: ['br', 'hr'],
  suppressUnpairedNode: true,
})
builder.build({ div: { br: '', p: 'text' } })
// <div><br><p>text</p></div>
```

## CDATA and Comments

```ts
const builder = new XMLBuilder({
  cdataPropName: '#cdata',
  commentPropName: '#comment',
})
builder.build({
  root: {
    '#comment': ' a comment ',
    '#cdata': 'raw <content>',
    text: 'hello',
  },
})
// <root><!-- a comment --><![CDATA[raw <content>]]><text>hello</text></root>
```

## Entity Encoding

By default, special characters are encoded in output:

```ts
const builder = new XMLBuilder()
builder.build({ root: 'a & b < c' })
// <root>a &amp; b &lt; c</root>
```

Disable with `processEntities: false` to output raw text.

## Custom Value Processing

```ts
const builder = new XMLBuilder({
  tagValueProcessor: (name, value) => value.toUpperCase(),
})
builder.build({ root: 'hello' })
// <root>HELLO</root>
```
