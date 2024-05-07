# Assumes built assets avaialable in ./dist
# production environment
FROM nginx:alpine

ENV MV_PATH "/usr/share/nginx/html"
ENV PORT 80
RUN rm -rf $MV_PATH && mkdir -p $MV_PATH

COPY dist ${MV_PATH}
COPY nginx.conf /etc/nginx/conf.d/default.conf

WORKDIR /etc/nginx
EXPOSE $PORT
