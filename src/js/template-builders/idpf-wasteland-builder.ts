/* global module, require, exports, JSZip, JSZipUtils, Handlebars, html_beautify */
(function() {
    'use strict';
    
    var D = require('d.js');
    var console = require('../util/console')();
    var ajax = require('../util/ajax');
    
    var templates = {
        mimetype: '@@import src/epub_templates/from_idpf_epub3/wasteland/mimetype',
        container: '@@import src/epub_templates/from_idpf_epub3/wasteland/META-INF/container.xml',
        opf: '@@import src/epub_templates/from_idpf_epub3/wasteland/EPUB/wasteland.opf',
        ncx: '@@import src/epub_templates/from_idpf_epub3/wasteland//EPUB/wasteland.ncx',
        nav: '@@import src/epub_templates/from_idpf_epub3/wasteland/EPUB/wasteland-nav.xhtml',
        css: '@@import src/epub_templates/from_idpf_epub3/wasteland/EPUB/wasteland.css',
        content: '@@import src/epub_templates/from_idpf_epub3/wasteland/EPUB/wasteland-content.xhtml',
        sectionsTemplate: '@@import src/epub_templates/from_idpf_epub3/wasteland/EPUB/sections-template.xhtml'
    };
    
    var Builder = function() {
        
        this.make = function(epubConfig) {
            console.debug('building epub', epubConfig);
            var zip = new JSZip();
            
            var deferred = D();
            D.all(
                addMimetype(zip),
                addContainerInfo(zip, epubConfig),
                addManifestOpf(zip, epubConfig),
                addCover(zip, epubConfig),
                addEpub2Nav(zip, epubConfig),
                addEpub3Nav(zip, epubConfig),
                addStylesheets(zip, epubConfig),
                addContent(zip, epubConfig)
            ).then(function() {
                deferred.resolve(zip);
            });
            
            return deferred.promise;
        };
        
        function addMimetype(zip) {
            zip.file('mimetype', templates.mimetype);
        }
        
        function addContainerInfo(zip, epubConfig) {
            zip.folder('META-INF').file('container.xml', compile(templates.container, epubConfig));
        }
        
        function addManifestOpf(zip, epubConfig) {
            zip.folder('EPUB').file(epubConfig.slug + '.opf', compile(templates.opf, epubConfig));
        }
        
        function addCover(zip, epubConfig) {
            var deferred = D();
            
            if (epubConfig.coverUrl) {
                JSZipUtils.getBinaryContent(epubConfig.coverUrl, function (err, data) {
                    if (!err) {
                        var ext = epubConfig.coverUrl.substr(epubConfig.coverUrl.lastIndexOf('.') + 1);
                        zip.folder('EPUB').file(epubConfig.slug + '-cover.' + ext, data, { binary: true });
                        deferred.resolve('');
                    } else {
                        deferred.reject(err);
                    }
                });
            } else {
                deferred.resolve(true);
            }
            return deferred.promise;
        }
        
        function addEpub2Nav(zip, epubConfig) {
            zip.folder('EPUB').file(epubConfig.slug + '.ncx', compile(templates.ncx, epubConfig));
        }
        
        function addEpub3Nav(zip, epubConfig) {
            zip.folder('EPUB').file(epubConfig.slug + '-nav.xhtml', compile(templates.nav, epubConfig));
        }
        
        function addStylesheets(zip, epubConfig) {
            var deferred = D();
            if (epubConfig.stylesheet.url) {
                return ajax(epubConfig.stylesheet.url).then(function(result) {
                    epubConfig.styles = result.data;
                    compileAndAddCss();
                });
            } else {
                compileAndAddCss();
            }
            return deferred.promise;
            
            function compileAndAddCss() {
                var styles = {
                    original: epubConfig.stylesheet.replaceOriginal ? '' : templates.css,
                    custom: epubConfig.styles
                };
                zip.folder('EPUB').file(epubConfig.slug + '.css', compile('{{{original}}}{{{custom}}}', styles, true));
                deferred.resolve(true);
            }
        }
        
        function addContent(zip, epubConfig) {
            Handlebars.registerPartial('sectionTemplate', templates.sectionsTemplate);
            zip.folder('EPUB').file(epubConfig.slug + '-content.xhtml', compile(templates.content, epubConfig));
        }
        
        function compile(template, content, skipFormatting) {
            return formatHTML(Handlebars.compile(template)(content));
            
            function formatHTML(htmlstr) {
                /*jslint camelcase:false*/
                return (skipFormatting || typeof html_beautify === 'undefined') ? htmlstr : 
                    html_beautify(htmlstr, {
                        'end_with_newline': false,
                        'indent_char': '\t',
                        'indent_inner_html': true,
                        'indent_size': '1',
                        'preserve_newlines': false,
                        'wrap_line_length': '0',
                        'unformatted': [],
                        'selector_separator_newline': false,
                        'newline_between_rules': true
                    });
                /*jslint camelcase:true*/
            }
        }
    };

    // manage dependency exports
    if (typeof module !== 'undefined') {
        module.exports.builder = new Builder();
    }
    else if (typeof exports !== 'undefined') {
        exports.builder = new Builder();
    }
    else if (typeof window === 'undefined') {
        throw new Error('unable to expose module: no module, exports object and no global window detected');
    }

    if (typeof window !== 'undefined') {
        window.epubMaker = new Builder();
    }
}());
