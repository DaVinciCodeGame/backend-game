import { createLogger, transports, format } from 'winston';
import env from './env';

const logger = createLogger({
  level: env.NODE_ENV === 'development' ? 'debug' : 'info',
  format: format.json(),
  transports: new transports.Console(),
});

export default logger;
