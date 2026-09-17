FROM node:22-alpine

WORKDIR /app

# Copy dependency definition
COPY package*.json ./

# Install production dependencies
RUN npm ci --omit=dev --silent

# Copy source code
COPY src/ ./src/

# Security: Run as unprivileged non-root node user
USER node

EXPOSE 5000

# Notice: In Docker, PM2 is NOT needed.
# Docker handles container restarts, health status, and lifecycle management directly.
CMD ["node", "src/index.js"]
