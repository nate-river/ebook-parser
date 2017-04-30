const parser = require('./parse');
const path = require('path');

const epubStoreDir = path.resolve(__dirname, 'ebook');
const epubFile = path.resolve(epubStoreDir, 'lake.epub');

parser(epubFile, function (result) {
  console.log(result.contents)
});
