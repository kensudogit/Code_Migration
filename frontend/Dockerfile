FROM node:22-alpine AS deps
WORKDIR /app
COPY frontend/package.json frontend/package-lock.json* ./
RUN npm install

FROM node:22-alpine AS build
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY frontend/ .
ENV NEXT_TELEMETRY_DISABLED=1
ARG API_URL=http://api:8090
ENV API_URL=$API_URL
RUN npm run build

FROM node:22-alpine
WORKDIR /app
ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1
COPY --from=build /app/.next ./.next
COPY --from=build /app/node_modules ./node_modules
COPY --from=build /app/package.json ./package.json
COPY --from=build /app/public ./public
EXPOSE 3000
CMD ["npm", "start"]
