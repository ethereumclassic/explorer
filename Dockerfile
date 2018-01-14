FROM node:alpine


RUN npm i

EXPOSE 3000

ENTRYPOINT ["node app.js"]
