// Re-runs all four doc generators, but redirects every .docx write to a
// `<name>.new.docx` filename so the originals (which may be open in Word)
// remain untouched.
const fs = require("fs");
const path = require("path");

const origWriteFileSync = fs.writeFileSync.bind(fs);
fs.writeFileSync = function (filePath, data, opts) {
  if (typeof filePath === "string" && filePath.endsWith(".docx")) {
    const dir = path.dirname(filePath);
    const base = path.basename(filePath, ".docx");
    const redirected = path.join(dir, base + ".new.docx");
    return origWriteFileSync(redirected, data, opts);
  }
  return origWriteFileSync(filePath, data, opts);
};

const scripts = [
  "./01-blueprint.js",
  "./02-srs.js",
  "./03-backlog.js",
  "./04-setup-checklist.js",
];
for (const s of scripts) {
  console.log("=== running", s, "===");
  require(s);
}
