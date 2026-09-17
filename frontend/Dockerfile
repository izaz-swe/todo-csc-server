FROM nginx:alpine

# Remove default nginx configurations
RUN rm -rf /etc/nginx/conf.d/*

# Copy custom frontend Nginx config
COPY nginx.conf /etc/nginx/conf.d/default.conf

# Copy SPA static assets
COPY src/ /usr/share/nginx/html/

EXPOSE 80

CMD ["nginx", "-g", "daemon off;"]
