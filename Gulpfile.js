var gulp        = require('gulp');
var babel       = require('gulp-babel');
var mocha       = require('gulp-mocha');
var del         = require('del');
var path        = require('path');
var spawn       = require('./utils/spawn');

var PACKAGE_PARENT_DIR  = path.join(__dirname, '../');
var PACKAGE_SEARCH_PATH = (process.env.NODE_PATH ? process.env.NODE_PATH + path.delimiter : '') + PACKAGE_PARENT_DIR;

function clean () {
    return del('lib');
}

function lint () {
    var eslint = require('gulp-eslint');

    return gulp
        .src([
            'src/**/*.js',
            'Gulpfile.js'
        ])
        .pipe(eslint())
        .pipe(eslint.format())
        .pipe(eslint.failAfterError());
}

function build () {
    return gulp
        .src('src/**/*.js')
        .pipe(babel())
        .pipe(gulp.dest('lib'));
}

function testMocha () {
    if (!process.env.TB_KEY || !process.env.TB_SECRET)
        throw new Error('Specify your credentials by using the TB_KEY and TB_SECRET environment variables to authenticate to TestingBot.');

    return gulp
        .src('test/mocha/**/*.js')
        .pipe(mocha({
            ui:       'bdd',
            reporter: 'spec',
            timeout:  typeof v8debug === 'undefined' ? 2000 : Infinity,
        }));
}

function testTestcafe () {
    if (!process.env.TB_KEY || !process.env.TB_SECRET)
        throw new Error('Specify your credentials by using the TB_KEY and TB_SECRET environment variables to authenticate to TestingBot.');

    var testCafeCmd = path.join(__dirname, 'node_modules/.bin/testcafe');

    var testCafeOpts = [
        'testingbot:chrome',
        'test/testcafe/**/*.js',
        '-s', '.screenshots'
    ];

    // NOTE: we must add the parent of plugin directory to NODE_PATH, otherwise testcafe will not be able
    // to find the plugin. So this function starts testcafe with proper NODE_PATH.
    return spawn(testCafeCmd, testCafeOpts, { NODE_PATH: PACKAGE_SEARCH_PATH });
}

exports.clean     = clean;
exports.lint      = lint;
exports.build     = gulp.parallel(lint, gulp.series(clean, build));
exports.test      = gulp.series(exports.build, testMocha, testTestcafe);
