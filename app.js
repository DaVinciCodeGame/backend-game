const express = require('express');
const helmet = require('helmet');
const compression = require('compression');
const cookieParser = require('cookie-parser');
const cors = require('cors');
const morgan = require('morgan');

const routes = require('./routes');
const errorHandler = require('./middlewares/error-handler');

const app = express();

app.use(
  cors({
    credentials: true,
    origin: ['https://frontend-delta-puce.vercel.app', 'http://localhost:3000'],
  })
);
app.use(helmet());
app.use(compression());
app.use(cookieParser());
app.use(morgan(process.env.NODE_ENV === 'development' ? 'dev' : 'combined'));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use((req, res, next) => {
  console.log(req.params);
  console.log(req.query);
  console.log(req.body);
  next();
});
app.use(routes);
app.use(errorHandler);

module.exports = app;
