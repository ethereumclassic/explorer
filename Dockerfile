FROM node:latest

COPY . /tmp

WORKDIR /tmp

RUN npm i

EXPOSE 3000

CMD ["/tmp/node app.js"]
