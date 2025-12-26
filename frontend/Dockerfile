# Build stage
FROM node:20-alpine AS build
WORKDIR /app

# Copy package files first to cache dependencies
COPY package*.json ./

# Tối ưu hóa mạng cho Docker (Fix lỗi timeout)
ENV NODE_OPTIONS="--dns-result-order=ipv4first"
RUN npm config set fetch-retry-mintimeout 20000
RUN npm config set fetch-retry-maxtimeout 120000
RUN npm cache clean --force

RUN npm install

# Copy source code
COPY . .

# Use production environment variables
# The .env.production file should be copied/renamed to .env before building
# or use build args to pass env vars
RUN if [ -f .env.production ]; then cp .env.production .env; fi

# Build Vite app
RUN npm run build

# Production stage
FROM nginx:alpine
# Copy built assets
COPY --from=build /app/dist /usr/share/nginx/html
# Copy custom nginx config
COPY nginx.conf /etc/nginx/conf.d/default.conf

EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]
