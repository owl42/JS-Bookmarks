var path = require('path');
var gulp = require('gulp');
var clone = require('gulp-clone');
var concat = require('gulp-concat');
var gulpIf = require('gulp-if');
var inject = require('gulp-inject');
var uglify = require('gulp-uglify');
var less = require('gulp-less');
var minifyCss = require('gulp-minify-css');
var minifyHtml = require('gulp-minify-html');
var templateCache = require('gulp-angular-templatecache');
var merge2 = require('merge2');
var dist = 'dist';
var build = 'build';

function checkExt(ext) {
	if (!Array.isArray(ext)) ext = [ext];
	return function(file) {
		return ext.indexOf(path.extname(file.path)) >= 0;
	};
}
function addStreams(_streams) {
	if(Array.isArray(_streams))
		streams = streams.concat(_streams);
	else
		streams.push(_streams);
	var stream = merge2(_streams)
		.pipe(gulpIf(checkExt('.less'), less()))
		.pipe(gulpIf(checkExt('.css'), minifyCss()))
		.pipe(gulpIf(checkExt('.js'), uglify()));
	streams.push(stream.pipe(clone()));
	return stream;
}
var streams = [];

gulp.task('template-cache', function() {
	return gulp.src('src/options/templates/*.html')
		.pipe(minifyHtml({empty: true}))
		.pipe(templateCache({
			module: 'app',
			root: 'templates',
		}))
		.pipe(gulp.dest(build));
});

gulp.task('inject-html', ['template-cache'], function() {
	return gulp.src('src/*/*.html', {base: 'src'})
		.pipe(inject(addStreams([
			gulp.src('src/options/*.less', {base: 'src'}),
			gulp.src(['src/options/options.js', 'src/options/*.js', build + '/templates.js'], {base: 'src'})
				.pipe(concat('options/options.js')),
		]), {
			name: 'options',
			relative: true,
			addRootSlash: false,
		}))
		.pipe(inject(addStreams([
			gulp.src('src/popup/*.less', {base: 'src'}),
			gulp.src('src/popup/*.js', {base: 'src'}),
		]), {
			name: 'popup',
			relative: true,
			addRootSlash: false,
		}))
		.pipe(inject(addStreams(gulp.src('src/background/*.js', {base: 'src'})), {
			name: 'background',
			relative: true,
			addRootSlash: false,
		}))
		.pipe(minifyHtml({empty: true}))
		.pipe(gulp.dest(dist));
});

gulp.task('build-assets', ['inject-html'], function() {
	return merge2(streams)
		.pipe(gulp.dest(dist));
});

gulp.task('copy-files', function() {
	return gulp.src([
		'src/_locales/**/*',
		'src/images/*',
		'src/*',
		'src/lib/**/*',
		'!src/lib/less.min.js',
	], {base: 'src'})
		.pipe(gulp.dest(dist));
});

gulp.task('default', ['build-assets', 'copy-files']);
