import * as Discord from 'discord.js';

let Parser = require('rss-parser');
let parser = new Parser();

function rssToEmbed(rss: any, name: string) {
  // TODO: schema check rss?

  // Fix author field, starts with /u/
  if (typeof rss.author !== 'string' || !rss.author.startsWith('/u/')) {
    throw new Error('Expected Reddit author to start with /u/.');
  }
  rss.author = rss.author.substr(3);

  // Search for thumbnail
  let found = rss.content.match(/\<img.*src=[\'|\"]http(s)?\:\/\/.*thumb.*\.reddit.*\/.*?[\'|\"]/);
  let thumb: string | undefined;
  if (found) {
    thumb = String(found[0]);
    let s = thumb.search(/[\'|\"]/);
    if (s === -1) throw new Error('Expected token not found when searching for Reddit thumbnail.');
    thumb = thumb.substr(s + 1);
    s = thumb.search(/[\'|\"]/);
    if (s === -1) throw new Error('Expected token not found when searching for Reddit thumbnail.');
    thumb = thumb.substr(0, s);
  }

  const embed = new Discord.RichEmbed();
  if (typeof rss.title === 'string') embed.setTitle(rss.title.substr(0, 256));
  if (typeof rss.link === 'string') embed.setURL(rss.link);
  embed.setColor(16727832); // TODO: new reddit color
  if (typeof rss.pubDate === 'string') embed.setTimestamp(new Date(rss.pubDate));
  embed.setFooter(name);
  embed.setAuthor(rss.author, undefined, 'https://www.reddit.com/user/' + rss.author);
  if (thumb) {
    embed.setThumbnail(thumb);
  }
  return embed;
}

export async function getEmbeds(subreddit: string, _since: Date): Promise<Discord.RichEmbed[]> {
  let feed = await parser.parseURL(`https://www.reddit.com/r/${subreddit}/.rss`);
  let embeds: Discord.RichEmbed[] = [];
  feed.items.sort((a: any, b: any) => (new Date(a.pubDate).getTime()) - (new Date(b.pubDate).getTime())); // TODO: make sure pubDate isnt undefined
  for (let item of feed.items) {
    embeds.push(rssToEmbed(item, `r/${subreddit}`));
  }
  return embeds;
}
