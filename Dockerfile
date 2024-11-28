######################################
# Stage: nodejs dependencies and build
FROM node:20.18.1-alpine3.20 AS builder

WORKDIR /webapp
COPY patches patches
ADD package.json .
ADD package-lock.json .
# use clean-modules on the same line as npm ci to be lighter in the cache
RUN npm ci && \
    ./node_modules/.bin/clean-modules --yes --exclude mocha/lib/test.js --exclude ramda/src/test.js --exclude "**/*.mustache"

# Adding UI files
ADD public public
ADD nuxt.config.js .
ADD config config
ADD contract contract

# Adding server files
ADD server server
ADD scripts scripts
ADD upgrade upgrade

# Build UI
ENV NODE_ENV production
RUN npm run build && rm -rf dist

# Cleanup /webapp/node_modules so it can be copied by next stage
RUN npm prune --production && rm -rf node_modules/.cache

##################################
# Stage: main nodejs service stage
FROM node:20.10.0-alpine3.18
MAINTAINER "contact@koumoul.com"

RUN apk add --no-cache dumb-init

WORKDIR /webapp

# We could copy /webapp whole, but this is better for layering / efficient cache use
COPY --from=builder /webapp/node_modules /webapp/node_modules
COPY --from=builder /webapp/package.json /webapp/package.json
COPY --from=builder /webapp/nuxt-dist /webapp/nuxt-dist
ADD nuxt.config.js nuxt.config.js
ADD server server
ADD scripts scripts
ADD upgrade upgrade
ADD config config
ADD contract contract
ADD public/static public/static

# Adding licence, manifests, etc.
ADD README.md BUILD.json* ./
ADD LICENSE .
ADD nodemon.json .

# configure node webapp environment
ENV NODE_ENV production
ENV DEBUG db,upgrade*
# the following line would be a good practice
# unfortunately it is a problem to activate now that the service was already deployed
# with volumes belonging to root
#USER node
VOLUME /webapp/security
EXPOSE 8080

RUN chmod -R 777 ./nuxt-dist 

CMD ["dumb-init", "node", "--max-http-header-size", "64000", "server"]

