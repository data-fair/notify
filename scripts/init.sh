#!/bin/bash

docker compose exec config01 sh -c "mongo --port 27017 < /scripts/init-configserver.js"
docker compose exec shard01a sh -c "mongo --port 27018 < /scripts/init-shard01.js"
docker compose exec shard02a sh -c "mongo --port 27019 < /scripts/init-shard02.js"
sleep 10
docker compose exec router sh -c "mongo < /scripts/init-router.js"
