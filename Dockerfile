# Portable container image — works on Railway, Fly.io, Koyeb, any Docker host.
# (For local "docker run" it boots straight into a seeded demo.)
FROM node:20-bookworm-slim

WORKDIR /app

# Seed demo data on first boot so the app is usable immediately.
ENV AUTO_SEED=true \
    PORT=3000

# Install dependencies first for better layer caching.
COPY package*.json ./
RUN npm install --omit=dev && npm cache clean --force

# App source
COPY . .

EXPOSE 3000
CMD ["node", "server/index.js"]
