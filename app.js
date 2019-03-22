#!/usr/bin/env node

require('./db');

const express = require('express');
const path = require('path');
const favicon = require('serve-favicon');
const logger = require('morgan');
const bodyParser = require('body-parser');

let config = {};
try {
  config = require('./config.json');
} catch (e) {
  if (e.code == 'MODULE_NOT_FOUND') {
    console.log('No config file found. Using default configuration... (config.example.json)');
    config = require('./config.example.json');
  } else {
    throw e;
    process.exit(1);
  }
}

const app = express();
app.set('port', process.env.PORT || 3000);

// view engine setup
app.set('views', path.join(__dirname, 'views'));
app.set('view engine', 'ejs');

app.use(favicon(`${__dirname}/public/favicon.ico`));
app.use(logger('dev'));
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));
app.use(express.static(path.join(__dirname, 'public')));

// app libraries
global.__lib = `${__dirname}/lib/`;

// client

app.get('/', (req, res) => {
  res.render('index', config);
});

app.get('/config', (req, res) => {
  res.json(config.settings);
});

require('./routes')(app);

// let angular catch them
app.use((req, res) => {
  res.render('index', config);
});

// error handlers

// development error handler
// will print stacktrace
if (app.get('env') === 'development') {
  app.use((err, req, res, next) => {
    res.status(err.status || 500);
    res.render('error', {
      message: err.message,
      error: err,
    });
  });
}

// production error handler
// no stacktraces leaked to user
app.use((err, req, res, next) => {
  res.status(err.status || 500);
  res.render('error', {
    message: err.message,
    error: {},
  });
});

const http = require('http').Server(app);

http.listen(app.get('port'), '0.0.0.0', () => {
  console.log(`Express server listening on port ${app.get('port')}`);
});
