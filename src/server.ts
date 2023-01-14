import App from './app';
import env from './config/env';

const app = new App();
app.listen(Number(env.PORT));
