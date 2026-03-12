export { XMLParser } from './parser'
export { XMLBuilder } from './builder'
export { validate as XMLValidator } from './validator'
export { EntityDecoder, encodeEntities } from './entities'
export type {
  ParserOptions,
  BuilderOptions,
  ValidationError,
  ValidatorOptions,
  NumberParseOptions,
} from './types'
export { defaultParserOptions, defaultBuilderOptions } from './types'
