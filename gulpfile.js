var gulp = require('gulp');
var install = require('gulp-install');
var config = require('./gulp/config.json');
var plumber = require('gulp-plumber');
var sourcemaps = require('gulp-sourcemaps');
var sass = require('gulp-sass');
var autoprefixer = require('gulp-autoprefixer');
var jade = require('gulp-jade');
var rename = require('gulp-rename');
var path = require('path');
var wrap = require('gulp-wrap-amd');
var through = require('through2');
var fs = require('fs');
var async = require('async');
var watch = require('gulp-watch');
var concat = require('gulp-concat');
var minifyCSS = require('gulp-minify-css');
var minifyHtml = require('gulp-minify-html');
var gzip = require('gulp-gzip');
var _ = require('underscore');
var order = require("gulp-order");
var shell = require('gulp-shell');
var uglify = require('gulp-uglify');

var build = 'dev';

//Копирование главных файлов BOWER в папку vendor
require('./gulp/bower')(gulp);
require('./gulp/jsHint')(gulp);
//Удаление папки билда
require('./gulp/clean')('clean', gulp, [config.path.build, config.path.release, config.path.temp], config.path.src);
//Удаление папки билда и всех зависимостей npm и bower
require('./gulp/clean')('cleanHard', gulp, [config.path.build, config.path.bower_components, config.path.vendor, config.path.temp, config.path.release]);
//Скачивание всех зависимостей
function installModules() {
    return gulp.src([config.bower])
        .pipe(install());
}
//Копирование статичных файлов
function copyStaticClientFiles() {
    return gulp.src(config.staticFiles, {base: 'src'})
        .pipe(plumber())
        .pipe(gulp.dest(config.path.build));
}
//Компиляция стилей SCSS
function compileStyle() {
    return gulp.src(config.path.scssFiles)
        .pipe(plumber())
        .pipe(sourcemaps.init())
        .pipe(sass({quiet: true, includePaths: ['src']}))
        .pipe(autoprefixer({
            browsers: ['last 2 versions'],
            cascade: false
        }))
        .pipe(sourcemaps.write())
        .pipe(gulp.dest(config.path.build + ''));
}
//Компиляция статичных JADE HTML
function compileStaticTemplates() {
    var locals = {
        build: build
    };

    return gulp.src(config.path.jadeHtmlFiles)
        .pipe(plumber())
        .pipe(jade({
            client: false,
            pretty: true,
            locals: locals
        }))
        .pipe(rename({extname: ""}))
        .pipe(gulp.dest(config.path.build));
}
//Компиляция шаблонов JADE
function compileTemplates() {
    function scanJadeIncludes(jadeFileName, basePath, callback) {
        fs.readFile(jadeFileName, {"encoding": "utf-8"}, function (err, data) {
            if (err) {
                callback(err);
            } else {
                var res = [];
                var tasks = [];
                data = data.split("\n");
                data.forEach(function (line) {
                    line = line.trim().split(/\s+/);
                    if (line[0] == 'include') {
                        line = line[1];
                        if (line.indexOf('.jade') == -1) {
                            line += '.jade';
                        }
                        var fn = path.join(basePath, line);
                        res.push(fn);
                        line = path.join(path.dirname(jadeFileName), line);
                        tasks.push(function (cb) {
                            scanJadeIncludes(line, path.dirname(fn), cb);
                        });
                    }
                });
                async.parallel(tasks, function (err, cbres) {
                    if (err) {
                        console.log(err);
                    }
                    if (cbres && cbres.length) {
                        cbres.forEach(function (r) {
                            if (r && r.length) {
                                r.forEach(function (e) {
                                    if (e && e.length) {
                                        res.push(e);
                                    }
                                });
                            }
                        });
                    }
                    callback(err, res);
                });
            }
        });
    }

    return gulp.src(config.path.jadeFiles)
        .pipe(plumber())
        .pipe(jade({client: true, pretty: true}))
        .pipe(wrap({deps: ['vendor/js/runtime', '{cssIncludePlaceholder}'], params: ['jade']}))
        .pipe(through.obj(function (file, enc, cb) {
            var fn = file.history[0];
            fn = fn.split(path.sep);
            fn = fn[fn.length - 1];
            var css = fn.split('.');
            css[css.length - 1] = 'css';
            css = css.join('.');
            var cssArr = [css];
            var self = this;
            scanJadeIncludes(file.history[0], '.', function (err, res) {
                if (err) {
                    console.log(err);
                }
                if (res && res.length) {
                    res.forEach(function (fn) {
                        cssArr.push(fn.replace(/\.jade$/, '.css').replace(/\\/g, '/'));
                    });
                }
                // TODO: skip css files that absent in current directory with extention "scss"

                file.contents = new Buffer(String(file.contents)
                        .replace("{cssIncludePlaceholder}", 'css!./' + cssArr.join('","css!'))
                );
                self.push(file);
                cb();
            });
        }))
        .pipe(rename({extname: ".jade.js"}))
        .pipe(gulp.dest(config.path.build));
}

