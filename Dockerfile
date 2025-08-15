# Dockerfile
FROM node:20-bookworm

# 1) Dépendances de build + OpenCV natif (4.6.x sur Debian bookworm)
RUN apt-get update && apt-get install -y \
    build-essential python3 pkg-config libopencv-dev \
 && rm -rf /var/lib/apt/lists/*

# 2) Variables de build pour FORCER l’usage de l’OpenCV système
ENV OPENCV4NODEJS_DISABLE_AUTOBUILD=1
ENV PKG_CONFIG_PATH=/usr/lib/x86_64-linux-gnu/pkgconfig

WORKDIR /app
COPY package.json package-lock.json* ./

# 3) Installe les deps Node
#    - garde le fork et la version fixée dans package.json:
#      "opencv4nodejs": "npm:@u4/opencv4nodejs@7.1.2"
RUN npm ci --foreground-scripts --unsafe-perm

# Sanity check (facultatif mais utile en CI)
RUN node -e "const cv=require('opencv4nodejs'); console.log('OpenCV', cv.version)"

# 4) Copie le reste et build si besoin
COPY . .
# RUN npm run build

EXPOSE 3001 8080
CMD npm run server & npm run dev

