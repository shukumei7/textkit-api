FROM node:20-alpine

# better-sqlite3 requires native compilation tools
RUN apk add --no-cache python3 make g++

WORKDIR /app

# Install dependencies (production only)
COPY package*.json ./
RUN npm ci --omit=dev

# Copy application source
COPY src/ ./src/
COPY public/ ./public/
COPY swagger.json ./

# Data directory for SQLite persistence (volume mount target)
RUN mkdir -p /app/data

ENV NODE_ENV=production
ENV TEXTKIT_PORT=3100
ENV DB_PATH=/app/data

EXPOSE 3100

CMD ["node", "src/index.js"]
