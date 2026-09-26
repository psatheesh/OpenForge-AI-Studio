FROM node:22-alpine
WORKDIR /app
COPY package.json server.js ./
COPY public ./public
ENV HOST=0.0.0.0 PORT=4343 OPENFORGE_DATA=/data
VOLUME ["/data"]
EXPOSE 4343
USER node
CMD ["node","server.js"]
