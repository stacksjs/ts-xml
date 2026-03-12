// Default XML entities
const xmlEntities: Record<string, string> = {
  amp: '&',
  lt: '<',
  gt: '>',
  quot: '"',
  apos: '\'',
}

// HTML entities (subset of most common ones)
const htmlEntities: Record<string, string> = {
  nbsp: '\u00A0',
  copy: '\u00A9',
  reg: '\u00AE',
  trade: '\u2122',
  euro: '\u20AC',
  pound: '\u00A3',
  yen: '\u00A5',
  cent: '\u00A2',
  deg: '\u00B0',
  micro: '\u00B5',
  middot: '\u00B7',
  bull: '\u2022',
  hellip: '\u2026',
  prime: '\u2032',
  Prime: '\u2033',
  laquo: '\u00AB',
  raquo: '\u00BB',
  lsquo: '\u2018',
  rsquo: '\u2019',
  ldquo: '\u201C',
  rdquo: '\u201D',
  ndash: '\u2013',
  mdash: '\u2014',
  iexcl: '\u00A1',
  iquest: '\u00BF',
  sect: '\u00A7',
  para: '\u00B6',
  dagger: '\u2020',
  Dagger: '\u2021',
  lsaquo: '\u2039',
  rsaquo: '\u203A',
  oline: '\u203E',
  frasl: '\u2044',
  ensp: '\u2002',
  emsp: '\u2003',
  thinsp: '\u2009',
  zwnj: '\u200C',
  zwj: '\u200D',
  lrm: '\u200E',
  rlm: '\u200F',
  times: '\u00D7',
  divide: '\u00F7',
  plusmn: '\u00B1',
  ne: '\u2260',
  le: '\u2264',
  ge: '\u2265',
  infin: '\u221E',
  fnof: '\u0192',
  Alpha: '\u0391',
  Beta: '\u0392',
  Gamma: '\u0393',
  Delta: '\u0394',
  Epsilon: '\u0395',
  Zeta: '\u0396',
  Eta: '\u0397',
  Theta: '\u0398',
  Iota: '\u0399',
  Kappa: '\u039A',
  Lambda: '\u039B',
  Mu: '\u039C',
  Nu: '\u039D',
  Xi: '\u039E',
  Omicron: '\u039F',
  Pi: '\u03A0',
  Rho: '\u03A1',
  Sigma: '\u03A3',
  Tau: '\u03A4',
  Upsilon: '\u03A5',
  Phi: '\u03A6',
  Chi: '\u03A7',
  Psi: '\u03A8',
  Omega: '\u03A9',
  alpha: '\u03B1',
  beta: '\u03B2',
  gamma: '\u03B3',
  delta: '\u03B4',
  epsilon: '\u03B5',
  zeta: '\u03B6',
  eta: '\u03B7',
  theta: '\u03B8',
  iota: '\u03B9',
  kappa: '\u03BA',
  lambda: '\u03BB',
  mu: '\u03BC',
  nu: '\u03BD',
  xi: '\u03BE',
  omicron: '\u03BF',
  pi: '\u03C0',
  rho: '\u03C1',
  sigmaf: '\u03C2',
  sigma: '\u03C3',
  tau: '\u03C4',
  upsilon: '\u03C5',
  phi: '\u03C6',
  chi: '\u03C7',
  psi: '\u03C8',
  omega: '\u03C9',
  thetasym: '\u03D1',
  upsih: '\u03D2',
  piv: '\u03D6',
  larr: '\u2190',
  uarr: '\u2191',
  rarr: '\u2192',
  darr: '\u2193',
  harr: '\u2194',
  crarr: '\u21B5',
  lArr: '\u21D0',
  uArr: '\u21D1',
  rArr: '\u21D2',
  dArr: '\u21D3',
  hArr: '\u21D4',
  forall: '\u2200',
  part: '\u2202',
  exist: '\u2203',
  empty: '\u2205',
  nabla: '\u2207',
  isin: '\u2208',
  notin: '\u2209',
  ni: '\u220B',
  prod: '\u220F',
  sum: '\u2211',
  minus: '\u2212',
  lowast: '\u2217',
  radic: '\u221A',
  prop: '\u221D',
  ang: '\u2220',
  and: '\u2227',
  or: '\u2228',
  cap: '\u2229',
  cup: '\u222A',
  int: '\u222B',
  there4: '\u2234',
  sim: '\u223C',
  cong: '\u2245',
  asymp: '\u2248',
  equiv: '\u2261',
  sub: '\u2282',
  sup: '\u2283',
  nsub: '\u2284',
  sube: '\u2286',
  supe: '\u2287',
  oplus: '\u2295',
  otimes: '\u2297',
  perp: '\u22A5',
  sdot: '\u22C5',
  lceil: '\u2308',
  rceil: '\u2309',
  lfloor: '\u230A',
  rfloor: '\u230B',
  lang: '\u2329',
  rang: '\u232A',
  loz: '\u25CA',
  spades: '\u2660',
  clubs: '\u2663',
  hearts: '\u2665',
  diams: '\u2666',
  Agrave: '\u00C0',
  Aacute: '\u00C1',
  Acirc: '\u00C2',
  Atilde: '\u00C3',
  Auml: '\u00C4',
  Aring: '\u00C5',
  AElig: '\u00C6',
  Ccedil: '\u00C7',
  Egrave: '\u00C8',
  Eacute: '\u00C9',
  Ecirc: '\u00CA',
  Euml: '\u00CB',
  Igrave: '\u00CC',
  Iacute: '\u00CD',
  Icirc: '\u00CE',
  Iuml: '\u00CF',
  ETH: '\u00D0',
  Ntilde: '\u00D1',
  Ograve: '\u00D2',
  Oacute: '\u00D3',
  Ocirc: '\u00D4',
  Otilde: '\u00D5',
  Ouml: '\u00D6',
  Oslash: '\u00D8',
  Ugrave: '\u00D9',
  Uacute: '\u00DA',
  Ucirc: '\u00DB',
  Uuml: '\u00DC',
  Yacute: '\u00DD',
  THORN: '\u00DE',
  szlig: '\u00DF',
  agrave: '\u00E0',
  aacute: '\u00E1',
  acirc: '\u00E2',
  atilde: '\u00E3',
  auml: '\u00E4',
  aring: '\u00E5',
  aelig: '\u00E6',
  ccedil: '\u00E7',
  egrave: '\u00E8',
  eacute: '\u00E9',
  ecirc: '\u00EA',
  euml: '\u00EB',
  igrave: '\u00EC',
  iacute: '\u00ED',
  icirc: '\u00EE',
  iuml: '\u00EF',
  eth: '\u00F0',
  ntilde: '\u00F1',
  ograve: '\u00F2',
  oacute: '\u00F3',
  ocirc: '\u00F4',
  otilde: '\u00F5',
  ouml: '\u00F6',
  oslash: '\u00F8',
  ugrave: '\u00F9',
  uacute: '\u00FA',
  ucirc: '\u00FB',
  uuml: '\u00FC',
  yacute: '\u00FD',
  thorn: '\u00FE',
  yuml: '\u00FF',
  OElig: '\u0152',
  oelig: '\u0153',
  Scaron: '\u0160',
  scaron: '\u0161',
  Yuml: '\u0178',
  circ: '\u02C6',
  tilde: '\u02DC',
}

