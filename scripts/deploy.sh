if [[ "$OSTYPE" == "darwin"* ]]; then
	security unlock-keychain
fi
eval $(docker-machine env kuri-bot)
docker-compose build
docker-compose up -d
