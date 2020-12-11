# Kuri Bot

[![Build Status](https://drone.kuri.ws/api/badges/dakimakuri/kuri-bot/status.svg)](https://drone.kuri.ws/dakimakuri/kuri-bot)

The Kuri bot for the [Dakimakuras Discord](https://discord.gg/Ybb78PM). This is not a general purpose bot and is made specifically for the Dakimakuras Discord server. Contributions are welcome (although new features are discouraged without approval) and the code is released under the MIT license.

## Getting Started

Install dependencies using npm.

```npm install```

Create a new [Discord developer application](https://discordapp.com/developers/applications/). Convert the application to a bot and copy the access token for the created bot account. Create a new file in the root directory of the project called ```test.env``` containing the bot token:

```TOKEN="AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA"```

Run the program using npm.

```npm start```

Invite the bot to a Discord server using OAuth2. Users in the server with admin priviledges will be able to configure the bot.

### Fixer.io API

To use the currency conversion you must have a fixer.io account (the free tier is sufficient). Provide the access key in the ```test.env``` file. The code is designed to hit this endpoint very infrequently so that the rate limit is not reached.
```FIXER_API="AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA"```

### Syrene Bot

A separate Syrene bot can be used for giving octopus hugs.

```SYRENE_TOKEN="AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA"```

## Features

### Currency conversions (using rates from fixer.io)

Converts currency rates matching the following pattern:

```50 usd to jpy```

Will output something like:

```50 USD = 5488.75 JPY```

### Celcius to fahrenheit and fahrenheit to celcius

Converts celius to fahrenheit and vice versa. The following message:

```100 c to f```

Will output:

```100 C = 212 F```

### RSS publishers

Fetches rss feeds from [r/Dakimakuras](https://www.reddit.com/r/Dakimakuras) publishing any new posts to all subscribed channels.

Subscribe using:

```kuri subscribe <r-dakimakuras>```

A channel can be unsubscribed by using:

```kuri unsubscribe <r-dakimakuras>```

### Nya

Posts cute cat faces when someone ```nya```s.

## Deploying

The bot is meant to be ran inside a Docker container and is deployed with docker-compose. Environment variables should be configured within a ```prod.env``` file (with the same format as ```test.env```).

The following docker compose commands should work to test a production deployment locally:

```
docker-compose up -d --build
```

To remove the deployment from docker:

```
docker-compose down -v
```
