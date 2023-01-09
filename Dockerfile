FROM node:18.13.0-alpine

WORKDIR /usr/src/app

COPY package*.json ./

RUN npm install -g pm2

RUN npm install

COPY . .

EXPOSE $PORT

CMD [ "npm", "start" ]