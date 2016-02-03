const gulp = require('gulp');
const mocha = require('gulp-mocha');
const file = require('gulp-file');
const istanbul = require('gulp-istanbul');
const webpack = require('webpack-stream');
const child = require('child_process');
const help = require("gulp-task-listing");

gulp.task('help', help);

gulp.task('default', ['build']);

////////////////////////////////////////
// BUILDING
////////////////////////////////////////

const BUILD_TARGET_FILENAME = 'socket.io.js';
const BUILD_TARGET_DIR = './';

gulp.task('build', ['webpack']);

gulp.task('webpack', function() {
  return gulp.src('lib/*.js')
    .pipe(webpack({
      entry: './lib/index.js',
      output: {
        library: 'io',
        libraryTarget: 'umd',
        filename: BUILD_TARGET_FILENAME
      },
      externals: {
          'global': glob()
      },
      module: {
        loaders: [{
          test: /\.(js|jsx)?$/,
          exclude: /(node_modules|bower_components)/,
          loader: 'babel', // 'babel-loader' is also a legal name to reference
          query: {
              presets: ['react', 'es2015']
          }
        }]
      }
    }))
    .pipe(gulp.dest(BUILD_TARGET_DIR));
});


////////////////////////////////////////
// TESTING
////////////////////////////////////////

const REPORTER = 'dot';
const TEST_FILE = "./test/index.js";
const TEST_SUPPORT_SERVER_FILE = "./test/support/server.js";

gulp.task('test', function() {
  if (process.env.hasOwnProperty("BROWSER_NAME")) {
    return testZuul();
  } else {
    return testNode();
  }
});

gulp.task('test-node', testNode);
gulp.task('test-zuul', testZuul);

// runs zuul through shell process
function testZuul() {
  const ZUUL_CMD = "./node_modules/zuul/bin/zuul";
  const args = [
    "--browser-name",
    process.env.BROWSER_NAME,
    "--browser-version",
    process.env.BROWSER_VERSION
  ];
  if (process.env.hasOwnProperty("BROWSER_PLATFORM")) {
    args.push("--browser-platform");
    args.push(process.env.BROWSER_PLATFORM);
  }
  args.push(TEST_FILE);
  return child.spawn(ZUUL_CMD, args, { stdio: "inherit" });
}

function testNode() {
  const MOCHA_OPTS = {
    reporter: REPORTER,
    require: [TEST_SUPPORT_SERVER_FILE],
    bail: true
  };
  return gulp.src(TEST_FILE, { read: false })
    .pipe(mocha(MOCHA_OPTS))
    // following lines to fix gulp-mocha not terminating (see gulp-mocha webpage)
    .once("error", function(err) {
      console.error(err.stack);
      process.exit(1);
    })
    .once("end", function() {
      process.exit();
    });
}

gulp.task('istanbul-pre-test', function () {
  return gulp.src(['lib/**/*.js'])
    // Covering files
    .pipe(istanbul())
    // Force `require` to return covered files
    .pipe(istanbul.hookRequire());
});

gulp.task('test-cov', ['istanbul-pre-test'], function(){
  gulp.src(['test/*.js', 'test/support/*.js'])
    .pipe(mocha({
      reporter: REPORTER
    }))
    .pipe(istanbul.writeReports())
    .once('error', function (err){
      console.error(err);
      process.exit(1);
    })
    .once('end', function (){
      process.exit();
    });
});

/**
 * Populates `global`.
 *
 * @api private
 */

function glob(){
  return 'typeof self !== "undefined" ? self : '
    + 'typeof window !== "undefined" ? window : '
    + 'typeof global !== "undefined" ? global : {}';
}
