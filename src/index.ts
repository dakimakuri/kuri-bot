import * as Discord from 'discord.js';
import * as fs from 'fs-extra';
import * as _ from 'lodash';
import * as env from './env';
import * as reddit from './reddit';
import * as cuddlyOctopus from './cuddlyoctopus';
import { Mutex } from './mutex';
import { currency } from './currency';
import { Publisher } from './publisher';
const cats = require('cat-ascii-faces');

const client = new Discord.Client();
const syrene = new Discord.Client();

const publishers = {
  'r-dakimakuras': new Publisher(client, 'r-dakimakuras'),
  'cuddly-octopus': new Publisher(env.syreneToken ? syrene : client, 'cuddly-octopus')
};

let assignableRoles = [];


async function checkPublisher(name: string, delayMinutes: number, fn: any) {
  while (true) {
    // wait
    await new Promise(resolve => setTimeout(resolve, 1000 * 60 * delayMinutes));

    // publish embeds
    try {
      let publisher = await publishers[name];
      await publisher.publish(await fn(publisher.lastPublish));
    } catch (err) {
      console.error(err);
    }
  }
}

let octoArray = [];
let octoMutex = new Mutex();
const octoTimeout = 20000; // 20 seconds
const octo1Emote = "<:Octo1:733281498697826324>"
const octo2Emote = "<:Octo2:733281510588940288>"
function matchOcto(typeToMatch : number, originalMessage: any) {
  let idOfOriginalMessage = originalMessage.id;
  // No need to check if already matched,
  // as if it were the timeout would be cleared.

  //Remove the message from the array
  octoArray.splice(octoArray.findIndex(inst => inst.id === idOfOriginalMessage), 1);

  //Send message to match the octopus.
  if(typeToMatch == 1) {
    originalMessage.channel.send(octo2Emote);
  } else {
    originalMessage.channel.send(octo1Emote);
  }
}

client.on('ready', async () => {
  for (let key in publishers) {
    let publisher = publishers[key];
    await publisher.load();
  }
  try {
    assignableRoles = await fs.readJson('data/assignableRoles.json');
  } catch (err) {
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
  } else if (content.startsWith('kuri roles')) {
    // manage assignable roles
    let spl = content.split(' ');
    if (spl.length < 3 || !admin) {
      let response = 'Assignable roles: ';
      let first = true;
      for (let assignableRole of assignableRoles) {
        if (assignableRole.guild == msg.guild.id) {
          if (!first) {
            response += ', ';
          }
          let role = msg.guild.roles.get(assignableRole.role);
          response += `${assignableRole.command} (${role.name})`;
          first = false;
        }
      }
      await msg.channel.send(response);
    } else {
      let roles = msg.mentions.roles.array();
      if (roles.length == 1) {
        let command = spl[2];
        let guild = msg.guild.id;
        let role = roles[0];
        if (command[0] != '!') {
          await msg.channel.send('Command must start with !');
        } else {
          if (_.find(assignableRoles, { command, guild } as any)) {
            await msg.channel.send('Command already exists: ' + command);
          } else {
            if (role.hasPermission('ADMINISTRATOR')) {
              await msg.channel.send(`${role.name} cannot be self-assigned.`);
            } else {
              assignableRoles.push({ command, guild, role: role.id });
              await fs.writeJson('data/assignableRoles.json', assignableRoles);
              await msg.channel.send('Command ' + command + ' added to assign role ' + role.name);
            }
          }
        }
      } else {
        let command = spl[2];
        let guild = msg.guild.id;
        if (command[0] != '!') {
          await msg.channel.send('Command must start with !');
        } else {
          if (_.find(assignableRoles, { command, guild } as any)) {
            _.remove(assignableRoles, { command, guild } as any);
            await msg.channel.send('Removing role command ' + command);
            await fs.writeJson('data/assignableRoles.json', assignableRoles);
          } else {
            await msg.channel.send('Command does not exist: ' + command);
          }
        }
      }
    }
  } else if (content.startsWith('kuri subscribe') || content.startsWith('kuri unsubscribe')) {
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
  } else {
    for (let assignableRole of assignableRoles) {
      if (content === assignableRole.command) {
        let role = msg.guild.roles.get(assignableRole.role);
        if (role) {
          let hasRole = msg.member.roles.has(assignableRole.role);
          if (hasRole) {
            await msg.reply(`Removing the role: ${role.name}`);
            msg.member.removeRole(role);
          } else {
            await msg.reply(`Giving you the role: ${role.name}`);
            msg.member.addRole(role);
          }
        } else {
          await msg.reply(`The role for that command is is no longer available.`);
        }
      }
    }
  }
});

syrene.on('ready', async () => {
  console.log(`Logged in as ${syrene.user.tag}!`);
});

syrene.on('message', async (msg: Discord.Message) => {
  if (msg.author.bot) return;
  if (!msg.member) return;
  let content = msg.content.trim();
  if (content === octo1Emote || content === octo2Emote) {
    // Use strict equality since we really only want to consider the message body being strictly the emoji.
    let ty = content===octo1Emote?1:2;
    let otherTy = content===octo1Emote?2:1;

    let thisChannelOctos = octoArray.filter(inst => inst.chan_id === msg.channel.id);
    if(thisChannelOctos.length !== 0 && thisChannelOctos[thisChannelOctos.length - 1].type === otherTy) {
      //This message is here to match an Octo2; just cancel it out
      let toCancel = thisChannelOctos[thisChannelOctos.length - 1];
      octoArray.splice(octoArray.findIndex(inst => inst.id === toCancel.id), 1);
      clearTimeout(toCancel.timeout_id);
    } else {
      let timeout_id = setTimeout(matchOcto, octoTimeout, ty, msg); //Match it later.
      octoArray.push({type: ty, id: msg.id, chan_id: msg.channel.id, timeout_id: timeout_id});
    }
  }
});

(async() => {
  try {
    await fs.ensureDir('data');
    await fs.ensureDir('data/cache');
    await fs.ensureDir('data/publishers');
    if (env.syreneToken) {
      syrene.login(env.syreneToken);
    }
    client.login(env.token);
  } catch (err) {
    console.error(err);
  }
})();
