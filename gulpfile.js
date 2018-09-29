const path = require('path');
const gulp = require("gulp");
const less = require("gulp-less");
const rename = require("gulp-rename");
const imagemin = require("gulp-imagemin");
const del = require("del");
const replace = require("gulp-replace");
const postcss = require("gulp-postcss");
const gulpif = require("gulp-if");
const gutil = require("gulp-util");
const newer = require("gulp-newer");
const cache = require("gulp-cached");
const debug = require("gulp-debug");
const pxtorpx = require("postcss-px2rpx");
const base64 = require("postcss-font-base64");
const argv = require("yargs").argv;


// 相关路径配置
const paths = {
  src: {
    baseDir: "src",
    imgDir: "src/images",
    imgFiles: "src/images/**/*",
    lessFiles: "src/**/*.less",
    baseFiles: [
      "src/**/*.{png,js,json}",
      "!src/images/**/*",
    ],
    wxmlFiles: "src/**/*.wxml",
    jsFiles: "src/**/*.js",
  },
  dist: {
    baseDir: "dist",
    imgDir: "dist/image"
  }
};

// function of log for gulp
let log = () => {
	let data = Array.prototype.slice.call(arguments);
  gutil.log.apply(false, data);
}

// compress Picture
let imageMin = () => {
	// return gulp.src(paths.src.imgFiles, {si≤nce: gulp.lastRun(imageMin)})
	return gulp.src(paths.src.imgFiles)
		.pipe(newer(paths.dist.imgDir))
		.pipe(imagemin({
			progressive: true,
			svgoPlugins: [{ removeViewBox: false }]
		}))
		.pipe(gulp.dest(paths.dist.imgDir));
}

// compile less
let lessCompile = () => {
	return gulp
    .src(paths.src.lessFiles)
    .pipe(less({ paths: [path.join(__dirname, "less", "includes")] }))
    .pipe(gulpif(Boolean(argv.debug), debug({
          title: "`lessCompile` Debug:",
        })))
    .pipe(rename({ extname: ".wxss" }))
    .pipe(replace(".less", ".wxss"))
    .pipe(gulp.dest(paths.dist.baseDir));
}


// copy basicFiles
let copyBasicFiles = () => {
	return gulp.src(paths.src.baseFiles, {})
		.pipe(gulp.dest(paths.dist.baseDir))
}

// copy WXML
let copyWXML = () => {
	return gulp.src(paths.src.wxmlFiles, {})
		.pipe(gulp.dest(paths.dist.baseDir))
}

// clean dist
let cleanDist = () => {
	return del(paths.dist.baseDir)
}

let watchHandler = (type, file) => {
	let extname = path.extname(file)
	// LESS 文件
	if (extname === '.less') {
		if (type === 'removed') {
			let tmp = file.replace('src/', 'dist/').replace(extname, '.wxss');
			del([tmp]);
		} else {
			lessCompile();
		}
	}
	// 图片文件
	else if (extname === '.png' || extname === '.jpg' || extname === '.jpeg' || extname === '.svg' || extname === '.gif') {
		if (type === 'removed') {
			if (file.indexOf('assets') > -1) {
				del([file.replace('src/', 'tmp/')]);
			} else {
				del([file.replace('src/', 'dist/')]);
			}
		} else {
			imageMin();
			wxmlImgRewrite();
		}
	}

	// wxml
	else if (extname === '.wxml') {
		if (type === 'removed') {
			let tmp = file.replace('src/', 'dist/')
			del([tmp]);
		} else {
			copyWXML();
			wxmlImgRewrite();
		}
	}

	// 其余文件
	else {
		if (type === 'removed') {
			let tmp = file.replace('src/', 'dist/');
			del([tmp]);
		} else {
			copyBasicFiles();
			// copyWXML();
			// wxmlImgRewrite();
		}
	}
};

// add watch
let watch = (cb) => {
	let watcher = gulp.watch([
		paths.src.baseDir
	],
		{ ignored: /[\/\\]\./ }
	);
	watcher
		.on('change', function (file) {
			log(gutil.colors.yellow(file) + ' is changed');
			watchHandler('changed', file);
		})
		.on('add', function (file) {
			log(gutil.colors.yellow(file) + ' is added');
			watchHandler('add', file);
		})
		.on('unlink', function (file) {
			log(gutil.colors.yellow(file) + ' is deleted');
			watchHandler('removed', file);
		});

	cb();
}

// add gulp default progress
gulp.task('default', gulp.series(
	copyBasicFiles,
	gulp.parallel(
		lessCompile,
		imageMin,
		copyWXML
	),
	watch
))

// clean dist
gulp.task('clean', gulp.parallel(
	cleanDist
))