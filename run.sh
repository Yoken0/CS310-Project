#!/bin/bash

# Docker run script for CS310 Project

set -e

IMAGE_NAME="cs310-project"
CONTAINER_NAME="cs310-project-container"
PORT=${PORT:-8000}

# Colors for output
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

echo -e "${GREEN}Building Docker image...${NC}"
docker build -t ${IMAGE_NAME} .

# Stop and remove existing container if it exists
if [ "$(docker ps -aq -f name=${CONTAINER_NAME})" ]; then
    echo -e "${YELLOW}Stopping existing container...${NC}"
    docker stop ${CONTAINER_NAME} > /dev/null 2>&1 || true
    docker rm ${CONTAINER_NAME} > /dev/null 2>&1 || true
fi

echo -e "${GREEN}Starting container on port ${PORT}...${NC}"
docker run -d \
    --name ${CONTAINER_NAME} \
    -p ${PORT}:8000 \
    ${IMAGE_NAME}

echo -e "${GREEN}Container started successfully!${NC}"
echo -e "Access the application at: ${YELLOW}http://localhost:${PORT}${NC}"
echo -e "View logs with: ${YELLOW}docker logs -f ${CONTAINER_NAME}${NC}"
echo -e "Stop container with: ${YELLOW}docker stop ${CONTAINER_NAME}${NC}"

