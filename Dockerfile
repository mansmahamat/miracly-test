FROM node:22-bookworm-slim

RUN apt-get update && apt-get install -y --no-install-recommends \
    chromium \
    ffmpeg \
    fonts-liberation \
    python3 \
    python3-venv \
    python3-pip \
    tini \
    && rm -rf /var/lib/apt/lists/*

RUN python3 -m venv /opt/video-venv \
    && /opt/video-venv/bin/pip install --no-cache-dir kokoro faster-whisper

WORKDIR /app
COPY package*.json ./
RUN npm ci --ignore-scripts
COPY . .

ENV NODE_ENV=production \
    PORT=3000 \
    CHROME_PATH=/usr/bin/chromium \
    HYPERFRAMES_PYTHON=/opt/video-venv/bin/python

ENTRYPOINT ["/usr/bin/tini", "--"]
# Railway starts the same image as either a web server or a render worker.
# Docker Compose may still override this command explicitly.
CMD ["sh", "-c", "if [ \"$SERVICE_ROLE\" = \"worker\" ]; then npm run worker; else npm run dev; fi"]
