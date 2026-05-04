# Stage 1: build React client
FROM node:22-alpine AS client-build
WORKDIR /client
COPY client/package*.json ./
RUN npm install
COPY client/ .
RUN npm run build

# Stage 2: production server
FROM node:22-alpine
RUN addgroup -S skyjo && adduser -S skyjo -G skyjo
WORKDIR /app
COPY package*.json ./
RUN npm install --omit=dev
COPY server.js .
COPY --from=client-build /client/dist ./public
RUN mkdir -p /app/data && chown -R skyjo:skyjo /app
USER skyjo
EXPOSE 3000
CMD ["node", "server.js"]
