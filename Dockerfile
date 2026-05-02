# Stage 1: build the React frontend
FROM node:20-alpine AS frontend
WORKDIR /frontend
COPY frontend/package*.json ./
RUN npm ci
COPY frontend/ .
# Build outputs to dist/ inside this stage; copied to backend below.
RUN npm run build -- --outDir /frontend/dist

# Stage 2: build the Rust backend
FROM rust:1.82-slim AS backend
RUN apt-get update && apt-get install -y pkg-config && rm -rf /var/lib/apt/lists/*
WORKDIR /app
COPY backend/ .
# Place the frontend build where the binary expects it (ServeDir::new("dist"))
COPY --from=frontend /frontend/dist ./dist/
RUN cargo build --release

# Stage 3: minimal runtime image
FROM debian:bookworm-slim
RUN apt-get update && apt-get install -y ca-certificates && rm -rf /var/lib/apt/lists/*
WORKDIR /app
COPY --from=backend /app/target/release/warehouse-sim ./warehouse-sim
COPY --from=backend /app/dist ./dist/
EXPOSE 3001
ENV RUST_LOG=info
CMD ["./warehouse-sim"]
