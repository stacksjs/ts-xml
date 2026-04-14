---
# https://vitepress.dev/reference/default-theme-home-page
layout: home

hero:
  name: "ts-xml"
  text: "Fast XML for TypeScript"
  tagline: "A zero-dependency XML parser, builder, and validator."
  image: /images/logo-white.png
  actions:
    - theme: brand
      text: Get Started
      link: /intro
    - theme: alt
      text: View on GitHub
      link: https://github.com/stacksjs/ts-xml

features:
  - title: "XMLParser"
    icon: "📖"
    details: "Parse XML strings into JavaScript objects with full control over attributes, namespaces, and value types."
  - title: "XMLBuilder"
    icon: "🔨"
    details: "Build well-formed XML from JavaScript objects with formatting, entity encoding, and order preservation."
  - title: "XMLValidator"
    icon: "✅"
    details: "Validate XML structure with detailed error reporting including line and column numbers."
  - title: "Zero Dependencies"
    icon: "📦"
    details: "No runtime dependencies. Character-by-character parsing with charCodeAt for maximum performance."
---