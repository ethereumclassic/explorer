/**
 * gulpfile.js
 */
const concat = require('gulp-concat');
const del = require('del');
const eslint = require('gulp-eslint');
const gulp = require('gulp');
const minifyCSS = require('gulp-minify-css');
const rename = require('gulp-rename');
const uglify = require('gulp-uglify');

// some variables
const bases = {
  publicdir: 'public/',
  distdir: 'dist/'
};

// normalize
bases.distdir = bases.distdir.replace(/\/$/, '') + '/';
bases.publicdir = bases.publicdir.replace(/\/$/, '') + '/';

// define files
const public_js_scripts = [
  'app.min.js',
  'custom.js',
  'directives.js',
  'filters.js',
  'layout.js',
  'layout.min.js',
  'main.js',
  'web3utils.js'
];

const public_js_controllers_scripts = [
  'AddressController.js',
  'AccountsController.js',
  'BlockController.js',
  'ContractController.js',
  'ErrController.js',
  'HomeController.js',
  'StatsController.js',
  'TokenController.js',
  'TokenListController.js',
  'TxController.js',
  'UncleController.js'
];

const vendor = [
 'js/lib/angular.min.js',
 'js/lib/bootstrap.min.js',
 'js/lib/d3.min.js',
 'js/lib/jquery-1.11.3.min.js',
 'js/lib/lodash.min.js',
 'js/lib/moment.en.min.js',
 'js/lib/moment.min.js',
 'js/lib/ngStorage.min.js'
];

const styles = [
  'animate.css',
  'blue-hoki.min.css',
  'bootstrap.css',
  'bootstrap-theme.css',
  'components.min.css',
  'default.css',
  'etc-explorer.min.css',
  'font-awesome.css',
  'green-haze.min.css',
  'isotope.css',
  'layout.min.css',
  'overwrite.css',
  'plugins.min.css',
  'stats.css',
  'style.css',
  'todo-2.min.css'
];

// define tasks
gulp.task('copy-module', ['clean'], () => {
  // angular
  gulp.src(['angular.min.js', 'angular.min.js.map'], {cwd: 'node_modules/angular'})
    .pipe(gulp.dest(bases.distdir + 'plugins/angularjs'));
  gulp.src(['angular-sanitize.min.js', 'angular-sanitize.min.js.map'], {cwd: 'node_modules/angular-sanitize'})
    .pipe(gulp.dest(bases.distdir + 'plugins/angularjs'));
  gulp.src(['angular-cookies.min.js'], {cwd: 'node_modules/angular-cookies'})
    .pipe(gulp.dest(bases.distdir + 'plugins/angularjs'));
  gulp.src(['angular-touch.min.js', 'angular-touch.min.js.map'], {cwd: 'node_modules/angular-touch'})
    .pipe(gulp.dest(bases.distdir + 'plugins/angularjs'));
  gulp.src(['angular-ui-router.min.js', 'angular-ui-router.min.js.map'], {cwd: 'node_modules/angular-ui-router/release'})
    .pipe(gulp.dest(bases.distdir + 'plugins/angularjs/plugins'));

  // jquery
  gulp.src(['dist/jquery.min.*'], {cwd: 'node_modules/jquery'})
    .pipe(gulp.dest(bases.distdir + 'plugins'));
  gulp.src(['dist/jquery.uniform.min.js'], {cwd: 'node_modules/jquery-uniform'})
    .pipe(gulp.dest(bases.distdir + 'plugins/uniform'));
  gulp.src(['jquery.slimscroll.min.js'], {cwd: 'node_modules/jquery-slimscroll'})
    .pipe(gulp.dest(bases.distdir + 'plugins/jquery-slimscroll'));
  gulp.src(['css/*.min.css', 'images/*.*'], {cwd: 'node_modules/jquery-uniform/themes/default', base: 'node_modules/jquery-uniform/themes/default'})
    .pipe(gulp.dest(bases.distdir + 'plugins/uniform'));
  gulp.src(['select.min.js', 'select.min.js.map', 'select.min.css'], {cwd: 'node_modules/ui-select/dist'})
    .pipe(gulp.dest(bases.distdir + 'plugins/angularjs/plugins/ui-select'));

  // bootstrap
  gulp.src(['css/*.min.css', 'css/*.min.css.map', 'js/*.min.js', 'fonts/*.*'], {cwd: 'node_modules/bootstrap/dist', base: 'node_modules/bootstrap/dist'})
    .pipe(gulp.dest(bases.distdir + 'plugins/bootstrap'));
  gulp.src(['*.min.js'], {cwd: 'node_modules/bootstrap-hover-dropdown'})
    .pipe(gulp.dest(bases.distdir + 'plugins/bootstrap-hover-dropdown'));
  gulp.src(['js/*.min.js'], {cwd: 'node_modules/bootstrap-switch/dist', base: "node_modules/bootstrap-switch/dist" })
    .pipe(gulp.dest(bases.distdir + 'plugins/bootstrap-switch'));
  gulp.src(['css/bootstrap3/*.min.css'], {cwd: 'node_modules/bootstrap-switch/dist'})
    .pipe(gulp.dest(bases.distdir + 'plugins/bootstrap-switch/css'));

  // font-awesome
  gulp.src(['css/*.min.css*', 'fonts/*.*'], {cwd: 'node_modules/font-awesome', base: "node_modules/font-awesome" })
    .pipe(gulp.dest(bases.distdir + 'plugins/font-awesome'));
  // datatables
  gulp.src(['images/*'], {cwd: 'node_modules/datatables.net-dt', base: 'node_modules/datatables.net-dt'})
    .pipe(gulp.dest(bases.distdir + 'plugins/datatables'));
  // lazyload
  gulp.src(['ocLazyLoad.min.js'], {cwd: 'node_modules/oclazyload/dist'})
    .pipe(gulp.dest(bases.distdir + 'plugins/angularjs/plugins'));
  // simple-line-icons
  gulp.src(['*.css', 'fonts/*.*'], {cwd: 'node_modules/simple-line-icons', base: 'node_modules/simple-line-icons'})
    .pipe(gulp.dest(bases.distdir + 'plugins/simple-line-icons'));

  // misc
  gulp.src([
      'async/dist/async.min.js',
      'async/dist/async.min.map',
      'd3/d3.min.js',
      'd3-time/dist/d3-time.min.js',
      'jquery-sparkline/jquery.sparkline.min.js',
      'lodash/lodash.min.js',
      'moment/min/moment.min.js'
    ], {cwd: 'node_modules'})
    .pipe(gulp.dest(bases.distdir + 'plugins'));
});

