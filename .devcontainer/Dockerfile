FROM node:22-alpine

# Install additional tools
RUN apk add --no-cache \
    git \
    bash \
    curl

# Create non-root user
RUN addgroup -g 1000 node && adduser -D -u 1000 -G node node

WORKDIR /workspace

# Set Node environment to development
ENV NODE_ENV=development

USER node
