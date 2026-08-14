FROM alpine:3.23

RUN apk add --no-cache autossh openssh-client \
    && adduser -D -s /sbin/nologin tunnel \
    && install -d -m 0700 -o tunnel -g tunnel /home/tunnel/.ssh \
    && install -m 0600 -o tunnel -g tunnel /dev/null /home/tunnel/.ssh/known_hosts

COPY --chmod=0555 docker/tunnel/entrypoint.sh /usr/local/bin/router-tunnel

USER tunnel
ENTRYPOINT ["/usr/local/bin/router-tunnel"]
