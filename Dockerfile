FROM node:8
WORKDIR /usr/src/app
COPY package*.json ./
RUN npm install
COPY . .
RUN npm run tsc
CMD [ "node", "bin/index.js" ]
