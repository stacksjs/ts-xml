// Character codes for fast comparison
export const enum CharCode {
  Tab = 9,
  LineFeed = 10,
  CarriageReturn = 13,
  Space = 32,
  ExclamationMark = 33,
  DoubleQuote = 34,
  Hash = 35,
  Ampersand = 38,
  SingleQuote = 39,
  Dash = 45,
  Dot = 46,
  Slash = 47,
  Zero = 48,
  Nine = 57,
  Colon = 58,
  Semicolon = 59,
  LessThan = 60,
  Equals = 61,
  GreaterThan = 62,
  QuestionMark = 63,
  UpperA = 65,
  UpperF = 70,
  UpperZ = 90,
  LeftBracket = 91,
  RightBracket = 93,
  Underscore = 95,
  LowerA = 97,
  LowerF = 102,
  LowerX = 120,
  LowerZ = 122,
}

export interface NumberParseOptions {
  hex: boolean
  leadingZeros: boolean
  scientific: boolean
  skipLike?: RegExp
}

export interface ParserOptions {
  /** Prefix for attribute names in the parsed object (default: "@_") */
  attributeNamePrefix: string
  /** Group all attributes under this property name */
  attributesGroupName: string | false
  /** Property name for text content (default: "#text") */
  textNodeName: string
  /** Ignore all attributes during parsing */
  ignoreAttributes: boolean
  /** Remove namespace prefix from tag and attribute names */
  removeNSPrefix: boolean
  /** Allow boolean attributes without values */
  allowBooleanAttributes: boolean
  /** Always create a text node property even for simple text */
  alwaysCreateTextNode: boolean
  /** Trim whitespace from tag and attribute values */
  trimValues: boolean
  /** Parse text values to numbers/booleans */
  parseTagValue: boolean
  /** Parse attribute values to numbers/booleans */
  parseAttributeValue: boolean
  /** Process XML/HTML entities */
  processEntities: boolean
  /** Process HTML entities like &nbsp; */
  htmlEntities: boolean
  /** Property name for comments (false to ignore) */
  commentPropName: string | false
  /** Property name for CDATA sections */
  cdataPropName: string | false
  /** Property name for processing instructions (false to ignore) */
  piPropName: string | false
  /** Maintain original element ordering */
  preserveOrder: boolean
  /** Tags whose content should not be parsed */
  stopNodes: string[]
  /** Tags that don't need closing */
  unpairedTags: string[]
  /** Function to determine if an element should be an array */
  // eslint-disable-next-line pickier/no-unused-vars
  isArray: ((tagName: string, jPath: string, isLeaf: boolean, isAttribute: boolean) => boolean) | undefined
  /** Custom tag value processor */
  // eslint-disable-next-line pickier/no-unused-vars
  tagValueProcessor: ((tagName: string, tagValue: string, jPath: string, hasAttributes: boolean, isLeaf: boolean) => string | undefined) | undefined
  /** Custom attribute value processor */
  // eslint-disable-next-line pickier/no-unused-vars
  attributeValueProcessor: ((attrName: string, attrValue: string, jPath: string) => string | undefined) | undefined
  /** Custom tag name transformation on parse */
  // eslint-disable-next-line pickier/no-unused-vars
  updateTag: ((tagName: string, jPath: string, attrs: Record<string, string>) => string | boolean) | undefined
  /** Numeric parsing options */
  numberParseOptions: NumberParseOptions
  /** Ignore processing instructions */
  ignorePiTags: boolean
  /** Transform attribute name */
  // eslint-disable-next-line pickier/no-unused-vars
  transformAttributeName: ((name: string) => string) | undefined
  /** Transform tag name */
  // eslint-disable-next-line pickier/no-unused-vars
  transformTagName: ((name: string) => string) | undefined
  /** Ignore declaration tags like <?xml ?> */
  ignoreDeclaration: boolean
}

export interface BuilderOptions {
  /** Prefix for attribute names in the object (default: "@_") */
  attributeNamePrefix: string
  /** Group name for attributes */
  attributesGroupName: string | false
  /** Property name for text content (default: "#text") */
  textNodeName: string
  /** Ignore attributes when building */
  ignoreAttributes: boolean
  /** Property name for CDATA sections */
  cdataPropName: string | false
  /** Property name for comments */
  commentPropName: string | false
  /** Property name for processing instructions */
  piPropName: string | false
  /** Format the output XML with indentation */
  format: boolean
  /** Indentation string (default: "  ") */
  indentBy: string
  /** Suppress empty nodes (render as self-closing) */
  suppressEmptyNode: boolean
  /** Suppress boolean attributes */
  suppressBooleanAttributes: boolean
  /** Suppress unpaired nodes */
  suppressUnpairedNode: boolean
  /** Unpaired tags */
  unpairedTags: string[]
  /** Process entities in output */
  processEntities: boolean
  /** Preserve element order */
  preserveOrder: boolean
  /** Tag value processor */
  // eslint-disable-next-line pickier/no-unused-vars
  tagValueProcessor: ((name: string, value: string) => string) | undefined
  /** Attribute value processor */
  // eslint-disable-next-line pickier/no-unused-vars
  attributeValueProcessor: ((name: string, value: string) => string) | undefined
}

export interface ValidationError {
  err: {
    code: string
    msg: string
    line: number
    col: number
  }
}

export interface ValidatorOptions {
  allowBooleanAttributes: boolean
  unpairedTags: string[]
}

export const defaultParserOptions: ParserOptions = {
  attributeNamePrefix: '@_',
  attributesGroupName: false,
  textNodeName: '#text',
  ignoreAttributes: true,
  removeNSPrefix: false,
  allowBooleanAttributes: false,
  alwaysCreateTextNode: false,
  trimValues: true,
  parseTagValue: true,
  parseAttributeValue: false,
  processEntities: true,
  htmlEntities: false,
  commentPropName: false,
  cdataPropName: false,
  piPropName: false,
  preserveOrder: false,
  stopNodes: [],
  unpairedTags: [],
  isArray: undefined,
  tagValueProcessor: undefined,
  attributeValueProcessor: undefined,
  updateTag: undefined,
  numberParseOptions: {
    hex: true,
    leadingZeros: true,
    scientific: true,
  },
  ignorePiTags: false,
  transformAttributeName: undefined,
  transformTagName: undefined,
  ignoreDeclaration: false,
}

export const defaultBuilderOptions: BuilderOptions = {
  attributeNamePrefix: '@_',
  attributesGroupName: false,
  textNodeName: '#text',
  ignoreAttributes: false,
  cdataPropName: false,
  commentPropName: false,
  piPropName: false,
  format: false,
  indentBy: '  ',
  suppressEmptyNode: false,
  suppressBooleanAttributes: true,
  suppressUnpairedNode: true,
  unpairedTags: [],
  processEntities: true,
  preserveOrder: false,
  tagValueProcessor: undefined,
  attributeValueProcessor: undefined,
}
