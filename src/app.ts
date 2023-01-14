import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import compression from 'compression';
import morgan from './middlewares/morgan';
import apiRouter from './routes';
import errorHandler from './middlewares/errorHandler';
import logger from './config/logger';

class App {
  private readonly app;

  constructor() {
    this.app = express();
    this.app.use(
      cors({
        credentials: true,
        origin: [
          'https://frontend-delta-puce.vercel.app',
          'http://localhost:3000',
        ],
      })
    );
    this.app.use(helmet());
    this.app.use(compression());
    this.app.use(express.json());
    this.app.use(express.urlencoded({ extended: true }));
    this.app.use(morgan());
    this.app.use('/game', apiRouter);
    this.app.use(errorHandler);
  }

  public listen(port: number) {
    this.app.listen(port, () => {
      logger.info(`${port} 포트로 서버가 열렸습니다.`);
    });
  }
}

export default App;
