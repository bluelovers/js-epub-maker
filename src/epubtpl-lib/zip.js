"use strict";
/**
 * Created by user on 2017/12/12/012.
 */
Object.defineProperty(exports, "__esModule", { value: true });
const JSZip = require("jszip");
exports.JSZip = JSZip;
const path = require("path");
const Promise = require("bluebird");
const ajax_1 = require("./ajax");
/*
export async function addMimetype(zip: JSZip, epub: EpubMaker, options)
{
    return zip.file('mimetype', options.templates.mimetype);
}

export function addContainerInfo(zip: JSZip, epub: EpubMaker, options)
{
    return zip.folder('META-INF').file('container.xml', compileTpl(options.templates.container, epub.epubConfig));
}
*/
function parseFileSetting(coverUrl, epubConfig) {
    let cover;
    if (typeof coverUrl == 'string') {
        let r = /^(?:\w+:)?\/{2,3}.+/;
        //console.log(path.isAbsolute(coverUrl), coverUrl, r.exec(coverUrl));
        if (!path.isAbsolute(coverUrl) && r.exec(coverUrl)) {
            cover = {
                url: coverUrl,
            };
        }
        else {
            let cwd = epubConfig.cwd || process.cwd();
            cover = {
                file: path.isAbsolute(coverUrl) ? coverUrl : path.join(cwd, coverUrl),
            };
        }
        //console.log(cover);
    }
    else if (coverUrl && (coverUrl.url || coverUrl.file)) {
        cover = coverUrl;
    }
    return cover;
}
exports.parseFileSetting = parseFileSetting;
async function addStaticFiles(zip, staticFiles) {
    return await Promise.map(staticFiles, async function (_file) {
        let file = await ajax_1.fetchFile(_file);
        zip
            .folder(file.folder)
            .file(file.name, file.data);
        return file;
    });
}
exports.addStaticFiles = addStaticFiles;
function addFiles(zip, epub, options) {
    let staticFiles = epub.epubConfig.additionalFiles.reduce(function (a, file) {
        a.push(Object.assign({}, file, {
            folder: file.folder ? path.join('EPUB', file.folder) : 'EPUB',
        }));
        return a;
    }, []);
    return addStaticFiles(zip, staticFiles);
}
exports.addFiles = addFiles;
async function addCover(zip, epub, options) {
    if (epub.epubConfig.cover) {
        epub.epubConfig.cover.basename = 'CoverDesign';
        let file = await ajax_1.fetchFile(epub.epubConfig.cover);
        //file.name = `CoverDesign${file.ext}`;
        let filename = file.name = file.folder ? path.join(file.folder, file.name) : file.name;
        zip
            .folder('EPUB')
            //.folder('images')
            .file(filename, file.data);
        return filename;
    }
    return false;
}
exports.addCover = addCover;
async function addSubSections(zip, section, cb, epub, options) {
    await cb(zip, section, epub.epubConfig, options);
    return Promise.mapSeries(section.subSections, function (subSection) {
        return addSubSections(zip, subSection, cb, epub, options);
    });
}
exports.addSubSections = addSubSections;
const self = require("./zip");
exports.default = self;
