# Claude Code Guidelines

## About

A fast, dependency-free XML parser, builder, and validator for TypeScript and Bun. It uses character-by-character `charCodeAt` parsing for maximum performance (3-6x faster than fast-xml-parser in benchmarks). Key classes are `XMLParser` (XML to JS objects), `XMLBuilder` (JS objects to XML), and `XMLValidator` (structure validation with error reporting). It supports namespace handling, entity decoding, CDATA/comments, processing instructions, preserve-order mode, stop nodes, unpaired tags, and custom value/tag transformation callbacks.

## Linting

- Use **pickier** for linting — never use eslint directly
- Run `bunx --bun pickier .` to lint, `bunx --bun pickier . --fix` to auto-fix
- When fixing unused variable warnings, prefer `// eslint-disable-next-line` comments over prefixing with `_`

## Frontend

- Use **stx** for templating — never write vanilla JS (`var`, `document.*`, `window.*`) in stx templates
- Use **crosswind** as the default CSS framework which enables standard Tailwind-like utility classes
- stx `<script>` tags should only contain stx-compatible code (signals, composables, directives)

## Dependencies

- **buddy-bot** handles dependency updates — not renovatebot
- **better-dx** provides shared dev tooling as peer dependencies — do not install its peers (e.g., `typescript`, `pickier`, `bun-plugin-dtsx`) separately if `better-dx` is already in `package.json`
- If `better-dx` is in `package.json`, ensure `bunfig.toml` includes `linker = "hoisted"`

## Commits

- Use conventional commit messages (e.g., `fix:`, `feat:`, `chore:`)
