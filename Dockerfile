FROM node:latest

COPY . /

RUN npm i
RUN npm run build

EXPOSE 3000

ENTRYPOINT ["node"]
