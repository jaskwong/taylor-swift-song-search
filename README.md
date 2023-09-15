# taylor-swift-song-search

## Running Locally

1. Create `.env` file
```
ELASTIC_PASSWORD=<elastic password>

KIBANA_PASSWORD=<kibana password>

STACK_VERSION=8.9.1

CLUSTER_NAME=es-cluster

LICENSE=basic

ES_PORT=9200

KIBANA_PORT=5601

ES_MEM_LIMIT=1073741824
KB_MEM_LIMIT=1073741824

ENCRYPTION_KEY=<encryption_key>
```
2. Create docker resources with `docker compose up`
3. Copy elastic cert file to local destination with `docker cp <container_id>:/usr/share/elasticsearch/config/certs/ca/ca.crt /tmp/.`