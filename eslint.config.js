const ts = require("typescript-eslint");
const js = require("@eslint/js");
const prettier = require("eslint-config-prettier");

module.exports = ts.config(
  js.configs.recommended,
  ...ts.configs.recommended,
  prettier,

  // Generated Files.
  {
    ignores: ["lib/**"],
  },

  // Test Files.
  {
    files: ["tests/**/*.js"],
    languageOptions: {
      globals: {
        document: true,
      },
    },
  },

  // CommonJS (Node.js) JavaScript Files.
  {
    files: ["**/*.js"],
    languageOptions: {
      globals: {
        process: "readonly",
        Buffer: "readonly",
        __dirname: "readonly",
        module: "readonly",
        require: "readonly",
        exports: "readonly",
        console: "readonly",
        setTimeout: "readonly",
      },
    },
    rules: {
      "@typescript-eslint/no-var-requires": "off",
    },
  },

  // TestCafe Test Files.
  {
    files: ["test/testcafe/**/*.js"],
    languageOptions: {
      globals: {
        fixture: "readonly", // TestCafe globals
        test: "readonly",
      },
    },
  },

  // Test Files (Mocha).
  {
    files: ["test/mocha/**/*.js"],
    languageOptions: {
      globals: {
        describe: "readonly", // Mocha globals
        it: "readonly",
        before: "readonly",
        after: "readonly",
        beforeEach: "readonly",
        afterEach: "readonly",
        process: "readonly", // Allow process in tests as well
      },
    },
  },

  // Everything Else.
  {
    languageOptions: {
      globals: {
        __dirname: true,
        console: true,
        exports: true,
        module: true,
        require: true,
      },
    },
  },
);
