FROM node:22-slim

RUN apt-get update && apt-get install -y ffmpeg && rm -rf /var/lib/apt/lists/*

WORKDIR /usr/src/app

# Copy dependency files first for better caching
COPY package*.json ./
RUN npm install --production

# Copy the rest of the source code
COPY . .

EXPOSE 4123

# Updated path to the entry point
CMD [ "node", "--max-old-space-size=512", "src/server.js" ]