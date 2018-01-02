const express = require('express');
const app = express();
const expressLayouts = require('express-ejs-layouts');
const bodyParser = require('body-parser');
const session = require('express-session');
const expressErrorHandler = require('express-error-handler');
const router = require('./routes/index');

app.set('views');
app.set('view engine', 'ejs');

app.set('layout', 'layout');
app.set("layout extractScripts", true);
app.use(expressLayouts);

app.use(bodyParser.urlencoded({ extended: false }));
app.use(bodyParser.json());
app.use(session({
  secret: 'sdshd7f8SDfhs98cvneuv1PK394MN',
  resave: true,
  saveUninitialized: true
}));
app.use(router);

var errorHandler = expressErrorHandler({
  static: {
    '404': './views/404.ejs'
  }
});

app.use(expressErrorHandler.httpError(404));
app.use(errorHandler);

// server open
app.listen(process.env.PORT, process.env.IP, () => {
  console.log('Server On');
});