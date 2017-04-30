const fs = require('fs-extra');
const path = require('path');
const yauzl = require("yauzl");
const mkdirp = require("mkdirp");
const cheerio = require('cheerio');


function unzipFile(file, fn) {
  const UnzipPath = path.resolve(path.basename(file, '.epub'));
  yauzl.open(file, {
    lazyEntries: true
  }, function (err, zipfile) {
    if (err) throw err;
    zipfile.readEntry();
    zipfile.on('end', function () {
      fn(UnzipPath);
    });
    zipfile.on("entry", function (entry) {
      if (/\/$/.test(entry.fileName)) {
        // path entry
        zipfile.readEntry();
      } else {
        // file entry
        zipfile.openReadStream(entry, function (err, readStream) {
          if (err) throw err;
          // ensure parent directory exists
          mkdirp(path.resolve(UnzipPath, path.dirname(entry.fileName)), function (err) {
            if (err) throw err;
            readStream.pipe(fs.createWriteStream(path.resolve(UnzipPath, entry.fileName)));
            readStream.on("end", function () {
              zipfile.readEntry();
            });
          });
        });
      }
    });
  });
}

// 根据 content.opf 文件获取所有段落
function getContents(opfFilePath) {
  $ = cheerio.load(fs.readFileSync(opfFilePath), {xmlMode: true});
  var contents = [];
  var files = $('manifest item[media-type="application/xhtml+xml"]');

  files.each((i, v)=> {
    var o = path.join(path.dirname(opfFilePath), $(v).attr('href'));
    $ = cheerio.load(fs.readFileSync(o), {xmlMode: true});
    $('body p').each((i, v)=> {
      var p = {
        id: $(v).attr('id'),
        content: $(v).text()
      };
      contents.push(p);
    });
  });
  return contents;
}
// 根据toc.ncx 文件获取图书名

function getTitle(ncxFile) {
  $ = cheerio.load(ncxFile, {xmlMode: true});
  return $('docTitle text').text() || null;
}

// 根据 toc.ncx 文件获取所有章节
function getCategories(ncxFile) {
  $ = cheerio.load(ncxFile, {xmlMode: true});
  var list = [];

  function parseNavPoint(navPoint, id) {
    var chapterId = navPoint.attr('id').match(/\d+/g)[0];
    var o = {
      id: chapterId,
      pid: id,
      name: navPoint.find('>navLabel text').text(),
      page: navPoint.find('>content').attr('src')
    };
    list.push(o);
    if (navPoint.find('>navPoint').length) {
      navPoint.find('>navPoint').each(function (i, v) {
        parseNavPoint($(v), chapterId);
      });
    }
  }

  $('navMap > navPoint').each(function (i, v) {
    parseNavPoint($(v), 0);
  });
  return list;
}

function fetchData(unzipFilePath) {
  var $;
  // ebook 元信息存储位置 META-INF/container.xml
  const containerFile = fs.readFileSync(path.resolve(unzipFilePath, 'META-INF/container.xml'));
  $ = cheerio.load(containerFile, {xmlMode: true});

  // content.opf 文件
  const opfFilePath = path.resolve(unzipFilePath, $('rootfile').attr('full-path'));
  const opfFile = fs.readFileSync(opfFilePath);
  $ = cheerio.load(opfFile, {xmlMode: true});

  // toc.ncx 文件
  const ncxFilePath = path.join(path.dirname(opfFilePath), './', $('#ncx').attr('href'));
  const ncxFile = fs.readFileSync(ncxFilePath);

  const result = {
    name: getTitle(ncxFile),
    pic: null,
    categories: getCategories(ncxFile),
    contents: getContents(opfFilePath)
  };
  // fs.removeSync(unzipFilePath);
  return result;
}

function parser(epubFilePath, fn) {
  unzipFile(epubFilePath, function (extractPath) {
    fn(fetchData(extractPath));
  });
}

module.exports = parser;

