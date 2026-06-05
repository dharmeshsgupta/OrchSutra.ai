# ─────────────────────────────────────────────────────────────
#  FRONTEND ── React + Vite → Nginx
#
#  LESSON: Multi-Stage Build
#  This Dockerfile has TWO stages:
#
#  Stage 1 (builder): Uses Node.js to compile React → static files
#  Stage 2 (runner):  Uses Nginx (tiny web server) to serve those files
#
#  Why two stages?
#  → The Node.js image is ~1GB. After building, we don't need Node anymore.
#  → We copy only the built files into a tiny Nginx image (~25MB).
#  → Final image is ~10x smaller! This is called a "multi-stage build".
# ─────────────────────────────────────────────────────────────

# ════════════════════════════════
#  STAGE 1: Build (Node.js)
# ════════════════════════════════
FROM node:20-alpine AS builder
#                      ↑
#  "alpine" = ultra-minimal Linux variant (even smaller!)
#  "AS builder" = we name this stage "builder" so Stage 2 can reference it

WORKDIR /app

# Copy package files first for cache efficiency
# (if you only change src code, npm install won't re-run)
COPY package.json package-lock.json ./

# Install all npm dependencies
RUN npm ci
#   ↑ "npm ci" is like "npm install" but:
#     - Reads package-lock.json exactly (reproducible builds)
#     - Faster in CI/Docker environments
#     - Fails if package-lock.json is out of sync

# Copy the rest of the source code
COPY . .

# LESSON: ARG vs ENV in Docker
# ARG  = available only during BUILD time (image creation)
# ENV  = available at RUN time (when container is running)
#
# Vite reads VITE_* variables at BUILD time and bakes them
# into your JavaScript bundle. So we use ARG here, not ENV.
# The values come from docker-compose "build.args" section.
ARG VITE_API_URL
ARG VITE_FIREBASE_API_KEY
ARG VITE_FIREBASE_AUTH_DOMAIN
ARG VITE_FIREBASE_PROJECT_ID
ARG VITE_FIREBASE_STORAGE_BUCKET
ARG VITE_FIREBASE_MESSAGING_SENDER_ID
ARG VITE_FIREBASE_APP_ID
ARG VITE_FIREBASE_MEASUREMENT_ID

# Make ARGs available as ENV so Vite's process.env can read them
ENV VITE_API_URL=$VITE_API_URL
ENV VITE_FIREBASE_API_KEY=$VITE_FIREBASE_API_KEY
ENV VITE_FIREBASE_AUTH_DOMAIN=$VITE_FIREBASE_AUTH_DOMAIN
ENV VITE_FIREBASE_PROJECT_ID=$VITE_FIREBASE_PROJECT_ID
ENV VITE_FIREBASE_STORAGE_BUCKET=$VITE_FIREBASE_STORAGE_BUCKET
ENV VITE_FIREBASE_MESSAGING_SENDER_ID=$VITE_FIREBASE_MESSAGING_SENDER_ID
ENV VITE_FIREBASE_APP_ID=$VITE_FIREBASE_APP_ID
ENV VITE_FIREBASE_MEASUREMENT_ID=$VITE_FIREBASE_MEASUREMENT_ID

# Build the production React app
# This compiles TypeScript + bundles JS/CSS → outputs to /app/dist/
RUN npm run build

# ════════════════════════════════
#  STAGE 2: Serve (Nginx)
# ════════════════════════════════
FROM nginx:alpine AS runner
#         ↑
#  Nginx is a high-performance web server.
#  Perfect for serving static React files.

# Copy our custom Nginx config (see nginx.conf file we create separately)
COPY nginx.conf /etc/nginx/conf.d/default.conf

# Copy ONLY the built files from Stage 1 into the Nginx image
# "builder" refers to the name we gave Stage 1 above
COPY --from=builder /app/dist /usr/share/nginx/html
#                                ↑
#         This is where Nginx looks for files to serve

EXPOSE 80

# Nginx starts automatically — no CMD needed
# But we write it explicitly for clarity:
CMD ["nginx", "-g", "daemon off;"]
#                      ↑
#  "daemon off" tells Nginx to run in the foreground.
#  Docker requires your main process to stay in the foreground.
#  If it goes to background (daemon mode), Docker thinks it crashed!
