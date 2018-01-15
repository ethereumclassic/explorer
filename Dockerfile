FROM node:latest

COPY . /

RUN npm i

EXPOSE 3000

ENTRYPOINT ["node"]
