# Installation

Install ts-xml via your package manager of choice:

::: code-group

```sh [bun]
bun install ts-xml
```

```sh [npm]
npm install ts-xml
```

```sh [pnpm]
pnpm add ts-xml
```

```sh [yarn]
yarn add ts-xml
```

:::

## Requirements

- **Bun** >= 1.0 (for development and testing)
- **TypeScript** >= 5.0 (optional, but recommended)

## Verify Installation

```ts
import { XMLParser, XMLBuilder, XMLValidator } from 'ts-xml'

const result = new XMLParser().parse('<hello>world</hello>')
console.log(result) // { hello: 'world' }
```
