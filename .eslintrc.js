/* eslint-disable @typescript-eslint/no-var-requires */

const typeAwareLinting = require('eslint-config-mckravchyk/type_aware_linting');

module.exports = {
  env: {
    browser: true,
    es2015: true,
  },
  extends: [
    'mckravchyk/base',
  ],
  rules: {
    '@typescript-eslint/naming-convention': [
      'error',
      {
        selector: ['classMethod', 'classProperty'],
        format: ['camelCase'],
        trailingUnderscore: 'require',
        modifiers: ['private'],
      },
    ],
  },
  overrides: [
    typeAwareLinting({
      ecmaVersion: 11,
      sourceType: 'module',
      __dirname,
      project: ['./tsconfig.json'],
    }),
  ],
};
