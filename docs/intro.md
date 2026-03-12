# What is ts-xml?

ts-xml is a fast, zero-dependency XML parser, builder, and validator for TypeScript and Bun. It provides three core APIs:

- **XMLParser** — parse XML strings (or `Uint8Array`) into JavaScript objects
- **XMLBuilder** — build XML strings from JavaScript objects
- **XMLValidator** — validate XML structure and report errors with line/column info

## Why ts-xml?

- **Performance** — character-by-character parsing using `charCodeAt` comparisons, no regex in hot paths
- **Zero dependencies** — only Bun as a runtime, nothing else
- **Fully typed** — complete TypeScript type definitions for all options and outputs
- **Comprehensive** — entity handling, namespaces, CDATA, comments, processing instructions, stop nodes, unpaired tags, and more
- **Well tested** — 724+ tests covering parser, builder, validator, entities, and adversarial edge cases

## Quick Example

```ts
import { XMLParser, XMLBuilder, XMLValidator } from 'ts-xml'

// Parse
const parser = new XMLParser({ ignoreAttributes: false })
const obj = parser.parse(`
  <bookstore>
    <book isbn="978-0-123">
      <title>XML Guide</title>
      <price>29.99</price>
    </book>
  </bookstore>
`)
// obj.bookstore.book = { '@_isbn': '978-0-123', title: 'XML Guide', price: 29.99 }

// Build
const builder = new XMLBuilder({ ignoreAttributes: false, format: true })
const xml = builder.build(obj)

// Validate
const result = XMLValidator('<root><child/></root>')
console.log(result === true ? 'Valid' : result.err.msg)
```

## Architecture

ts-xml is organized into four modules:

| Module | File | Description |
|--------|------|-------------|
| Parser | `src/parser.ts` | Character-by-character XML parser |
| Builder | `src/builder.ts` | Object-to-XML builder |
| Validator | `src/validator.ts` | Structure validation with error reporting |
| Entities | `src/entities.ts` | XML/HTML entity encoding and decoding |

All types and default options are defined in `src/types.ts`.