export class EntityDecoder {
  private customEntities: Record<string, string> = {}
  private useHtmlEntities: boolean

  constructor(useHtmlEntities: boolean = false) {
    this.useHtmlEntities = useHtmlEntities
  }

  addEntity(name: string, value: string): void {
    this.customEntities[name] = value
  }

  decodeEntities(text: string): string {
    // Fast path: no ampersand means no entities
    let ampIdx = text.indexOf('&')
    if (ampIdx === -1)
      return text

    const len = text.length
    let result = ''
    let lastPos = 0

    while (ampIdx !== -1 && ampIdx < len) {
      // Copy everything before the &
      if (ampIdx > lastPos)
        result += text.substring(lastPos, ampIdx)

      // Find the ;
      const semiIdx = text.indexOf(';', ampIdx + 1)
      if (semiIdx === -1 || semiIdx - ampIdx > 32) {
        // No closing ; or too far away — not an entity
        result += '&'
        lastPos = ampIdx + 1
        ampIdx = text.indexOf('&', lastPos)
        continue
      }

      const entity = text.substring(ampIdx + 1, semiIdx)

      // Numeric character reference
      if (entity.charCodeAt(0) === 35) { // #
        const elen = entity.length
        let code = 0
        let valid = false
        if (elen > 2 && (entity.charCodeAt(1) === 120 || entity.charCodeAt(1) === 88)) { // #x or #X
          valid = true
          for (let k = 2; k < elen; k++) {
            const d = entity.charCodeAt(k)
            if (d >= 48 && d <= 57) code = (code << 4) | (d - 48)            // 0-9
            else if (d >= 65 && d <= 70) code = (code << 4) | (d - 55)       // A-F
            else if (d >= 97 && d <= 102) code = (code << 4) | (d - 87)      // a-f
            else { valid = false; break }
          }
        }
        else if (elen > 1) {
          valid = true
          for (let k = 1; k < elen; k++) {
            const d = entity.charCodeAt(k)
            if (d >= 48 && d <= 57) code = code * 10 + (d - 48)
            else { valid = false; break }
          }
        }
        if (valid) {
          result += String.fromCodePoint(code)
        }
        else {
          result += text.substring(ampIdx, semiIdx + 1)
        }
      }
      else {
        // Named entity lookup — inline the 5 XML entities for speed
        let replacement: string | undefined = this.customEntities[entity]
        if (replacement === undefined) {
          const elen = entity.length
          if (elen >= 2 && elen <= 4) {
            const e0 = entity.charCodeAt(0)
            if (e0 === 108 && elen === 2 && entity.charCodeAt(1) === 116) // lt
              replacement = '<'
            else if (e0 === 103 && elen === 2 && entity.charCodeAt(1) === 116) // gt
              replacement = '>'
            else if (e0 === 97 && elen === 3 && entity.charCodeAt(1) === 109 && entity.charCodeAt(2) === 112) // amp
              replacement = '&'
            else if (e0 === 113 && elen === 4) // quot
              replacement = entity === 'quot' ? '"' : undefined
            else if (e0 === 97 && elen === 4) // apos
              replacement = entity === 'apos' ? '\'' : undefined
          }
          if (replacement === undefined)
            replacement = xmlEntities[entity] ?? (this.useHtmlEntities ? htmlEntities[entity] : undefined)
        }
        if (replacement !== undefined) {
          result += replacement
        }
        else {
          result += text.substring(ampIdx, semiIdx + 1)
        }
      }

      lastPos = semiIdx + 1
      ampIdx = text.indexOf('&', lastPos)
    }

    // Append remainder
    if (lastPos < len)
      result += text.substring(lastPos)

    return result
  }
}

// Lookup table for the 5 special chars (indexed by charCode)
// Only entries at 34,38,39,60,62 are non-empty
const _encodeMap: string[] = []
_encodeMap[38] = '&amp;'
_encodeMap[60] = '&lt;'
_encodeMap[62] = '&gt;'
_encodeMap[34] = '&quot;'
_encodeMap[39] = '&apos;'

export function encodeEntities(text: string): string {
  // Fast path: scan for any special character
  let i = 0
  const len = text.length
  for (; i < len; i++) {
    const ch = text.charCodeAt(i)
    if (ch === 38 || ch === 60 || ch === 62 || ch === 34 || ch === 39)
      break
  }
  if (i === len)
    return text // no special chars

  // Build result: copy prefix, then process remaining
  let result = text.substring(0, i)

  while (i < len) {
    const ch = text.charCodeAt(i)
    const encoded = _encodeMap[ch]
    if (encoded !== undefined) {
      result += encoded
      i++
    }
    else {
      // Batch run of non-special characters
      const runStart = i
      i++
      while (i < len) {
        const c = text.charCodeAt(i)
        if (c === 38 || c === 60 || c === 62 || c === 34 || c === 39)
          break
        i++
      }
      result += text.substring(runStart, i)
    }
  }
  return result
}
