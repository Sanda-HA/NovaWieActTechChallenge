FROM node:22-alpine AS build
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci
COPY . .
RUN npm run build

FROM node:22-alpine
WORKDIR /app
ENV NODE_ENV=production \
    EDNOVA_BACKEND_HOST=backend \
    EDNOVA_BACKEND_PORT=9999
COPY package.json package-lock.json ./
COPY --from=build /app/node_modules ./node_modules
COPY --from=build /app/dist ./dist
COPY vite.config.ts lingui.config.ts tsconfig*.json ./
COPY server ./server
EXPOSE 4175
CMD ["npx", "vite", "preview", "--host", "0.0.0.0", "--port", "4175"]
