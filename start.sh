#!/bin/sh

# Find And Replace Keys
# find /usr/share/nginx/html -type f -name "*.js" -exec sed -i "s|localhost:4005|${BASE_URL}|g" {} +

# Pause 3 seconds
sleep 3

# Run NGINX server
echo "Run Nginx in daemon mode"
nginx -g "daemon off;"
