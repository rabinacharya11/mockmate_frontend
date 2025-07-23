#!/bin/bash

# Test script for the MockMate FastAPI backend
# This script tests the connection to the FastAPI backend using curl
# Run with: chmod +x scripts/test-api.sh && ./scripts/test-api.sh

# Define colors for output
GREEN='\033[0;32m'
RED='\033[0;31m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

API_URL=${API_URL:-"http://localhost:8000"}

echo -e "${BLUE}Testing FastAPI backend at ${API_URL}${NC}\n"

# Test root endpoint
echo -e "${BLUE}=== Testing root endpoint ===${NC}"
curl -s -o /dev/null -w "Status: %{http_code}\n" ${API_URL}/ || echo -e "${RED}Failed to connect${NC}"
echo ""

# Test generate-questions endpoint
echo -e "${BLUE}=== Testing generate-questions endpoint ===${NC}"
curl -s -X POST ${API_URL}/generate-questions \
  -H "Content-Type: application/json" \
  -d '{"cv_data":"{\\"name\\":\\"John Doe\\"}","skills":["JavaScript","React"],"question_count":2}' | jq . || echo -e "${RED}Failed: Do you have jq installed? Try 'brew install jq'${NC}"
echo ""

# Test verbal-feedback endpoint
echo -e "${BLUE}=== Testing verbal-feedback endpoint ===${NC}"
curl -s -X POST ${API_URL}/verbal-feedback \
  -H "Content-Type: application/json" \
  -d '[{"questionText":"Tell me about your experience","voiceConvertedToText":"I have worked on several projects."}]' | jq . || echo -e "${RED}Failed: Do you have jq installed? Try 'brew install jq'${NC}"
echo ""

echo -e "${GREEN}Tests completed.${NC}"
