FROM node:20-alpine

WORKDIR /app

COPY package.json ./
RUN npm install --omit=dev

COPY src ./src

# API keys are passed at runtime, not baked into the image:
# docker run -it --env-file .env self-consistency-cli
ENTRYPOINT ["node", "src/index.js"]
