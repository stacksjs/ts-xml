<p align="center"><img src=".github/art/cover.jpg" alt="Social Card of this repo"></p>

[![npm version][npm-version-src]][npm-version-href]
[![GitHub Actions][github-actions-src]][github-actions-href]
[![Commitizen friendly](https://img.shields.io/badge/commitizen-friendly-brightgreen.svg)](http://commitizen.github.io/cz-cli/)
<!-- [![npm downloads][npm-downloads-src]][npm-downloads-href] -->
<!-- [![Codecov][codecov-src]][codecov-href] -->

# ts-xml

A fast, dependency-free XML parser, builder, and validator for TypeScript and Bun. Character-by-character parsing with `charCodeAt` comparisons for maximum performance.

## Features

- **Zero Dependencies** - only Bun as a runtime
- **XMLParser** - parse XML strings to JavaScript objects
- **XMLBuilder** - build XML strings from JavaScript objects
- **XMLValidator** - validate XML structure with detailed error reporting
- **Entity Handling** - XML, HTML, numeric, and hex entity decoding/encoding
- **Namespace Support** - optional namespace prefix removal
- **Preserve Order** - array-based output to maintain element ordering
- **Stop Nodes** - skip parsing of specific tag contents
- **Unpaired Tags** - support for HTML-style void elements (e.g., `<br>`, `<hr>`)
- **CDATA & Comments** - optionally capture CDATA sections and comments as properties
- **Processing Instructions** - capture `<?xml?>` declarations and custom PIs
- **Value Parsing** - automatic number, boolean, hex, and scientific notation parsing
- **Custom Processors** - tag value, attribute value, and tag name transformation callbacks
- **Fully Typed** - complete TypeScript type definitions

## Get Started

### Installation

```bash
bun install ts-xml
```

### Parsing XML

```ts
import { XMLParser } from 'ts-xml'

const parser = new XMLParser()
const result = parser.parse('<root><item>Hello</item></root>')
// { root: { item: 'Hello' } }
```

### Parsing with Attributes

```ts
import { XMLParser } from 'ts-xml'

const parser = new XMLParser({ ignoreAttributes: false })
const result = parser.parse('<book isbn="978-0-123"><title>XML Guide</title></book>')
// { book: { '@_isbn': '978-0-123', title: 'XML Guide' } }
```

### Building XML

```ts
import { XMLBuilder } from 'ts-xml'

const builder = new XMLBuilder({ format: true, indentBy: '  ' })
const xml = builder.build({
  root: {
    item: ['one', 'two', 'three'],
  },
})
```

### Validating XML

```ts
import { XMLValidator } from 'ts-xml'

const result = XMLValidator('<root><child/></root>')
if (result === true) {
  console.log('Valid XML')
}
else {
  console.log(`Error: ${result.err.msg} at line ${result.err.line}`)
}
```

### Preserve Element Order

```ts
import { XMLParser, XMLBuilder } from 'ts-xml'

const parser = new XMLParser({ preserveOrder: true })
const ordered = parser.parse('<root><a>1</a><b>2</b><a>3</a></root>')
// Maintains original element order as arrays

const builder = new XMLBuilder({ preserveOrder: true })
const xml = builder.build(ordered) // Round-trips correctly
```

## Configuration

### Parser Options

| Option | Type | Default | Description |
|--------|------|---------|-------------|
| `attributeNamePrefix` | `string` | `"@_"` | Prefix for attribute names |
| `attributesGroupName` | `string \| false` | `false` | Group attributes under this key |
| `textNodeName` | `string` | `"#text"` | Property name for text content |
| `ignoreAttributes` | `boolean` | `true` | Skip attribute parsing |
| `removeNSPrefix` | `boolean` | `false` | Strip namespace prefixes |
| `allowBooleanAttributes` | `boolean` | `false` | Allow attributes without values |
| `alwaysCreateTextNode` | `boolean` | `false` | Always create text node property |
| `trimValues` | `boolean` | `true` | Trim whitespace from values |
| `parseTagValue` | `boolean` | `true` | Parse numbers/booleans from text |
| `parseAttributeValue` | `boolean` | `false` | Parse numbers/booleans from attributes |
| `processEntities` | `boolean` | `true` | Decode XML entities |
| `htmlEntities` | `boolean` | `false` | Decode HTML entities |
| `commentPropName` | `string \| false` | `false` | Property name for comments |
| `cdataPropName` | `string \| false` | `false` | Property name for CDATA sections |
| `piPropName` | `string \| false` | `false` | Property name for processing instructions |
| `preserveOrder` | `boolean` | `false` | Maintain element ordering |
| `stopNodes` | `string[]` | `[]` | Tags whose content is not parsed |
| `unpairedTags` | `string[]` | `[]` | Tags that don't need closing |
| `numberParseOptions` | `NumberParseOptions` | `{ hex: true, leadingZeros: true, scientific: true }` | Number parsing behavior |

### Builder Options

| Option | Type | Default | Description |
|--------|------|---------|-------------|
| `attributeNamePrefix` | `string` | `"@_"` | Prefix for attribute names |
| `textNodeName` | `string` | `"#text"` | Property name for text content |
| `ignoreAttributes` | `boolean` | `false` | Skip attributes when building |
| `format` | `boolean` | `false` | Pretty-print output |
| `indentBy` | `string` | `"  "` | Indentation string |
| `suppressEmptyNode` | `boolean` | `false` | Render empty nodes as self-closing |
| `suppressBooleanAttributes` | `boolean` | `true` | Render boolean attributes without `="true"` |
| `processEntities` | `boolean` | `true` | Encode entities in output |
| `preserveOrder` | `boolean` | `false` | Build from ordered format |

## Benchmarks

Benchmarked on Apple M3 Pro using [mitata](https://github.com/evanwashere/mitata), comparing against [fast-xml-parser](https://github.com/NaturalIntelligence/fast-xml-parser), [xml2js](https://github.com/Leonidas-from-XIV/node-xml2js), and [sax](https://github.com/isaacs/sax-js).

### Parsing

| Benchmark | ts-xml | fast-xml-parser | xml2js | sax |
|-----------|--------|-----------------|--------|-----|
| Simple XML | **344 ns** | 1.64 µs _(4.8x slower)_ | 2.03 µs | 885 ns |
| Medium (3 products + attrs) | **6.67 µs** | 27.4 µs _(4.1x slower)_ | 18.0 µs | 12.3 µs |
| Large (100 products) | **321 µs** | 1.16 ms _(3.6x slower)_ | 2.04 ms | 1.88 ms |
| Very Large (1000 products) | **3.02 ms** | 13.0 ms _(4.3x slower)_ | 9.83 ms | 4.90 ms |
| CDATA | **831 ns** | 2.89 µs _(3.5x slower)_ | 5.62 µs | 5.36 µs |
| Deep nesting (50 levels) | **9.33 µs** | 59.1 µs _(6.3x slower)_ | 43.0 µs | 27.5 µs |
| RSS Feed | **8.33 µs** | 40.4 µs _(4.9x slower)_ | 53.9 µs | 28.7 µs |
| Entities | **2.28 µs** | 6.05 µs _(2.7x slower)_ | 9.42 µs | 6.42 µs |
| Namespaces | **3.42 µs** | 14.4 µs _(4.2x slower)_ | 11.6 µs | 7.91 µs |

### Building

| Benchmark | ts-xml | fast-xml-parser | xml2js |
|-----------|--------|-----------------|--------|
| Small object | **1.61 µs** | 3.83 µs _(2.4x slower)_ | 8.60 µs |
| Large (100 products) | **42.6 µs** | 118 µs _(2.8x slower)_ | 197 µs |
| Formatted output | **1.67 µs** | 4.07 µs _(2.4x slower)_ | 8.05 µs |

### Validation

| Benchmark | ts-xml | fast-xml-parser |
|-----------|--------|-----------------|
| Valid XML | **3.30 µs** | 7.79 µs _(2.4x slower)_ |
| Large valid (1000 products) | **1.39 ms** | 3.37 ms _(2.4x slower)_ |
| Invalid XML (early exit) | **260 ns** | 591 ns _(2.3x slower)_ |

### Round-trip

| Benchmark | ts-xml | fast-xml-parser |
|-----------|--------|-----------------|
| Parse + Build (medium) | **9.15 µs** | 34.7 µs _(3.8x slower)_ |

> Run benchmarks yourself: `bun run bench`

## Testing

```bash
bun test
```

724 tests across 6 test files covering parser, builder, validator, entities, and edge cases.

## Changelog

Please see our [releases](https://github.com/stacksjs/ts-xml/releases) page for more information on what has changed recently.

## Contributing

Please see [CONTRIBUTING](.github/CONTRIBUTING.md) for details.

## Community

For help, discussion about best practices, or any other conversation that would benefit from being searchable:

[Discussions on GitHub](https://github.com/stacksjs/ts-xml/discussions)

For casual chit-chat with others using this package:

[Join the Stacks Discord Server](https://discord.gg/stacksjs)

## Postcardware

"Software that is free, but hopes for a postcard." We love receiving postcards from around the world showing where Stacks is being used! We showcase them on our website too.

Our address: Stacks.js, 12665 Village Ln #2306, Playa Vista, CA 90094, United States 🌎

## Sponsors

We would like to extend our thanks to the following sponsors for funding Stacks development. If you are interested in becoming a sponsor, please reach out to us.

- [JetBrains](https://www.jetbrains.com/)
- [The Solana Foundation](https://solana.com/)

## License

The MIT License (MIT). Please see [LICENSE](LICENSE.md) for more information.

Made with 💙

<!-- Badges -->
[npm-version-src]: https://img.shields.io/npm/v/ts-xml?style=flat-square
[npm-version-href]: https://npmjs.com/package/ts-xml
[github-actions-src]: https://img.shields.io/github/actions/workflow/status/stacksjs/ts-xml/ci.yml?style=flat-square&branch=main
[github-actions-href]: https://github.com/stacksjs/ts-xml/actions?query=workflow%3Aci

<!-- [codecov-src]: https://img.shields.io/codecov/c/gh/stacksjs/ts-xml/main?style=flat-square
[codecov-href]: https://codecov.io/gh/stacksjs/ts-xml -->
