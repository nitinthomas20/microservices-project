From node
WORKDIR /usr/src/app
COPY package*.json ./
RUN npm install

COPY .env ./
COPY server.js ./
COPY logger.js ./  

EXPOSE 5001
CMD ["node","server.js"]