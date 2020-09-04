FROM node:8

COPY . /

RUN npm i

EXPOSE 3000

ENTRYPOINT ["node"]
