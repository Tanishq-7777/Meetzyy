
FROM node:20

RUN apt-get update && apt-get install -y ffmpeg

WORKDIR /app

COPY package*.json ./

RUN npm install --production

COPY . .

EXPOSE 7777

CMD ["node", "app.js"]