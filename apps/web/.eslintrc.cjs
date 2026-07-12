module.exports = {
  extends: ['@lazy-patta/eslint-config'],
  parserOptions: {
    project: './tsconfig.json',
    tsconfigRootDir: __dirname,
    ecmaFeatures: { jsx: true },
  },
  env: { browser: true },
  ignorePatterns: ['.next/**', 'next.config.mjs', 'postcss.config.mjs'],
};
