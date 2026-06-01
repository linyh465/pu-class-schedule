FROM nginx:alpine

# Copy static files to nginx web root
COPY . /usr/share/nginx/html

# Copy nginx config template (not to templates/ to avoid auto-envsubst of $uri)
COPY nginx.conf /etc/nginx/nginx.conf.template

EXPOSE 80

# Only substitute $PORT, leaving nginx variables like $uri untouched
CMD ["/bin/sh", "-c", "envsubst '${PORT}' < /etc/nginx/nginx.conf.template > /etc/nginx/conf.d/default.conf && nginx -g 'daemon off;'"]
