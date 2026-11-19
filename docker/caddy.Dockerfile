# Frontend + Caddy em dois estágios — nenhum Node.js é necessário no host
# nem no servidor de produção: o site é buildado aqui dentro e embutido.
#
# Build: docker build -f docker/caddy.Dockerfile .   (contexto = raiz do repo)

# Estágio 1: build do frontend (Vite + React)
FROM node:22-alpine AS web
WORKDIR /web
COPY web/package.json web/package-lock.json ./
RUN npm ci
COPY web/ ./
RUN npm run build

# Estágio 2: Caddy servindo o estático (Caddyfile segue montado via compose)
FROM caddy:2
COPY --from=web /web/dist /srv
