import { bench, boxplot, group, run, summary } from 'mitata'
import { XMLParser as TsXmlParser, XMLBuilder as TsXmlBuilder, XMLValidator as TsXmlValidator } from '../src/index'
import { XMLParser as FxpParser, XMLBuilder as FxpBuilder, XMLValidator as FxpValidator } from 'fast-xml-parser'
import * as xml2js from 'xml2js'
import sax from 'sax'

// ---------------------------------------------------------------------------
// Test data
// ---------------------------------------------------------------------------

const simpleXml = '<root><child>hello</child></root>'

const mediumXml = `<?xml version="1.0" encoding="UTF-8"?>
<catalog>
  <product id="1" category="electronics">
    <name>Widget</name>
    <price currency="USD">29.99</price>
    <description>A great widget for everyday use</description>
    <inStock>true</inStock>
  </product>
  <product id="2" category="books">
    <name>XML Guide</name>
    <price currency="USD">49.99</price>
    <description>Comprehensive guide to XML parsing</description>
    <inStock>false</inStock>
  </product>
  <product id="3" category="electronics">
    <name>Gadget Pro</name>
    <price currency="EUR">199.99</price>
    <description>Premium gadget with advanced features</description>
    <inStock>true</inStock>
  </product>
</catalog>`

const largeXml = generateLargeXml(100)
const veryLargeXml = generateLargeXml(1000)

const xmlWithEntities = `<root>
  <text>Hello &amp; welcome to &lt;XML&gt; parsing &quot;benchmark&quot;</text>
  <special>&apos;single&apos; and &quot;double&quot; quotes with &amp; ampersands</special>
  <mixed>Text with &lt;tags&gt; and &#169; symbols &#x00AE; here</mixed>
</root>`

const xmlWithNamespaces = `<soap:Envelope xmlns:soap="http://schemas.xmlsoap.org/soap/envelope/" xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance">
  <soap:Header>
    <auth:Token xmlns:auth="http://example.com/auth">abc123</auth:Token>
  </soap:Header>
  <soap:Body>
    <ns:GetPrice xmlns:ns="http://example.com/api">
      <ns:Item>Widget</ns:Item>
      <ns:Quantity>10</ns:Quantity>
    </ns:GetPrice>
  </soap:Body>
</soap:Envelope>`

const xmlWithCdata = `<root>
  <script><![CDATA[
    function test() {
      if (a < b && c > d) {
        return "hello <world>";
      }
    }
  ]]></script>
  <style><![CDATA[
    .class > .child { color: red; }
    a[href*="&"] { display: none; }
  ]]></style>
</root>`

const deeplyNestedXml = generateDeepXml(50)

const rssXml = `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0" xmlns:atom="http://www.w3.org/2005/Atom">
  <channel>
    <title>Tech Blog</title>
    <link>https://example.com</link>
    <description>Latest tech news and updates</description>
    <atom:link href="https://example.com/feed" rel="self" type="application/rss+xml"/>
    <item>
      <title>New XML Parser Released</title>
      <link>https://example.com/post/1</link>
      <description>A fast new XML parser for TypeScript &amp; Bun</description>
      <pubDate>Mon, 10 Mar 2026 12:00:00 GMT</pubDate>
      <guid>https://example.com/post/1</guid>
    </item>
    <item>
      <title>Performance Benchmarks</title>
      <link>https://example.com/post/2</link>
      <description>Comparing XML parsers: speed &amp; memory</description>
      <pubDate>Tue, 11 Mar 2026 08:00:00 GMT</pubDate>
      <guid>https://example.com/post/2</guid>
    </item>
    <item>
      <title>TypeScript Best Practices</title>
      <link>https://example.com/post/3</link>
      <description>Writing performant TypeScript code</description>
      <pubDate>Wed, 12 Mar 2026 10:00:00 GMT</pubDate>
      <guid>https://example.com/post/3</guid>
    </item>
  </channel>
</rss>`

// Object for builder benchmarks (ts-xml / fast-xml-parser format)
const buildObj = {
  catalog: {
    '@_version': '1.0',
    product: [
      { '@_id': '1', name: 'Widget', price: 29.99, inStock: true },
      { '@_id': '2', name: 'Gadget', price: 49.99, inStock: false },
      { '@_id': '3', name: 'Doohickey', price: 99.99, inStock: true },
    ],
  },
}

// Object for xml2js builder (uses $ for attributes)
const buildObjXml2js = {
  catalog: {
    $: { version: '1.0' },
    product: [
      { $: { id: '1' }, name: 'Widget', price: 29.99, inStock: true },
      { $: { id: '2' }, name: 'Gadget', price: 49.99, inStock: false },
      { $: { id: '3' }, name: 'Doohickey', price: 99.99, inStock: true },
    ],
  },
}

