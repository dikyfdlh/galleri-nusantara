# ---- Galleri Nusantara: image produksi satu kontainer ----
# Server Express menyajikan API + hasil build React (client/dist).
FROM node:20-alpine

WORKDIR /app

# Manifest dulu (cache layer install)
COPY package*.json ./
COPY server/package*.json ./server/
COPY client/package*.json ./client/

# Install semua dependensi
RUN npm install \
  && npm --prefix server install \
  && npm --prefix client install

# Salin sisa source
COPY . .

# Build frontend (server akan menyajikan client/dist)
RUN npm --prefix client run build

ENV NODE_ENV=production
ENV PORT=4000
# Lokasi data persisten (arahkan ke volume saat deploy)
ENV DATA_DIR=/data
ENV UPLOAD_DIR=/data/uploads

# Direktori data + uploads (mount volume di sini agar tidak hilang saat redeploy)
RUN mkdir -p /data/uploads
VOLUME ["/data"]

EXPOSE 4000

CMD ["node", "server/index.js"]
