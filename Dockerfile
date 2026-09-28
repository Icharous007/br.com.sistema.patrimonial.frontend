# Multi-stage build: compile the Angular production bundle, then serve it from a minimal nginx image.
FROM --platform=$BUILDPLATFORM node:20-alpine AS build
WORKDIR /workspace
COPY package.json package-lock.json ./
RUN npm ci
COPY . .
RUN npx ng build --configuration production

FROM nginxinc/nginx-unprivileged:1.27-alpine
COPY --from=build /workspace/dist/sistema-patrimonial-frontend/browser/ /usr/share/nginx/html/
COPY deploy/nginx.conf /etc/nginx/nginx.conf
USER nginx
EXPOSE 8080
