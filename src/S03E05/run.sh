docker run \
    --publish=7474:7474 --publish=7687:7687 \
    --volume=$(pwd)/neo4j/data:/data \
    neo4j
