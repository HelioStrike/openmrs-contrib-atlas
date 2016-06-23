// variables
var express = require('express');
var path = require('path');
var favicon = require('serve-favicon');
var bodyParser = require('body-parser');
var morgan = require('morgan');
var uuid = require('uuid');

//routes
var index = require('./routes/index');
var markerSites = require('./routes/markerSites');
var distributions = require('./routes/distributions');

var app = express();
console.log(uuid.v4());

// view engine setup
app.set('views', path.join(__dirname, 'views'));
app.set('view engine', 'ejs');

// favicon setup 
app.use(favicon(path.join('public', 'favicon.ico')));

app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: false }));
app.use(express.static(path.join(__dirname, 'public')));
app.use(morgan('dev'));//this package logs the requests and errors in the console (needed for dev not intended for production purpose)

// routes
app.use(index);
app.use(markerSites);
app.use(distributions);

module.exports = app;