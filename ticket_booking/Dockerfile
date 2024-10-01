From node:14
WORKDIR /usr/src/app
COPY package*.json ./
RUN npm install

COPY .env ./
COPY server.js ./
EXPOSE 5003
CMD ["node","server.js"]