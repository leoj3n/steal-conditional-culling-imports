const stealTools = require('steal-tools');

const buildPromise = stealTools.build(
  {},
  {
    minify: false,
    treeShaking: false,
  }
);
