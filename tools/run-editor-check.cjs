// Run an existing editor integration check with a deterministic foreground page.
// Usage: pnpm exec electron tools/run-editor-check.cjs tools/test-....cjs
const { app } = require('electron');
const { foregroundEditor } = require('./editor-test-foreground.cjs');
const path = require('node:path');
if (!process.argv[2]) throw new Error('Pass an editor integration script');
app.on('web-contents-created', (_event, contents) => {
  contents.on('did-finish-load', () => {
    if (!new URL(contents.getURL()).searchParams.has('projectTab')) return;
    void foregroundEditor(contents).catch(error => { console.error(error); app.exit(1); });
  });
});
require(path.resolve(process.argv[2]));
