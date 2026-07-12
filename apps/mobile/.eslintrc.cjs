module.exports = {
  extends: ['@lazy-patta/eslint-config'],
  parserOptions: {
    project: './tsconfig.json',
    tsconfigRootDir: __dirname,
    ecmaFeatures: { jsx: true },
  },
  ignorePatterns: ['.expo/**', 'babel.config.js', 'metro.config.js', 'expo-env.d.ts'],
};
