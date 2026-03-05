module.exports = {
  root: true,
  parser: "@typescript-eslint/parser",
  plugins: ["@typescript-eslint"],
  extends: ["prettier"],
  ignorePatterns: [
    "node_modules/",
    ".next/",
    "dist/",
    "coverage/",
    ".turbo/",
    "out/",
  ],
};
