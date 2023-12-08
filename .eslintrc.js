module.exports = {
  env: {
    es2021: true,
    node: true,
  },
  extends: "standard-with-typescript",
  overrides: [
    {
      env: {
        node: true,
      },
      files: [".eslintrc.{js,cjs}"],
      parserOptions: {
        sourceType: "script",
      },
    },
  ],
  parserOptions: {
    ecmaVersion: "latest",
    sourceType: "module",
  },
  rules: {
  'n/no-callback-literal': 'off',
  '@typescript-eslint/explicit-function-return-type': 'off',
  '@typescript-eslint/no-floating-promises': 'off',
  '@typescript-eslint/strict-boolean-expressions': 'off',
  '@typescript-eslint/no-var-requires': 'off',
  'no-constant-condition': 'off',
  'no-callback-literal': 'off',
  '@typescript-eslint/ban-types': 'off',
  '@typescript-eslint/no-extraneous-class': 'off',
    '@typescript-eslint/naming-convention': [
      'error',
      {
        selector: 'variable',
        format: ['camelCase', 'UPPER_CASE', 'UPPER_CASE', 'snake_case'],
      },
    ]
  },
};
