import * as Discord from 'discord.js';
import * as request from 'request-promise-native';
import * as cheerio from 'cheerio';
let Parser = require('rss-parser');
let parser = new Parser();
let TurndownService = require('turndown');
var td = new TurndownService()

async function getImage(item: any): Promise<string | undefined> {
  let page = await request(item.link);
  let $ = cheerio.load(page);
  return $('.kl-blog-single-head-wrapper').find('img').attr('src');
}

function trimDescription(desc: string, link: string) {
  let origLength = desc.length;
  let list = desc.indexOf('\n*');
  if (list !== -1) {
    desc = desc.substr(0, list).trim();
  }
  while (desc.length > 1500) {
    let newline = desc.lastIndexOf('\n');
    if (newline !== -1) {
      desc = desc.substr(0, newline - 1);
    } else {
      desc = desc.substr(0, 50);
      break;
    }
  }
  if (desc.length !== origLength) {
    desc += `\n\n[Read More](${link})`;
  }
  return desc;
}

export async function getEmbeds(since: Date): Promise<Discord.MessageEmbed[]> {
  let embeds: Discord.MessageEmbed[] = [];
  let feed = await parser.parseURL('https://cuddlyoctopus.com/feed/');
  feed.items.sort((a: any, b: any) => (new Date(a.pubDate).getTime()) - (new Date(b.pubDate).getTime())); // TODO: make sure pubDate isnt undefined
  for (let item of feed.items) {
    let date = new Date(item.pubDate);
    if (date <= since) {
      continue;
    }
    if (item.categories.indexOf('Product Updates') !== -1) {
      let embed = new Discord.MessageEmbed();
      embed.setTitle(item.title.substr(0, 256));
      let desc = trimDescription(td.turndown(item['content:encoded']), item.link);
      embed.setDescription(desc);
      embed.setURL(item.link);
      embed.setColor(11845375);
      embed.setTimestamp(new Date(item.pubDate));
      let image = await getImage(item);
      if (image) {
        embed.setImage(image);
      }
      embeds.push(embed);
    }
  }
  return embeds;
}
