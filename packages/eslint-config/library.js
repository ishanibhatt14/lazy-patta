/**
 * ESLint config for pure TS library packages (engine, contracts, utils).
 * Adds the import-boundary rule: nothing under packages/* may import from apps/*.
 */
module.exports = {
  extends: ['@lazy-patta/eslint-config'],
  rules: {
    'no-restricted-imports': [
      'error',
      {
        patterns: [
          {
            group: ['**/apps/*', '@lazy-patta/web', '@lazy-patta/mobile'],
            message:
              'Packages must not import from apps. Dependencies point inward (see ADR-0002).',
          },
        ],
      },
    ],
  },
};
