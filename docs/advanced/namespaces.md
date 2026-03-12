# Namespaces

XML namespaces use prefixes like `ns:tagName`. ts-xml can either preserve or strip these prefixes.

## Default Behavior

By default, namespace prefixes are preserved:

```ts
import { XMLParser } from 'ts-xml'

const parser = new XMLParser({ ignoreAttributes: false })
const result = parser.parse(`
  <soap:Envelope xmlns:soap="http://schemas.xmlsoap.org/soap/envelope/">
    <soap:Body>
      <ns:GetPrice xmlns:ns="http://example.com">
        <ns:Item>Widget</ns:Item>
      </ns:GetPrice>
    </soap:Body>
  </soap:Envelope>
`)
// result['soap:Envelope']['soap:Body']['ns:GetPrice']['ns:Item'] === 'Widget'
```

## Removing Namespace Prefixes

Use `removeNSPrefix` to strip prefixes from both tag and attribute names:

```ts
const parser = new XMLParser({
  ignoreAttributes: false,
  removeNSPrefix: true,
})
const result = parser.parse(`
  <soap:Envelope xmlns:soap="http://schemas.xmlsoap.org/soap/envelope/">
    <soap:Body>
      <ns:GetPrice xmlns:ns="http://example.com">
        <ns:Item>Widget</ns:Item>
      </ns:GetPrice>
    </soap:Body>
  </soap:Envelope>
`)
// result.Envelope.Body.GetPrice.Item === 'Widget'
```

## Namespace Attributes

Namespace declarations (`xmlns:prefix`) are regular attributes. With `removeNSPrefix`, the prefix is also stripped from attribute names:

```ts
const parser = new XMLParser({
  ignoreAttributes: false,
  removeNSPrefix: true,
})
const result = parser.parse('<root xml:lang="en"/>')
// result.root['@_lang'] === 'en'
```

## Combined with Tag Transformation

You can combine namespace removal with tag name transformation:

```ts
const parser = new XMLParser({
  removeNSPrefix: true,
  transformTagName: (name) => name.toLowerCase(),
})
const result = parser.parse('<NS:Root><NS:Child>val</NS:Child></NS:Root>')
// result.root.child === 'val'
```
