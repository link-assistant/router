FROM alpine:3.24@sha256:f59abe656b692d901e184be3445e084786602108599d2a51d229c0f5a48c71bf

RUN apk add --no-cache autossh openssh-client \
    && adduser -D -s /sbin/nologin tunnel \
    && install -d -m 0700 -o tunnel -g tunnel /home/tunnel/.ssh \
    && install -m 0600 -o tunnel -g tunnel /dev/null /home/tunnel/.ssh/known_hosts \
    && chgrp 0 /etc/passwd && chmod g+w /etc/passwd

COPY --chmod=0555 docker/tunnel/entrypoint.sh /usr/local/bin/router-tunnel

USER tunnel
ENTRYPOINT ["/usr/local/bin/router-tunnel"]
