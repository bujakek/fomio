import nextCoreWebVitals from 'eslint-config-next/core-web-vitals'
import nextTypescript from 'eslint-config-next/typescript'

const config = [
  {
    // `.agents/` and `.claude/` hold vendored Claude Code skill scripts, not
    // project source. Linting them buys nothing and drowns real findings.
    ignores: [
      '.next/**',
      'node_modules/**',
      'next-env.d.ts',
      '.agents/**',
      '.claude/**',
      'supabase/**',
    ],
  },
  ...nextCoreWebVitals,
  ...nextTypescript,
  {
    // eslint-plugin-react's "detect" path calls context.getFilename(), removed
    // in ESLint 10. Pinning the version keeps it out of that code path.
    settings: { react: { version: '19.2' } },
  },
]

export default config
