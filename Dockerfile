# Stage 1: build the React frontend
FROM node:20-alpine AS frontend
WORKDIR /app
COPY frontend/package*.json ./
RUN npm ci
COPY frontend/ .
# Call tsc and vite explicitly so --outDir is unambiguous
# (npm run build uses tsc -b && vite build; appending args to a compound command
# is unreliable, so we call each binary directly)
RUN npx tsc -b && npx vite build --outDir /app/dist

# Stage 2: compile the Rust backend (musl via rust:alpine → static-ish binary)
FROM rust:alpine AS builder
RUN apk add --no-cache musl-dev
WORKDIR /app
COPY backend/ .
RUN cargo build --release

# Stage 3: minimal runtime image
FROM alpine:3.19
RUN apk add --no-cache ca-certificates
WORKDIR /app
COPY --from=builder /app/target/release/warehouse-sim ./
# Copy frontend build directly from stage 1 (no intermediate copy via builder)
COPY --from=frontend /app/dist ./dist/
EXPOSE 3001
ENV RUST_LOG=info
CMD ["./warehouse-sim"]
