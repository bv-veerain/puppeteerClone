module.exports = {
  "extends": ["eslint:recommended"],
  "rules": {
    "indent": ["error", "tab"],
    "no-tabs": ["off"],
    "prefer-template": ["error"],
    "no-var": ["error"],
    "semi": ["error", "never"],
    "no-console": ["warn"],
    "prefer-arrow-callback": ["error"],
    "eqeqeq": ["warn", "always"],
    "keyword-spacing": ["error"],
    "brace-style": ["error", "1tbs"],
    "no-unused-vars": ["warn"],
  },
  "parser": "babel-eslint",
  "parserOptions": {
    "ecmaFeatures": {
      "modules": true
    }
  },
  "env": {
    "browser": true,
    "node": true,
    "jasmine": true
  },
};

