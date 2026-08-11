import nextCoreWebVitals from 'eslint-config-next/core-web-vitals'
import nextTypescript from 'eslint-config-next/typescript'

const config = [
  { ignores: ['.next/**', 'node_modules/**', 'next-env.d.ts'] },
  ...nextCoreWebVitals,
  ...nextTypescript,
  {
    // eslint-plugin-react's "detect" path calls context.getFilename(), removed
    // in ESLint 10. Pinning the version keeps it out of that code path.
    settings: { react: { version: '19.2' } },
  },
]

export default config
