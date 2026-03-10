# Stage 1: Builder
FROM node:20-alpine AS builder

# Upgrade Alpine OS packages to pull latest security patches
RUN apk update && apk upgrade --no-cache

WORKDIR /app

# Copy package files first to leverage layer caching
COPY package.json package-lock.json* ./
RUN npm install --omit=dev && npm cache clean --force

# Stage 2: Final
FROM node:20-alpine

# Remove npm and yarn completely BEFORE anything else
RUN rm -rf /usr/local/lib/node_modules/npm \
    && rm -rf /opt/yarn* \
    && rm -f /usr/local/bin/npm \
    && rm -f /usr/local/bin/npx \
    && rm -f /usr/local/bin/yarn \
    && rm -f /usr/local/bin/yarnpkg

# Security: Upgrade OS packages
RUN apk update && apk upgrade --no-cache

# Create non-root user with explicit UID/GID for better security
RUN addgroup -g 1001 -S nodeuser && \
    adduser -S nodeuser -u 1001 -G nodeuser

WORKDIR /app

# Copy node_modules from builder
COPY --from=builder /app/node_modules ./node_modules

# Copy app code and Set permissions
COPY --chown=nodeuser:nodeuser . .

USER nodeuser

EXPOSE 3000
CMD ["node", "app.js"]
