const fs = require('fs-extra');
const path = require('path');
const yauzl = require("yauzl");
const mkdirp = require("mkdirp");
const cheerio = require('cheerio');

// 解压epub文件
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
  var $ = cheerio.load(fs.readFileSync(opfFilePath), {xmlMode: true});

  var result = $('itemref').map((i, el)=> {
    var fileName = $('#' + $(el).attr('idref')).attr('href');
    var contentFilePath = path.join(path.dirname(opfFilePath), fileName);
    var xml = cheerio.load(fs.readFileSync(contentFilePath, 'utf-8'), {xmlMode: true});
    return {
      index: path.basename(fileName),
      content: xml('body').html()
    };
  }).get();
  return result;
}

// 根据toc.ncx 文件获取图书名
function getTitle(ncxFile) {
  var $ = cheerio.load(ncxFile, {xmlMode: true});
  return $('docTitle text').text() || null;
}

// 根据 toc.ncx 文件获取所有章节
function getCategories(ncxFile) {
  var $ = cheerio.load(ncxFile, {xmlMode: true});
  var list = [];

  function parseNavPoint(navPoint, id) {
    var chapterId = navPoint.attr('id').match(/\d+/g)[0];
    var o = {
      id: chapterId,
      pid: id,
      name: navPoint.find('>navLabel text').text(),
      index: path.basename(navPoint.find('>content').attr('src'))
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

// 获取数据
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
  fs.removeSync(unzipFilePath);
  return result;
}

function parser(epubFilePath, fn) {
  unzipFile(epubFilePath, function (extractPath) {
    fn(fetchData(extractPath));
  });
}

module.exports = parser;

