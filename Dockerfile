# Build stage
FROM node:20-alpine AS builder

WORKDIR /app

# Copy package files
COPY package.json package-lock.json* yarn.lock* ./

# Install dependencies
RUN npm ci --only=production && npm ci || npm install

# Copy app source
COPY . .

# Build Next.js
RUN npm run build

# Runtime stage
FROM node:20-alpine

WORKDIR /app

# Copy package files
COPY package.json package-lock.json* yarn.lock* ./

# Install only production dependencies
RUN npm ci --only=production || npm install --production

# Copy built application from builder
COPY --from=builder /app/.next ./.next
COPY --from=builder /app/node_modules ./node_modules

# Create public directory (may be empty or not exist in builder)
RUN mkdir -p ./public

# Environment variables
# Note: Sensitive values should be set via ECS task definition, not here
ENV NODE_ENV=production
ENV PORT=80

# Expose port
EXPOSE 80

# Health check
# ECS uses this to determine container health
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
  CMD node -e "require('http').get('http://localhost:80', (r) => {if (r.statusCode !== 200) throw new Error(r.statusCode)})"

# Start Next.js server
# Logs go to stdout/stderr and are captured by ECS awslogs driver
# Next.js handles signal forwarding for graceful shutdown
CMD ["npm", "start"]
