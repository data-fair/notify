FROM node:16.13.0-alpine3.13
MAINTAINER "contact@koumoul.com"

ENV NODE_ENV production
WORKDIR /webapp

ADD LICENSE .
ADD package.json .
ADD package-lock.json .
RUN npm install --production && node-prune
ADD nodemon.json .

ADD contract contract
ADD config config

# Adding UI files
ADD public public
ADD nuxt.config.js .
RUN npm run build

# Adding server files
ADD server server
ADD upgrade upgrade
ADD README.md VERSION.json* .

ADD README.md .

VOLUME /webapp/security
EXPOSE 8080

# Check the HTTP server is started as health indicator
HEALTHCHECK --start-period=4m --interval=10s --timeout=3s CMD curl -f http://localhost:8080/ || exit 1

CMD ["node", "--max-http-header-size", "64000", "server"]