gulp.task('cssmin-module', ['clean'], () => {
  // datatables
  gulp.src('node_modules/datatables.net-dt/css/jquery.dataTables.css')
    .pipe(minifyCSS({keepBreaks:false}))
    .pipe(rename('datatables.min.css'))
    .pipe(gulp.dest(bases.distdir + 'plugins/datatables'));

  gulp.src('node_modules/datatables.net-bs/css/dataTables.bootstrap.css')
    .pipe(minifyCSS({keepBreaks:false}))
    .pipe(rename('datatables.bootstrap.min.css'))
    .pipe(gulp.dest(bases.distdir + 'plugins/datatables'));

  // simple-line-icons
  gulp.src('node_modules/simple-line-icons/css/simple-line-icons.css')
    .pipe(minifyCSS({keepBreaks:false}))
    .pipe(rename('simple-line-icons.min.css'))
    .pipe(gulp.dest(bases.distdir + 'plugins/simple-line-icons/css'));
});

gulp.task('uglify-module', ['clean'], () => {
  // jquery
  gulp.src('node_modules/js-cookie/src/js.cookie.js')
    .pipe(uglify())
    .pipe(rename('jquery.cookie.min.js'))
    .pipe(gulp.dest(bases.distdir + 'plugins'));

  gulp.src('node_modules/block-ui/jquery.blockUI.js')
    .pipe(uglify())
    .pipe(rename('jquery.blockui.min.js'))
    .pipe(gulp.dest(bases.distdir + 'plugins'));

  // ui-boostrap
  gulp.src('node_modules/angular-ui-bootstrap/dist/ui-bootstrap-tpls.js')
    .pipe(uglify())
    .pipe(rename('ui-bootstrap-tpls.min.js'))
    .pipe(gulp.dest(bases.distdir + 'plugins/angularjs/plugins'));

  // datatables
  gulp.src(['node_modules/datatables.net/js/jquery.dataTables.js', 'node_modules/datatables.net-bs/js/dataTables.bootstrap.js'])
    .pipe(concat('datatables.all.min.js'))
    .pipe(uglify())
    .pipe(gulp.dest(bases.distdir + 'plugins/datatables'));

  // d3.tip
  gulp.src('node_modules/d3-tip/dist/index.js')
    .pipe(uglify())
    .pipe(rename('d3.tip.min.js'))
    .pipe(gulp.dest(bases.distdir + 'plugins'));
});

const copyPublic = () => {
  // files in the public dir.
  gulp.src(public_js_scripts, {cwd: bases.publicdir + 'js'})
    .pipe(gulp.dest(bases.distdir + 'js'));
  gulp.src(public_js_controllers_scripts, {cwd: bases.publicdir + 'js/controllers'})
    .pipe(gulp.dest(bases.distdir + 'js/controllers'));

  // public css
  gulp.src(styles, {cwd: bases.publicdir + 'css'})
    .pipe(gulp.dest(bases.distdir + 'css'));
  // public css/fonts
  gulp.src(['*.*'], {cwd:bases.publicdir +  'css/fonts'})
    .pipe(gulp.dest(bases.distdir + 'css/fonts'));

  gulp.src([
      // images
      'favicon.ico',
      'img/*.*', 'img/social/*',

      // FIXME
      'tokens.json',

      // tpl
      'tpl/*.html',
      'views/*.html',
      'views/stats/index.html'
    ], {cwd: bases.publicdir, base: bases.publicdir})
    .pipe(gulp.dest(bases.distdir));
};

gulp.task('copy-public', ['clean'], copyPublic);

// Delete the dist directory
gulp.task('clean', (cb) => {
  return del([bases.distdir], cb);
});

gulp.task('build', ['clean', 'copy-module', 'cssmin-module', 'uglify-module',  'copy-public']);
gulp.task('lint', () => {
  return gulp.src(['*.js', './lib/*.js', './routes/*.js', './tools/*.js', './test/*.js', './test/units/*.js'])
    .pipe(eslint())
    .pipe(eslint.format())
    .pipe(eslint.failAfterError());
});
gulp.task('default', ['build']);
