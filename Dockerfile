FROM node:22-bullseye-slim

# Install Python 3, pip, and network diagnostics utilities
RUN apt-get update && apt-get install -y --no-install-recommends \
    python3 \
    python3-pip \
    python3-dev \
    gcc \
    iputils-ping \
    netcat \
    telnet \
    openssh-client \
    curl \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app

# Install Python backend dependencies
RUN pip3 install --no-cache-dir --break-system-packages \
    fastapi \
    uvicorn \
    pydantic \
    cryptography \
    paramiko \
    netmiko

# Copy package manifests and install npm dependencies
COPY package*.json ./
RUN npm install

# Copy application sources
COPY . .

# Build frontend and production assets
RUN npm run build

EXPOSE 3000
EXPOSE 5001

ENV PORT=3000
ENV PYTHON_PORT=5001
ENV BACKEND_PORT=5001
ENV GUACD_HOST=guacd
ENV GUACD_PORT=4822
ENV NODE_ENV=production

CMD ["node", "dist/server.cjs"]
