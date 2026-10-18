const fs = require('node:fs');
const path = require('node:path');
const { pathToFileURL } = require('node:url');

const repoRoot = path.resolve(__dirname, '..');
const artifactDirectory = path.join(__dirname, 'artifacts');

fs.mkdirSync(artifactDirectory, { recursive: true });

function artifact(name) {
  return path.join(artifactDirectory, name);
}

function projectFile(name) {
  return path.join(repoRoot, name);
}

function fileUrl(name) {
  return pathToFileURL(projectFile(name)).href;
}

module.exports = { artifact, projectFile, fileUrl };
