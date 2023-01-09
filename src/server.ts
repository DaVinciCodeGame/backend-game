import App from './app';

const app = new App();

if (!process.env.PORT) throw new Error('유효하지 않은 환경 변수: PORT');
app.listen(Number(process.env.PORT));
