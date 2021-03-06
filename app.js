const createError = require('http-errors');
const express = require('express');
const env = require('dotenv').config();
const path = require('path');
const cookieParser = require('cookie-parser');
const logger = require('morgan');
const mysql = require("mysql");
const compression = require('compression')
const app = express();
const minifyHTML = require('express-minify-html');
const bcrypt = require('bcrypt');
const saltRounds = 10;
const combine = JSON.stringify([process.env.USER_NAME, process.env.USER_PASS]);

/* connect to mysql basic */
const db = mysql.createConnection({
    host: process.env.DB_HOST,
    port: process.env.DB_PORT,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME
})
db.connect((err) => {
    if (err) throw err;
    console.log("Database was connected ....");
});
global.db = db;

// validate
function validate(hash) {
    return new Promise((resolve, reject) => {
        bcrypt.compare(combine, hash, (err, hash) => {
            resolve(hash);
        })
    })
}

app.use(function(req, res, next) {
    //res.header("Access-Control-Allow-Origin", "*");
    //res.header('Access-Control-Allow-Methods', 'GET, POST, OPTIONS, PUT, PATCH, DELETE');
    //res.header("Access-Control-Allow-Headers", "Origin, X-Requested-With, Content-Type, Accept");
    //res.header('Access-Control-Allow-Credentials', true);
    res.removeHeader("X-Powered-By");
    ////res.set('Cache-Control', 'public, max-age=31557600, s-maxage=31557600');
    next();
});
// minify
app.use(minifyHTML({
    override: true,
    exception_url: false,
    htmlMinifier: {
        removeComments: true,
        collapseWhitespace: true,
        collapseBooleanAttributes: true,
        removeAttributeQuotes: false,
        removeEmptyAttributes: true,
        minifyJS: true
    }
}));
// compress
app.use(compression())
// view engine setup
app.set('views', path.join(__dirname, 'resources/views'));
app.use(require('express-edge'));

if (process.env.DEBUG == 'true') {
    app.use(logger('dev'));
}

app.use(express.json());
app.use(express.urlencoded({
    extended: false
}));
app.use(cookieParser("M&*h[L#?|}_{p-)Q(nZs&^~|0N>"));
app.use(express.static(path.join(__dirname, 'public')));

/* ============ routing =========*/
// this for api set
app.use('/api', require('./routes/api'));
// auth
app.use('/login', require('./routes/login'));
// midleware
app.use(async (req, res, next) => {
    let stat = await validate(req.signedCookies.auth);
    if (req.signedCookies && stat) {
        return next();
    }
    return res.redirect('/login');
})

//app.use('/users', usersRouter);
app.use('/', require('./routes/start'));
app.use('/schedule', require('./routes/schedule'));
app.use('/create', require('./routes/create'));
app.use('/delete', require('./routes/delete'));
app.use('/edit', require('./routes/edit'));
app.use('/view/', require('./routes/view'));

/* ============ end routing ==================*/
// catch 404 and forward to error handler
app.use(function(req, res, next) {
    next(createError(404));
});
// error handler
app.use(function(err, req, res, next) {
    // set locals, only providing error in development
    res.locals.message = err.message;
    res.locals.error = req.app.get('env') === 'development' ? err : {};
    // render the error page
    res.status(err.status || 500);
    res.render('error');
});
console.log("Sever Running on = " + process.env.HOST + ":" + process.env.PORT);
require('./schedule')
module.exports = app;
