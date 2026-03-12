# CDATA, Comments & Processing Instructions

By default, CDATA content is merged with surrounding text, and comments and processing instructions are ignored. You can capture them as named properties.

## CDATA Sections

CDATA sections contain raw text that is not entity-decoded:

```ts
import { XMLParser } from 'ts-xml'

// Default: CDATA content merges with text
const parser = new XMLParser()
parser.parse('<r>hello <![CDATA[<world>]]></r>')
// { r: 'hello <world>' }
```

### Capturing CDATA Separately

```ts
const parser = new XMLParser({ cdataPropName: '#cdata' })
parser.parse('<r>text<![CDATA[raw <content>]]></r>')
// { r: { '#text': 'text', '#cdata': 'raw <content>' } }
```

### Building with CDATA

```ts
import { XMLBuilder } from 'ts-xml'

const builder = new XMLBuilder({ cdataPropName: '#cdata' })
builder.build({ root: { '#cdata': 'raw <content>' } })
// <root><![CDATA[raw <content>]]></root>
```

## Comments

By default, comments are ignored. Use `commentPropName` to capture them:

```ts
const parser = new XMLParser({ commentPropName: '#comment' })
parser.parse('<root><!-- important note --><item>val</item></root>')
// { root: { '#comment': ' important note ', item: 'val' } }
```

### Building with Comments

```ts
const builder = new XMLBuilder({ commentPropName: '#comment' })
builder.build({ root: { '#comment': ' a comment ', item: 'val' } })
// <root><!-- a comment --><item>val</item></root>
```

## Processing Instructions

Processing instructions (`<?target data?>`) include XML declarations. Use `piPropName` to capture them:

```ts
const parser = new XMLParser({
  piPropName: '?',
  ignoreDeclaration: false,
})
parser.parse('<?xml version="1.0" encoding="UTF-8"?><root/>')
// { '?': { xml: { version: '1.0', encoding: 'UTF-8' } }, root: '' }
```

### Custom Processing Instructions

```ts
const parser = new XMLParser({
  piPropName: '?',
  ignorePiTags: false,
})
parser.parse('<?my-processor arg1 arg2?><root/>')
// { '?': { 'my-processor': 'arg1 arg2' }, root: '' }
```

### Ignoring Declarations

```ts
// Ignore <?xml ?> but keep custom PIs
const parser = new XMLParser({
  piPropName: '?',
  ignoreDeclaration: true,
  ignorePiTags: false,
})

// Ignore all PIs
const parser2 = new XMLParser({ ignorePiTags: true })
```

## Ordered Mode

In `preserveOrder` mode, CDATA and comments are stored as ordered array elements:

```ts
const parser = new XMLParser({
  preserveOrder: true,
  commentPropName: '#comment',
  cdataPropName: '#cdata',
})
const result = parser.parse('<r><!-- note --><![CDATA[raw]]><a>v</a></r>')
// Each special node appears in order within the children array
```
