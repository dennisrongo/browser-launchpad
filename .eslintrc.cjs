module.exports = {
  root: true,
  env: { browser: true, es2021: true, webextensions: true },
  extends: [
    'eslint:recommended',
    'plugin:@typescript-eslint/recommended',
    'plugin:react-hooks/recommended',
  ],
  parser: '@typescript-eslint/parser',
  parserOptions: { ecmaVersion: 'latest', sourceType: 'module' },
  plugins: ['@typescript-eslint', 'react-refresh'],
  ignorePatterns: ['dist', 'node_modules', 'public', 'docs', 'scripts', '*.cjs'],
  rules: {
    'react-refresh/only-export-components': [
      'warn',
      { allowConstantExport: true },
    ],
    // The codebase intentionally uses `any`/`unknown` at untyped boundaries
    // (Chrome APIs, external JSON like the X GraphQL response).
    '@typescript-eslint/no-explicit-any': 'off',
    '@typescript-eslint/no-unused-vars': [
      'error',
      { argsIgnorePattern: '^_', varsIgnorePattern: '^_' },
    ],
    'no-empty': ['error', { allowEmptyCatch: true }],
    // `while (true) { ... break }` is the idiomatic stream-reader loop.
    'no-constant-condition': ['error', { checkLoops: false }],
  },
}
