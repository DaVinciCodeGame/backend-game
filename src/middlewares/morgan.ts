import morgan from 'morgan';
import env from '../config/env';
import logger from '../config/logger';

const stream: morgan.StreamOptions = {
  write(message) {
    logger.http(message);
  },
};
const skip = () => env.NODE_ENV !== 'development';

export default () =>
  morgan(env.NODE_ENV === 'production' ? 'combined' : 'dev', { stream, skip });
