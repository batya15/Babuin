"use strict";
var rimraf = require('rimraf');

module.exports = function(name, gulp, paths, src) {
    gulp.task(name, function () {
        paths.forEach(function (val) {
            rimraf.sync(val);
        });
        return gulp.src(src);
    });
};