//Вотчеры
function registerWatchers() {
    watch(config.staticFiles, {verbose: true, name: 'copy-changed-files', base: 'src'}, function (files, done) {
        return files.pipe(plumber())
            .pipe(gulp.dest(config.path.build))
            .on('end', done);
    });
    watch(config.path.jadeHtmlFiles, {verbose: true, name: 'jade-static-compile-files'}, compileStaticTemplates);
    watch(config.path.jadeFiles, {verbose: true, name: 'jade-compile-files'}, compileTemplates);
    watch(config.path.scssFiles, {verbose: true, name: 'style-compile-files'}, compileStyle);
    return gulp;
}

//Минификация css
function cssMinConcat() {
    return gulp.src([config.path.build + '/**/*.css', "!**/test/**"], {base: 'build'})
        .pipe(concat('styles.css'))
        .pipe(minifyCSS({noAdvanced: 1}))
        .pipe(gulp.dest(config.path.release));
}
//Минификация HTML
function htmlMin() {
    return gulp.src([config.path.build + '/**/*.html', "!**/test/**"])
        .pipe(minifyHtml())
        .pipe(gulp.dest(config.path.release));
}
//GZIP release build
function gzipTask() {
    return gulp.src(config.path.release + config.gzipFiles)
        .pipe(gzip({gzipOptions: {level: 9}}))
        .pipe(gulp.dest(''));
}
//Копирование файлов в релиз
function copyStaticFileRelease() {
    return gulp.src(config.staticRelease, {base: 'build'})
        .pipe(gulp.dest(config.path.release));
}
//Минимизация JS
function jsMin() {
    return gulp.src([config.path.build + '/**/*.js', "!**/test/**", "!**/css.js", "!**/css-builder.js"], {base: 'build'})
        .pipe((through.obj(function (file, enc, cb) {
            var c = String(file.contents)
                .replace(/"css\![\.\/\w\-]+"[,]*/g, "")
                .replace(/,]/g, "]")
                .replace(/console.log\(.*\)/g, "eval(false)");
            file.contents = new Buffer(c);
            this.push(file);
            cb();
        })))
        .pipe(gulp.dest('temp/'));
}



function concatRjs() {
    return gulp.src('temp/main.js', {baseUrl: 'temp'})
        .pipe(shell([ 'cd temp &&' +
        'node ../node_modules/requirejs/bin/r.js -o baseUrl=. name=main out=all.js  mainConfigFile=require-config.js'
        ]))
        .pipe(concat("all.js"));
}

function concatAllJs() {
    return gulp.src(['temp/all.js', 'temp/**/require.js', 'temp/require-config.js'])
        .pipe(order([
            "**/require.js",
            "**/require-config.js",
            "**/all.js"
        ]))
        .pipe(concat("main.js"))
       // .pipe(uglify())
        .pipe(gulp.dest(config.path.release));

}

function setBuild(cb) {
    build = 'prod';
    return cb();
}

gulp.task('development', gulp.series('clean', installModules, 'bower',
    'jsHint', gulp.parallel(copyStaticClientFiles, compileStyle, compileStaticTemplates, compileTemplates)));


gulp.task('default', gulp.series('development', registerWatchers));
gulp.task('release', gulp.series(setBuild, 'development',
    gulp.parallel(cssMinConcat, jsMin, htmlMin, copyStaticFileRelease), concatRjs, concatAllJs, gzipTask));
