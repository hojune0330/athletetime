const fs = require('node:fs');
const path = require('node:path');

function createWorkspacePathPolicy(root) {
  const workspaceRoot = path.resolve(root);
  const realRoot = fs.realpathSync.native(workspaceRoot);

  return function workspacePath(input) {
    const resolved = path.resolve(workspaceRoot, input);
    const lexicalRelative = path.relative(workspaceRoot, resolved);
    if (lexicalRelative.startsWith('..') || path.isAbsolute(lexicalRelative)) {
      throw new Error(`Path must stay inside workspace: ${input}`);
    }

    let existing = resolved;
    while (!fs.existsSync(existing)) {
      const parent = path.dirname(existing);
      if (parent === existing) break;
      existing = parent;
    }
    const realRelative = path.relative(realRoot, fs.realpathSync.native(existing));
    if (realRelative.startsWith('..') || path.isAbsolute(realRelative)) {
      throw new Error(`Path real path must stay inside workspace: ${input}`);
    }
    return resolved;
  };
}

module.exports = { createWorkspacePathPolicy };
