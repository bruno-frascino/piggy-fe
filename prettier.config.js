/** @type {import("prettier").Config} */
const config = {
  // Basic formatting
  semi: true,
  singleQuote: true,
  tabWidth: 2,
  useTabs: false,

  // Line length
  printWidth: 80,

  // Trailing commas
  trailingComma: 'es5',

  // Bracket spacing
  bracketSpacing: true,
  bracketSameLine: false,

  // Arrow function parentheses
  arrowParens: 'avoid',

  // JSX specific
  jsxSingleQuote: true,

  // End of line
  endOfLine: 'lf',

  // Plugin overrides for specific file types
  overrides: [
    {
      files: '*.json',
      options: {
        printWidth: 120,
      },
    },
    {
      files: '*.md',
      options: {
        printWidth: 100,
        proseWrap: 'always',
      },
    },
  ],
};

module.exports = config;
