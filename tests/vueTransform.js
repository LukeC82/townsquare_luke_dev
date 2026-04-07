/**
 * Lightweight .vue file transformer for Jest.
 * Extracts the <script> block and transpiles it via Babel.
 * Styles and templates are intentionally ignored — we only test JS logic.
 */
const { transform } = require("@babel/core");

module.exports = {
  process(sourceText) {
    const match = sourceText.match(/<script(?:\s[^>]*)?>([\s\S]*?)<\/script>/i);
    const script = match ? match[1] : "export default {}";
    const result = transform(script, {
      filename: "component.js",
      presets: [["@babel/preset-env", { targets: { node: "current" } }]]
    });
    return { code: result.code };
  }
};
