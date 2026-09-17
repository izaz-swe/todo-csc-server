FROM nginx:alpine

# Replace default nginx configuration with reverse proxy configuration
COPY nginx.conf /etc/nginx/nginx.conf

EXPOSE 80

CMD ["nginx", "-g", "daemon off;"]
