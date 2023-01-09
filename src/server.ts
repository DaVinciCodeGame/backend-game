import App from './app';

const app = new App();

if (process.env.PORT) app.listen(Number(process.env.PORT));
else throw new Error('No env: PORT');
