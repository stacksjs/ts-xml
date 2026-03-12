# Validation

The `XMLValidator` function checks if an XML string is well-formed and returns either `true` or a `ValidationError` object with details.

## Basic Validation

```ts
import { XMLValidator } from 'ts-xml'

const result = XMLValidator('<root><child/></root>')
if (result === true) {
  console.log('XML is valid')
}
```

## Error Reporting

When validation fails, the result contains detailed error information:

```ts
import { XMLValidator } from 'ts-xml'
import type { ValidationError } from 'ts-xml'

const xml = `<root>
  <child>
  </wrong>
</root>`

const result = XMLValidator(xml)
if (result !== true) {
  const err = (result as ValidationError).err
  console.log(err.code)  // 'InvalidTag'
  console.log(err.msg)   // description of the error
  console.log(err.line)  // 3
  console.log(err.col)   // column number
}
```

## Error Codes

| Code | Description |
|------|-------------|
| `InvalidTag` | Mismatched, empty, or invalid tag names |
| `InvalidAttr` | Duplicate, unquoted, or malformed attributes |
| `InvalidXml` | Unclosed tags or structural issues |

## Validator Options

### Boolean Attributes

By default, attributes must have values. Enable boolean attributes:

```ts
XMLValidator('<input disabled/>', { allowBooleanAttributes: true })
// true
```

### Unpaired Tags

Allow HTML-style void elements:

```ts
XMLValidator('<p>text<br>more</p>', { unpairedTags: ['br'] })
// true
```

## What Gets Validated

- Tag nesting and matching
- Attribute syntax (quoting, duplicates)
- Comment syntax (no `--` inside comments)
- CDATA section syntax
- Processing instruction syntax
- DOCTYPE declarations
- Text outside root element

## Using with Parser

A common pattern is to validate before parsing:

```ts
import { XMLParser, XMLValidator } from 'ts-xml'

function safeParse(xml: string) {
  const valid = XMLValidator(xml)
  if (valid !== true) {
    throw new Error(`Invalid XML: ${valid.err.msg} at line ${valid.err.line}`)
  }
  return new XMLParser().parse(xml)
}
```