const largeBuildObj = generateLargeBuildObj(100)
const largeBuildObjXml2js = generateLargeBuildObjXml2js(100)

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function generateLargeXml(count: number): string {
  let xml = '<?xml version="1.0"?>\n<catalog>\n'
  for (let i = 0; i < count; i++) {
    xml += `  <product id="${i}" category="cat${i % 5}">
    <name>Product ${i}</name>
    <price currency="${i % 2 === 0 ? 'USD' : 'EUR'}">${(Math.random() * 100).toFixed(2)}</price>
    <description>Description for product ${i} with special chars &amp; entities</description>
    <tags>
      <tag>tag${i % 3}</tag>
      <tag>tag${i % 7}</tag>
    </tags>
    <inStock>${i % 3 !== 0}</inStock>
  </product>\n`
  }
  xml += '</catalog>'
  return xml
}

function generateDeepXml(depth: number): string {
  let xml = ''
  for (let i = 0; i < depth; i++) xml += `<level${i}>`
  xml += 'deepValue'
  for (let i = depth - 1; i >= 0; i--) xml += `</level${i}>`
  return xml
}

function generateLargeBuildObj(count: number): Record<string, unknown> {
  const products = []
  for (let i = 0; i < count; i++) {
    products.push({
      '@_id': String(i),
      name: `Product ${i}`,
      price: (Math.random() * 100).toFixed(2),
      inStock: i % 3 !== 0,
    })
  }
  return { catalog: { product: products } }
}

function generateLargeBuildObjXml2js(count: number): Record<string, unknown> {
  const products = []
  for (let i = 0; i < count; i++) {
    products.push({
      $: { id: String(i) },
      name: `Product ${i}`,
      price: (Math.random() * 100).toFixed(2),
      inStock: i % 3 !== 0,
    })
  }
  return { catalog: { product: products } }
}

function parseSax(xml: string): Promise<void> {
  return new Promise((resolve, reject) => {
    const parser = sax.parser(true)
    parser.onend = () => resolve()
    parser.onerror = (e: Error) => reject(e)
    parser.write(xml).close()
  })
}

function parseXml2js(xml: string): Promise<unknown> {
  return xml2js.parseStringPromise(xml)
}

// ---------------------------------------------------------------------------
// Benchmarks
// ---------------------------------------------------------------------------

