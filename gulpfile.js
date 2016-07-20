var gulp = require('gulp'),
    minifyCSS = require('gulp-minify-css'),
    rename = require('gulp-rename'),
    sass = require('gulp-sass');

gulp.task('default', function() {
    gulp.src('site/scss/**.scss')
        .pipe(sass())
        .pipe(minifyCSS())
        .pipe(rename('core.min.css'))
        .pipe(gulp.dest('site/css/core'))
});

gulp.task('watch', function() {
    gulp.watch('site/scss/*.scss', ['default'])

});