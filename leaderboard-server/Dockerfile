FROM node:20-alpine

WORKDIR /app

COPY package.json ./
RUN npm install --omit=dev

COPY server.js ./

ENV PORT=3000
ENV DATA_DIR=/app/data

# Mount a persistent volume at /app/data in Coolify so leaderboard.json
# survives redeploys and container restarts.
VOLUME ["/app/data"]

EXPOSE 3000

CMD ["node", "server.js"]