boxplot(() => {

  // ===== PARSING =====

  group('Parse: Simple XML', () => {
    const tsParser = new TsXmlParser()
    const fxParser = new FxpParser()

    bench('ts-xml', () => tsParser.parse(simpleXml))
    bench('fast-xml-parser', () => fxParser.parse(simpleXml))
    bench('xml2js', async () => await parseXml2js(simpleXml))
    bench('sax', async () => await parseSax(simpleXml))
  })

  group('Parse: Medium XML (3 products, attributes)', () => {
    const tsParser = new TsXmlParser({ ignoreAttributes: false })
    const fxParser = new FxpParser({ ignoreAttributes: false })

    bench('ts-xml', () => tsParser.parse(mediumXml))
    bench('fast-xml-parser', () => fxParser.parse(mediumXml))
    bench('xml2js', async () => await parseXml2js(mediumXml))
    bench('sax', async () => await parseSax(mediumXml))
  })

  group('Parse: Large XML (100 products)', () => {
    const tsParser = new TsXmlParser({ ignoreAttributes: false })
    const fxParser = new FxpParser({ ignoreAttributes: false })

    bench('ts-xml', () => tsParser.parse(largeXml))
    bench('fast-xml-parser', () => fxParser.parse(largeXml))
    bench('xml2js', async () => await parseXml2js(largeXml))
    bench('sax', async () => await parseSax(largeXml))
  })

  group('Parse: Very Large XML (1000 products)', () => {
    const tsParser = new TsXmlParser({ ignoreAttributes: false })
    const fxParser = new FxpParser({ ignoreAttributes: false })

    bench('ts-xml', () => tsParser.parse(veryLargeXml))
    bench('fast-xml-parser', () => fxParser.parse(veryLargeXml))
    bench('xml2js', async () => await parseXml2js(veryLargeXml))
    bench('sax', async () => await parseSax(veryLargeXml))
  })

  group('Parse: XML with Entities', () => {
    const tsParser = new TsXmlParser()
    const fxParser = new FxpParser()

    bench('ts-xml', () => tsParser.parse(xmlWithEntities))
    bench('fast-xml-parser', () => fxParser.parse(xmlWithEntities))
    bench('xml2js', async () => await parseXml2js(xmlWithEntities))
    bench('sax', async () => await parseSax(xmlWithEntities))
  })

  group('Parse: XML with Namespaces', () => {
    const tsParser = new TsXmlParser({ ignoreAttributes: false })
    const fxParser = new FxpParser({ ignoreAttributes: false })

    bench('ts-xml', () => tsParser.parse(xmlWithNamespaces))
    bench('fast-xml-parser', () => fxParser.parse(xmlWithNamespaces))
    bench('xml2js', async () => await parseXml2js(xmlWithNamespaces))
    bench('sax', async () => await parseSax(xmlWithNamespaces))
  })

  group('Parse: Namespace prefix removal', () => {
    const tsParser = new TsXmlParser({ ignoreAttributes: false, removeNSPrefix: true })
    const fxParser = new FxpParser({ ignoreAttributes: false, removeNSPrefix: true })

    bench('ts-xml', () => tsParser.parse(xmlWithNamespaces))
    bench('fast-xml-parser', () => fxParser.parse(xmlWithNamespaces))
  })

  group('Parse: XML with CDATA', () => {
    const tsParser = new TsXmlParser()
    const fxParser = new FxpParser()

    bench('ts-xml', () => tsParser.parse(xmlWithCdata))
    bench('fast-xml-parser', () => fxParser.parse(xmlWithCdata))
    bench('xml2js', async () => await parseXml2js(xmlWithCdata))
    bench('sax', async () => await parseSax(xmlWithCdata))
  })

  group('Parse: Deeply Nested (50 levels)', () => {
    const tsParser = new TsXmlParser()
    const fxParser = new FxpParser()

    bench('ts-xml', () => tsParser.parse(deeplyNestedXml))
    bench('fast-xml-parser', () => fxParser.parse(deeplyNestedXml))
    bench('xml2js', async () => await parseXml2js(deeplyNestedXml))
    bench('sax', async () => await parseSax(deeplyNestedXml))
  })

  group('Parse: RSS Feed', () => {
    const tsParser = new TsXmlParser({ ignoreAttributes: false })
    const fxParser = new FxpParser({ ignoreAttributes: false })

    bench('ts-xml', () => tsParser.parse(rssXml))
    bench('fast-xml-parser', () => fxParser.parse(rssXml))
    bench('xml2js', async () => await parseXml2js(rssXml))
    bench('sax', async () => await parseSax(rssXml))
  })

  group('Parse: Preserve Order', () => {
    const tsParser = new TsXmlParser({ preserveOrder: true })
    const fxParser = new FxpParser({ preserveOrder: true })

    bench('ts-xml', () => tsParser.parse(mediumXml))
    bench('fast-xml-parser', () => fxParser.parse(mediumXml))
  })

  // ===== BUILDING =====

  group('Build: Small Object', () => {
    const tsBuilder = new TsXmlBuilder({ ignoreAttributes: false })
    const fxBuilder = new FxpBuilder({ ignoreAttributes: false })
    const xml2jsBuilder = new xml2js.Builder()

    bench('ts-xml', () => tsBuilder.build(buildObj))
    bench('fast-xml-parser', () => fxBuilder.build(buildObj))
    bench('xml2js', () => xml2jsBuilder.buildObject(buildObjXml2js))
  })

  group('Build: Large Object (100 products)', () => {
    const tsBuilder = new TsXmlBuilder({ ignoreAttributes: false })
    const fxBuilder = new FxpBuilder({ ignoreAttributes: false })
    const xml2jsBuilder = new xml2js.Builder()

    bench('ts-xml', () => tsBuilder.build(largeBuildObj))
    bench('fast-xml-parser', () => fxBuilder.build(largeBuildObj))
    bench('xml2js', () => xml2jsBuilder.buildObject(largeBuildObjXml2js))
  })

  group('Build: Formatted Output', () => {
    const tsBuilder = new TsXmlBuilder({ ignoreAttributes: false, format: true, indentBy: '  ' })
    const fxBuilder = new FxpBuilder({ ignoreAttributes: false, format: true, indentBy: '  ' })
    const xml2jsBuilder = new xml2js.Builder({ renderOpts: { pretty: true, indent: '  ' } })

    bench('ts-xml', () => tsBuilder.build(buildObj))
    bench('fast-xml-parser', () => fxBuilder.build(buildObj))
    bench('xml2js', () => xml2jsBuilder.buildObject(buildObjXml2js))
  })

  // ===== VALIDATION =====

  group('Validate: Valid XML', () => {
    bench('ts-xml', () => TsXmlValidator(mediumXml))
    bench('fast-xml-parser', () => FxpValidator.validate(mediumXml))
  })

  group('Validate: Large Valid XML (1000 products)', () => {
    bench('ts-xml', () => TsXmlValidator(veryLargeXml))
    bench('fast-xml-parser', () => FxpValidator.validate(veryLargeXml))
  })

  const invalidXml = '<root><child>text</wrong></root>'
  group('Validate: Invalid XML', () => {
    bench('ts-xml', () => TsXmlValidator(invalidXml))
    bench('fast-xml-parser', () => FxpValidator.validate(invalidXml))
  })

  // ===== ROUND-TRIP =====

  group('Round-trip: Parse then Build (medium)', () => {
    const tsParser = new TsXmlParser({ ignoreAttributes: false })
    const tsBuilder = new TsXmlBuilder({ ignoreAttributes: false })
    const fxParser = new FxpParser({ ignoreAttributes: false })
    const fxBuilder = new FxpBuilder({ ignoreAttributes: false })

    bench('ts-xml', () => {
      const obj = tsParser.parse(mediumXml)
      tsBuilder.build(obj)
    })
    bench('fast-xml-parser', () => {
      const obj = fxParser.parse(mediumXml)
      fxBuilder.build(obj)
    })
  })

})

await run()
