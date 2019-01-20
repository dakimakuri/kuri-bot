import * as Discord from 'discord.js';
import * as fs from 'fs-extra';
import * as _ from 'lodash';
import * as env from './env';
import * as reddit from './reddit';
import * as cuddlyOctopus from './cuddlyoctopus';
import { Mutex } from './mutex';
import { currency } from './currency';
import { Publisher } from './publisher';
const cats = require('cat-ascii-faces')

const client = new Discord.Client();

const publishers = {
  'r-dakimakuras': new Publisher(client, 'r-dakimakuras'),
  'cuddly-octopus': new Publisher(client, 'cuddly-octopus')
};

async function checkPublisher(name: string, delayMinutes: number, fn: any) {
  while (true) {
    // wait
    await new Promise(resolve => setTimeout(resolve, 1000 * 60 * delayMinutes));

    // publish embeds
    let publisher = await publishers[name];
    await publisher.publish(await fn(publisher.lastPublish));
  }
}

client.on('ready', async () => {
  for (let key in publishers) {
    let publisher = publishers[key];
    await publisher.load();
  }
  console.log(`Logged in as ${client.user.tag}!`);

  // start publisher checks
  checkPublisher('r-dakimakuras', 15, reddit.getEmbeds.bind(reddit, 'dakimakuras')); // check r/dakimakuras every 15 minutes
  checkPublisher('cuddly-octopus', 60 * 12, cuddlyOctopus.getEmbeds); // check cuddly octopus every 12 hours
});

client.on('message', async (msg: Discord.Message) => {
  if (msg.author.bot) return;
  if (!msg.member) return;
  let admin = msg.member.permissions.has('ADMINISTRATOR');
  let content = msg.content.trim();
  if (content.match(/^[-]?[\d|,]{0,12}(\.\d{1,2})?\s*\w{3}\s+to\s+\w{3}$/i)) {
    // currency conversion (5 usd to jpy)
    try {
      content = content.replace(/,/g, '');
      let value = parseFloat(content);
      if (isNaN(value)) return;
      let instruction = content.substr(String(value).length).trim();
      let from = instruction.substr(0, 3).toUpperCase();
      let to = instruction.substr(instruction.length - 3, 3).toUpperCase();
      if (!await currency.exists(from)) return;
      if (!await currency.exists(to)) return;
      let result = await currency.convert(value, from, to);
      msg.channel.send(`${value} ${from} = ${result} ${to}`);
    } catch (err) {
      if (_.get(err, 'code') == 'missing_access_key') {
        msg.channel.send('A fixer API token has not been configured so conversion rates could not be obtained.');
      } else {
        msg.reply('Something went wrong.');
      }
    }
  } else if (content.match(/^[-]?\d{0,3}(\.\d{1,2})?\s*c\s+to\s+f$/i)) {
    // celcius conversion (5 c to f)
    let value = parseFloat(content);
    let result = (value * 9 / 5) + 32;
    result = Math.round(result * 100) / 100;
    msg.channel.send(`${value} C = ${result} F`);
  } else if (content.match(/^[-]?\d{0,3}(\.\d{1,2})?\s*f\s+to\s+c$/i)) {
    // celcius conversion (5 f to c)
    let value = parseFloat(content);
    let result = (value - 32) * 5 / 9;
    result = Math.round(result * 100) / 100;
    msg.channel.send(`${value} F = ${result} C`);
  } else if (content.replace(/[^a-z]/gi, '').toLowerCase().match(/^n+y+a+h*$/)) {
    // respond to nya with cat face
    msg.channel.send(cats());
  } else {
    for (let key in publishers) {
      let publisher = publishers[key];
      if (content == `kuri subscribe ${key}`) {
        if (admin && msg.channel instanceof Discord.TextChannel) {
          await publisher.subscribe(msg.channel);
          await msg.channel.send(`Subscribed to ${key}.`);
        }
      } else if (content == `kuri unsubscribe ${key}`) {
        if (admin && msg.channel instanceof Discord.TextChannel) {
          await publisher.unsubscribe(msg.channel);
          await msg.channel.send(`Unsubscribed from ${key}.`);
        }
      }
    }
  }
});

(async() => {
  try {
    await fs.ensureDir('data');
    await fs.ensureDir('data/cache');
    await fs.ensureDir('data/publishers');
    client.login(env.token);
  } catch (err) {
    console.error(err);
  }
})();
