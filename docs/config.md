# Configuration

Both `XMLParser` and `XMLBuilder` accept an options object. All options have sensible defaults.

## Parser Options

```ts
import { XMLParser } from 'ts-xml'

const parser = new XMLParser({
  // Attribute handling
  attributeNamePrefix: '@_',       // prefix for attribute keys
  attributesGroupName: false,      // group attributes under a key (e.g., ':@')
  ignoreAttributes: true,          // skip attribute parsing entirely
  parseAttributeValue: false,      // parse attribute values as numbers/booleans

  // Text handling
  textNodeName: '#text',           // property name for text content
  trimValues: true,                // trim whitespace from values
  parseTagValue: true,             // parse text as numbers/booleans
  alwaysCreateTextNode: false,     // always create #text property

  // Entity handling
  processEntities: true,           // decode XML entities (&amp; → &)
  htmlEntities: false,             // decode HTML entities (&nbsp; → \u00A0)

  // Namespace handling
  removeNSPrefix: false,           // strip namespace prefixes (ns:tag → tag)

  // Special content
  commentPropName: false,          // property for comments (e.g., '#comment')
  cdataPropName: false,            // property for CDATA (e.g., '#cdata')
  piPropName: false,               // property for PIs (e.g., '?xml')

  // Structure
  preserveOrder: false,            // array-based output preserving order
  stopNodes: [],                   // tags whose content is not parsed
  unpairedTags: [],                // tags that don't need closing (e.g., ['br', 'hr'])
  allowBooleanAttributes: false,   // allow attributes without values

  // Number parsing
  numberParseOptions: {
    hex: true,                     // parse 0xFF as 255
    leadingZeros: true,            // keep '007' as string
    scientific: true,              // parse 1e5 as 100000
    skipLike: undefined,           // regex to skip (e.g., /^[+]?\d+$/)
  },

  // Callbacks
  isArray: undefined,              // (tagName, jPath, isLeaf, isAttribute) => boolean
  tagValueProcessor: undefined,    // (name, value, jPath, hasAttrs, isLeaf) => string
  attributeValueProcessor: undefined, // (name, value, jPath) => string
  updateTag: undefined,            // (name, jPath, attrs) => string | boolean
  transformTagName: undefined,     // (name) => string
  transformAttributeName: undefined, // (name) => string

  // Declaration handling
  ignoreDeclaration: false,        // ignore <?xml ?> declarations
  ignorePiTags: false,             // ignore all processing instructions
})
```

## Builder Options

```ts
import { XMLBuilder } from 'ts-xml'

const builder = new XMLBuilder({
  // Attribute handling
  attributeNamePrefix: '@_',
  attributesGroupName: false,
  ignoreAttributes: false,

  // Text handling
  textNodeName: '#text',

  // Special content
  cdataPropName: false,
  commentPropName: false,
  piPropName: false,

  // Formatting
  format: false,                   // pretty-print with indentation
  indentBy: '  ',                  // indentation string

  // Empty/boolean nodes
  suppressEmptyNode: false,        // <tag/> instead of <tag></tag>
  suppressBooleanAttributes: true, // disabled instead of disabled="true"
  suppressUnpairedNode: true,      // <br> instead of <br/>

  // Structure
  unpairedTags: [],
  processEntities: true,           // encode entities in output
  preserveOrder: false,            // build from ordered format

  // Callbacks
  tagValueProcessor: undefined,    // (name, value) => string
  attributeValueProcessor: undefined, // (name, value) => string
})
```

## Default Values

You can import the default options for reference:

```ts
import { defaultParserOptions, defaultBuilderOptions } from 'ts-xml'

console.log(defaultParserOptions.attributeNamePrefix) // '@_'
console.log(defaultBuilderOptions.format)             // false
```
