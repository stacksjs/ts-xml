# Benchmarks

ts-xml is designed for performance, using character-by-character parsing with `charCodeAt` comparisons instead of regex in hot paths.

All benchmarks use [mitata](https://github.com/evanwashere/mitata) on an Apple M3 Pro (Bun 1.3.11). Compared against:

- [fast-xml-parser](https://github.com/NaturalIntelligence/fast-xml-parser) v5.5 — the most popular JavaScript XML parser
- [xml2js](https://github.com/Leonidas-from-XIV/node-xml2js) v0.6 — widely used callback-based parser
- [sax](https://github.com/isaacs/sax-js) v1.5 — streaming SAX parser (event-based, no object output)

## Parsing Performance

| Benchmark | ts-xml | fast-xml-parser | xml2js | sax |
|-----------|--------|-----------------|--------|-----|
| Simple XML | **344 ns** | 1.64 µs _(4.8x slower)_ | 2.03 µs | 885 ns |
| Medium (3 products + attrs) | **6.67 µs** | 27.4 µs _(4.1x slower)_ | 18.0 µs | 12.3 µs |
| Large (100 products) | **321 µs** | 1.16 ms _(3.6x slower)_ | 2.04 ms | 1.88 ms |
| Very Large (1000 products) | **3.02 ms** | 13.0 ms _(4.3x slower)_ | 9.83 ms | 4.90 ms |
| XML with Entities | **2.28 µs** | 6.05 µs _(2.7x slower)_ | 9.42 µs | 6.42 µs |
| XML with Namespaces | **3.42 µs** | 14.4 µs _(4.2x slower)_ | 11.6 µs | 7.91 µs |
| Namespace prefix removal | **4.09 µs** | 11.8 µs _(2.9x slower)_ | — | — |
| CDATA sections | **831 ns** | 2.89 µs _(3.5x slower)_ | 5.62 µs | 5.36 µs |
| Deeply nested (50 levels) | **9.33 µs** | 59.1 µs _(6.3x slower)_ | 43.0 µs | 27.5 µs |
| RSS Feed | **8.33 µs** | 40.4 µs _(4.9x slower)_ | 53.9 µs | 28.7 µs |
| Preserve Order | **4.17 µs** | 15.2 µs _(3.6x slower)_ | — | — |

ts-xml is consistently the fastest parser across all benchmarks, from **2.7x to 6.3x faster** than fast-xml-parser.

## Building Performance

| Benchmark | ts-xml | fast-xml-parser | xml2js |
|-----------|--------|-----------------|--------|
| Small object (3 products) | **1.61 µs** | 3.83 µs _(2.4x slower)_ | 8.60 µs |
| Large object (100 products) | **42.6 µs** | 118 µs _(2.8x slower)_ | 197 µs |
| Formatted output | **1.67 µs** | 4.07 µs _(2.4x slower)_ | 8.05 µs |

## Validation Performance

| Benchmark | ts-xml | fast-xml-parser |
|-----------|--------|-----------------|
| Valid XML (medium) | **3.30 µs** | 7.79 µs _(2.4x slower)_ |
| Large valid XML (1000 products) | **1.39 ms** | 3.37 ms _(2.4x slower)_ |
| Invalid XML (early exit) | **260 ns** | 591 ns _(2.3x slower)_ |

## Round-trip Performance

| Benchmark | ts-xml | fast-xml-parser |
|-----------|--------|-----------------|
| Parse + Build (medium) | **9.15 µs** | 34.7 µs _(3.8x slower)_ |

## Why ts-xml Is Fast

1. **Character-by-character parsing** — no regex in hot paths, direct `charCodeAt` comparisons
2. **Inline helper functions** — `isWhitespace`, `isNameStartChar`, `isNameChar` use numeric comparisons
3. **Minimal allocations** — substring batching, array-join building, no intermediate AST
4. **Fast entity lookup** — inline charCode switch for the 5 XML entities, `indexOf('&')` early-exit
5. **Instance-cached options** — hot option values cached as properties, not re-read per recursive call
6. **Lazy jPath construction** — path strings only built when callbacks or stop nodes need them
7. **No dependencies** — zero overhead from transitive modules

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
