/**
 * gulpfile.js
 */
var _ = require('lodash');
var gulp = require('gulp');
var del = require('del');
var minifyCSS = require('gulp-minify-css');
var jshint = require('gulp-jshint');
var uglify = require('gulp-uglify');
var concat = require('gulp-concat');
var rename = require('gulp-rename');
var watch = require('gulp-watch');
var spawn = require('child_process').spawn;
var livereload = require('gulp-livereload');

// some variables
var nodeapp, nodesync, nodestats;
var bases = {
  publicdir: 'public/',
  distdir: 'dist/'
};

// normalize
bases.distdir = bases.distdir.replace(/\/$/, '') + '/';
bases.publicdir = bases.publicdir.replace(/\/$/, '') + '/';

console.log(bases);

var nodeapp_scripts = [
  'lib/etherUnits.js',
  'lib/trace.js',

  'routes/compiler.js',
  'routes/contracts.js',
  'routes/dao.js',
  'routes/fiat.js',
  'routes/filters.js',
  'routes/index.js',
  'routes/stats.js',
  'routes/token.js',
  'routes/web3dummy.js',
  'routes/web3relay.js'
];

var views_ejs = [
  'views/index.ejs',
  'views/error.ejs'
];

var watch_files = [
  'favicon.ico',
  'tokens.json',
  'js/*.js',
  'js/controllers/*.js',
  'views/**/*',
  'img/*.*',
  'img/social/*',
  'tpl/*.html',
  'views/*.html',
  'views/stats/index.html'
];

var public_watch_files = watch_files.map(function(f) {
  return bases.publicdir + f;
});

var dist_watch_files = watch_files.map(function(f) {
  return bases.distdir + f;
});

// define files
var public_js_scripts = [
  'app.min.js',
  'custom.js',
  'directives.js',
  'filters.js',
  'layout.js',
  'layout.min.js',
  'main.js',
  'web3utils.js'
];

var public_js_controllers_scripts = [
  'AddressController.js',
  'AccountsController.js',
  'BlockController.js',
  'ContractController.js',
  'DAOController.js',
  'ErrController.js',
  'HomeController.js',
  'StatsController.js',
  'TokenController.js',
  'TokenListController.js',
  'TxController.js',
  'UncleController.js'
];

var vendor = [
 'js/lib/angular.min.js',
 'js/lib/bootstrap.min.js',
 'js/lib/d3.min.js',
 'js/lib/jquery-1.11.3.min.js',
 'js/lib/lodash.min.js',
 'js/lib/moment.en.min.js',
 'js/lib/moment.min.js',
 'js/lib/ngStorage.min.js'
];

var styles = [
  'animate.css',
  'blue-hoki.min.css',
  'bootstrap.css',
  'bootstrap-theme.css',
  'components.min.css',
  'custom.css',
  'default.css',
  'font-awesome.css',
  'green-haze.min.css',
  'isotope.css',
  'layout.css',
  'overwrite.css',
  'plugins.min.css',
  'stats.css',
  'style.css',
  'todo-2.min.css'
];

// define tasks
gulp.task('check', function() {
  return gulp.src([bases.distdir + '/**/*'])
    .pipe(livereload());
});

gulp.task('watch', function() {
  gulp.watch(public_watch_files, {base: bases.publicdir}).on('change', function(file, stat) {
    // copy public -> dist
    gulp.src(file.path, {base: bases.publicdir})
      .pipe(gulp.dest(bases.distdir));
  });

  livereload.listen();
  gulp.watch([bases.distdir + '/**/*']).on('change', function(file) {
    livereload.changed(file.path);
  });
});

gulp.task('nodeapp', function() {
  if (nodeapp) nodeapp.kill()

  // set NODE_ENV=development conditionally.
  var env = Object.create(process.env);
  env.NODE_ENV = env.NODE_ENV || "development";

  nodeapp = spawn('node', ['app.js'], {stdio: 'inherit', env: env})
  nodeapp.on('close', function(code) {
    if (code === 8) {
      gulp.log('Error detected, waiting for changes...');
    }
  });
});

gulp.task('nodesync', function() {
  if (nodesync) nodesync.kill();
  nodesync = spawn('node', ['tools/sync.js'], {stdio: 'inherit'})
  nodesync.on('close', function(code) {
    if (code === 8) {
      gulp.log('Error detected, waiting for changes...');
    }
  });
});

gulp.task('nodestats', function() {
  if (nodestats) nodestats.kill();
  nodestats = spawn('node', ['tools/stats.js'], {stdio: 'inherit'});
  nodestats.on('close', function(code) {
    if (code === 8) {
      gulp.log('Error detected, waiting for changes...');
    }
  });
});

gulp.task('app', function() {
  gulp.start('nodeapp');
  var scripts = _.extend(nodeapp_scripts, views_ejs);
  gulp.watch(scripts, ['nodeapp', 'check']);
});

gulp.task('stats', function() {
  gulp.start('nodestats');
  gulp.watch(['tools/stats.js'], ['nodestats']);
});

gulp.task('sync', function() {
  gulp.start('nodesync');
  gulp.watch(['tools/sync.js'], ['nodesync']);
});

// kill processes if an error occured
process.on('exit', function() {
  if (nodeapp) nodeapp.kill();
  if (nodesync) nodesync.kill();
  if (nodestats) nodestats.kill();
});

gulp.task('copy-module', ['clean'], function() {
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
      'd3-time/build/d3-time.min.js',
      'jquery-sparkline/jquery.sparkline.min.js',
      'lodash/lodash.min.js',
      'moment/min/moment.min.js'
    ], {cwd: 'node_modules'})
    .pipe(gulp.dest(bases.distdir + 'plugins'));
});

gulp.task('cssmin-module', ['clean'], function() {
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

gulp.task('uglify-module', ['clean'], function() {
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

var copyPublic = function() {
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

var uglifyPublic = function() {
    // noop
};

gulp.task('copy-public', ['clean'], copyPublic);
gulp.task('uglify-public', ['clean'], uglifyPublic);

gulp.task('copy-public-watch', copyPublic);
gulp.task('uglify-public-watch', uglifyPublic);

// Delete the dist directory
gulp.task('clean', function(cb) {
  return del([bases.distdir], cb);
});

gulp.task('build', ['clean', 'copy-module', 'cssmin-module', 'uglify-module',  'copy-public', 'uglify-public']);
gulp.task('start', ['app'], function() {
  gulp.start('watch');
});

gulp.task('default', ['build']);
