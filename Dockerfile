FROM node:20-alpine
WORKDIR /app
COPY backend/package*.json backend/
RUN cd backend && npm ci --omit=dev
COPY backend backend
COPY frontend frontend
ENV NODE_ENV=production PORT=3000
EXPOSE 3000
WORKDIR /app/backend
CMD ["node", "server.js"]
