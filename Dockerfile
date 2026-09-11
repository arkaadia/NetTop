# ==============================================================================
# NetTopology Enterprise - Production Container Image
# Multi-stage Docker build for React Frontend, Node.js SSH Gateway, and Python Engine
# ==============================================================================

FROM node:20-slim AS builder

WORKDIR /app

# Install system build dependencies
RUN apt-get update && apt-get install -y --no-install-recommends \
    python3 \
    make \
    g++ \
    && rm -rf /var/lib/apt/lists/*

# Install node dependencies
COPY package.json package-lock.json* bun.lock* ./
RUN npm install --legacy-peer-deps

# Copy source files
COPY . .

# Compile React frontend and bundle backend server
RUN npm run build

# ==============================================================================
# Runtime Stage
# ==============================================================================
FROM node:20-slim AS runner

WORKDIR /app

ENV NODE_ENV=production
ENV PORT=3000
ENV HOST=0.0.0.0
ENV PYTHON_PORT=5001

# Install runtime Python, OpenSSH client, iputils-ping, and traceroute
RUN apt-get update && apt-get install -y --no-install-recommends \
    python3 \
    python3-pip \
    iputils-ping \
    traceroute \
    curl \
    && rm -rf /var/lib/apt/lists/*

# Copy built production assets and bundled server
COPY --from=builder /app/package.json ./package.json
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/backend ./backend

EXPOSE 3000 5001

# Healthcheck to ensure API and WebSocket gateway are operational
HEALTHCHECK --interval=15s --timeout=5s --start-period=10s --retries=3 \
  CMD curl -f http://127.0.0.1:3000/api/status/bridge || exit 1

# Start the bundled Node.js server (which auto-spawns Python backend & SSH Gateway)
CMD ["node", "dist/server.cjs"]
