var stylish = require('jshint-stylish');
var jshint = require('gulp-jshint');
var config = require('./config.json');

module.exports = function(gulp) {
    gulp.task('jsHint', function () {
        return gulp.src(config.path.jsHint)
            .pipe(jshint())
            .pipe(jshint.reporter(stylish))
            .on('error', function (error) {
                console.error(String(error));
            });
    });
};