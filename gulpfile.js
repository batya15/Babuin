var gulp = require('gulp');
var install = require('gulp-install');
var config = require('./gulp/config.json');


//Копирование главных файлов BOWER в папку vendor
require('./gulp/bower')(gulp);
require('./gulp/jsHint')(gulp);
//Удаление папки билда
require('./gulp/clean')('clean', gulp, [config.path.build], config.path.src);
//Удаление папки билда и всех зависимостей npm и bower
require('./gulp/clean')('cleanHard', gulp, [config.path.build, config.path.bower_components, config.path.vendor_js, config.path.release], config.path.src);

gulp.task('default', gulp.series('clean'));