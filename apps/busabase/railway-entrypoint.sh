#!/bin/sh
set -eu

# Railway volumes are mounted after the image is created, so the image-layer
# chown above cannot set their ownership. Prepare the app's data directories as
# root, then run the server as the unprivileged nextjs user.
mkdir -p /data/pgdata /data/storage
chown nextjs:nextjs /data /data/pgdata /data/storage

exec gosu nextjs:nextjs node /app/apps/busabase/server.js
