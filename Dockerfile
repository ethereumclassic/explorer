FROM node:latest

COPY . /

RUN npm install -g gulp-cli
RUN npm i
RUN gulp build

EXPOSE 3000

ENTRYPOINT ["node"]
