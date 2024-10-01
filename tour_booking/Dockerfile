From node
WORKDIR /usr/src/app
COPY package*.json ./
RUN npm install

COPY .env ./
COPY server.js ./
EXPOSE 5002
CMD ["node","server.js"]