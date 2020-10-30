FROM node:12

ENV DISABLE_OPENCOLLECTIVE=true
WORKDIR /usr/src/app

COPY package*.json ./

RUN npm install

COPY . .
ADD https://github.com/ufoscout/docker-compose-wait/releases/download/2.2.1/wait /wait
RUN chmod +x /wait

CMD /wait && npm run test:e2e
