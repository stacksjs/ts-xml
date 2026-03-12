# Benchmarks

ts-xml is designed for performance, using character-by-character parsing with `charCodeAt` comparisons instead of regex in hot paths.

All benchmarks use [mitata](https://github.com/evanwashere/mitata) on an Apple M3 Pro (Bun 1.3.11). Compared against:

- [fast-xml-parser](https://github.com/NaturalIntelligence/fast-xml-parser) v5.5 — the most popular JavaScript XML parser
- [xml2js](https://github.com/Leonidas-from-XIV/node-xml2js) v0.6 — widely used callback-based parser
- [sax](https://github.com/isaacs/sax-js) v1.5 — streaming SAX parser (event-based, no object output)

## Parsing Performance

| Benchmark | ts-xml | fast-xml-parser | xml2js | sax |
|-----------|--------|-----------------|--------|-----|
| Simple XML | **515 ns** | 1.77 µs _(3.4x slower)_ | 2.14 µs | 905 ns |
| Medium (3 products + attrs) | **14.5 µs** | 30.4 µs _(2.1x slower)_ | 19.1 µs | 14.1 µs |
| Large (100 products) | **682 µs** | 1.22 ms _(1.8x slower)_ | 2.06 ms | 1.91 ms |
| Very Large (1000 products) | **7.58 ms** | 13.1 ms _(1.7x slower)_ | 11.0 ms | 19.4 ms |
| XML with Entities | **4.96 µs** | 6.10 µs _(1.2x slower)_ | 9.48 µs | 6.35 µs |
| XML with Namespaces | **5.92 µs** | 14.0 µs _(2.4x slower)_ | 12.7 µs | 8.30 µs |
| Namespace prefix removal | **5.08 µs** | 12.3 µs _(2.4x slower)_ | — | — |
| CDATA sections | **973 ns** | 2.90 µs _(3.0x slower)_ | 5.90 µs | 5.35 µs |
| Deeply nested (50 levels) | **10.3 µs** | 60.5 µs _(5.9x slower)_ | 43.0 µs | 27.4 µs |
| RSS Feed | **16.6 µs** | 35.5 µs _(2.1x slower)_ | 53.8 µs | 28.7 µs |
| Preserve Order | **7.55 µs** | 14.2 µs _(1.9x slower)_ | — | — |

ts-xml is consistently the fastest parser across all benchmarks, from **1.2x to 5.9x faster** than fast-xml-parser.

## Building Performance

| Benchmark | ts-xml | fast-xml-parser | xml2js |
|-----------|--------|-----------------|--------|
| Small object (3 products) | **2.04 µs** | 3.76 µs _(1.8x slower)_ | 8.62 µs |
| Large object (100 products) | **66.2 µs** | 115 µs _(1.7x slower)_ | 202 µs |
| Formatted output | **7.07 µs** | 9.61 µs _(1.4x slower)_ | 8.47 µs |

## Validation Performance

| Benchmark | ts-xml | fast-xml-parser |
|-----------|--------|-----------------|
| Valid XML (medium) | **2.96 µs** | 8.11 µs _(2.7x slower)_ |
| Large valid XML (1000 products) | **1.24 ms** | 3.58 ms _(2.9x slower)_ |
| Invalid XML (early exit) | **187 ns** | 561 ns _(3.0x slower)_ |

## Round-trip Performance

| Benchmark | ts-xml | fast-xml-parser |
|-----------|--------|-----------------|
| Parse + Build (medium) | **14.9 µs** | 34.0 µs _(2.3x slower)_ |

## Why ts-xml Is Fast

1. **Character-by-character parsing** — no regex in hot paths, direct `charCodeAt` comparisons
2. **Inline helper functions** — `isWhitespace`, `isNameStartChar`, `isNameChar` use numeric comparisons
3. **Minimal allocations** — string concatenation and direct object building, no intermediate AST
4. **Fast entity lookup** — `indexOf('&')` early-exit skips entity processing when not needed
5. **No dependencies** — zero overhead from transitive modules

## Running Benchmarks

```bash
bun run bench
```

The benchmark suite is in `benchmarks/index.ts` and includes 18 benchmark groups covering parsing, building, validation, and round-trip scenarios.

## Notes

- **sax** is a streaming SAX parser that only fires events — it doesn't build an object tree, so its numbers reflect only the tokenization cost. Despite this advantage, ts-xml is still faster for small inputs.
- **xml2js** uses sax internally and adds object construction on top.
- All parsers are configured equivalently (e.g., same `ignoreAttributes` setting) for fair comparison.
- Results may vary by platform and runtime. Run `bun run bench` to measure on your hardware.
