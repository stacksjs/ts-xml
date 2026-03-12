# Stop Nodes & Unpaired Tags

## Stop Nodes

Stop nodes are tags whose content is captured as raw text without further parsing. This is useful for embedded code, templates, or any content that may contain XML-like syntax.

```ts
import { XMLParser } from 'ts-xml'

const parser = new XMLParser({
  stopNodes: ['root.script'],
})

const result = parser.parse(`
  <root>
    <script>if (a < b && c > d) { alert("hello"); }</script>
    <data><item>parsed normally</item></data>
  </root>
`)
// result.root.script = 'if (a < b && c > d) { alert("hello"); }'
// result.root.data.item = 'parsed normally'
```

### Wildcard Stop Nodes

Use `*.tagName` to match a tag at any depth:

```ts
const parser = new XMLParser({
  stopNodes: ['*.code', '*.pre'],
})
```

### jPath Matching

Stop nodes match against the full jPath (dot-separated path):

```ts
const parser = new XMLParser({
  stopNodes: ['root.config.template'], // only this specific path
})
```

## Unpaired Tags

Unpaired tags are void elements that don't require a closing tag, similar to HTML's `<br>`, `<hr>`, `<img>`, etc.

```ts
const parser = new XMLParser({
  unpairedTags: ['br', 'hr', 'img'],
})

const result = parser.parse('<div>line 1<br>line 2<hr>footer</div>')
// { div: { '#text': 'line 1', br: '', hr: '', ... } }
```

### With Attributes

Unpaired tags can have attributes:

```ts
const parser = new XMLParser({
  ignoreAttributes: false,
  unpairedTags: ['br', 'img'],
})

parser.parse('<div><img src="photo.jpg">caption</div>')
// { div: { img: { '@_src': 'photo.jpg' }, '#text': 'caption' } }
```

### Building Unpaired Tags

```ts
import { XMLBuilder } from 'ts-xml'

const builder = new XMLBuilder({
  unpairedTags: ['br', 'hr'],
  suppressUnpairedNode: true,  // <br> instead of <br/>
})

builder.build({ div: { br: '', p: 'text' } })
// <div><br><p>text</p></div>
```

Set `suppressUnpairedNode: false` for self-closing style:

```ts
const builder = new XMLBuilder({
  unpairedTags: ['br'],
  suppressUnpairedNode: false,
})
// <div><br/><p>text</p></div>
```

### Validation with Unpaired Tags

The validator also accepts unpaired tag configuration:

```ts
import { XMLValidator } from 'ts-xml'

// Without config: invalid (unclosed tag)
XMLValidator('<p>text<br>more</p>')
// ValidationError

// With config: valid
XMLValidator('<p>text<br>more</p>', { unpairedTags: ['br'] })
// true
```
