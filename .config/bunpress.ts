import type { BunPressOptions } from '@stacksjs/bunpress'

const config: BunPressOptions = {
  name: 'ts-xml',
  description: 'A fast, dependency-free XML parser, builder, and validator for TypeScript & Bun.',
  url: 'https://ts-xml.stacksjs.com',

  theme: {
    primaryColor: '#3b82f6',
  },

  nav: [
    { text: 'Guide', link: '/intro' },
    { text: 'Features', link: '/features/parsing' },
    { text: 'Advanced', link: '/advanced/entities' },
    {
      text: 'Stacks',
      items: [
        { text: 'Stacks Framework', link: 'https://stacksjs.com' },
        { text: 'BunPress', link: 'https://bunpress.sh' },
        { text: 'dtsx', link: 'https://dtsx.stacksjs.com' },
      ],
    },
    { text: 'GitHub', link: 'https://github.com/stacksjs/ts-xml' },
  ],

  sidebar: [
    {
      text: 'Introduction',
      items: [
        { text: 'What is ts-xml?', link: '/intro' },
        { text: 'Installation', link: '/install' },
        { text: 'Usage', link: '/usage' },
        { text: 'Configuration', link: '/config' },
      ],
    },
    {
      text: 'Features',
      items: [
        { text: 'Parsing XML', link: '/features/parsing' },
        { text: 'Building XML', link: '/features/building' },
        { text: 'Validation', link: '/features/validation' },
        { text: 'Attributes', link: '/features/attributes' },
        { text: 'Preserve Order', link: '/features/preserve-order' },
      ],
    },
    {
      text: 'Advanced',
      items: [
        { text: 'Entity Handling', link: '/advanced/entities' },
        { text: 'Namespaces', link: '/advanced/namespaces' },
        { text: 'CDATA, Comments & PIs', link: '/advanced/cdata-comments-pi' },
        { text: 'Stop Nodes & Unpaired Tags', link: '/advanced/stop-nodes' },
        { text: 'Value Processing', link: '/advanced/value-processing' },
      ],
    },
  ],

  sitemap: {
    enabled: true,
    baseUrl: 'https://ts-xml.stacksjs.com',
  },

  robots: {
    enabled: true,
  },
}

export default config
