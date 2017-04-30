const parser = require('./parse');
parser('./ebook/test.epub', function (result) {
  console.log(result);
});
