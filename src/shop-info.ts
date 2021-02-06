import { URL } from 'url';
import * as request from 'request-promise-native';
import { Mutex } from './mutex';

let mutex = new Mutex();
let matches: string[];
export async function getMatches(): Promise<string[]> {
  if (matches) {
    return matches;
  } else {
    try {
      await mutex.lock();
      const response = await request(`https://bootleg.gx.ag/match.json`);
      matches = JSON.parse(response).matches;
      return matches;
    } finally {
      mutex.release();
    }
  }
}

export class ShopInfo {
  name: string;
  links: {
    url: string;
    match?: true;
  }[];
  flags: ({
    type: 'unknown';
  } | {
    type: 'bootlegger';
  } | {
    type: 'reseller';
    links: {
      url: string;
      match?: true;
    }[];
  })[];
  url: string;
}

export async function findShopInfo(message: string): Promise<ShopInfo[]> {
  let matches: string[];
  try {
    matches = await getMatches();
  } catch (err) {
    console.error(err);
    return [];
  }
  const split = message.split(/\s/);
  const shops: ShopInfo[] = [];
  const stripUrl = (url: string) => {
    if (url.startsWith('https://')) {
      url = url.substr('https://' . length);
    } else if (url.startsWith('http://')) {
      url = url.substr('http://' . length);
    }
    if (url.endsWith('/')) {
      url = url.substr(0, url.length - 1);
    }
    return url;
  };
  for (let part of split) {
    try {
      if (part.startsWith('<') && part.endsWith('>')) {
        part = part.substr(1, part.length - 2);
      }
      const url = new URL(part);
      let found = false;
      for (const match of matches) {
        if (url.host === match || url.host.endsWith(`.${match}`)) {
          const response = await request(`https://bootleg.gx.ag?url=${encodeURIComponent(part)}`);
          const obj = JSON.parse(response);
          if (obj.shop && obj.link) {
            found = true;
            obj.shop.url = stripUrl(obj.link.url);
            shops.push(obj.shop);
          }
          break;
        }
      }
      if (!found) {
        shops.push({
          name: 'Unknown',
          url: stripUrl(part),
          links: [],
          flags: [
            { type: 'unknown' }
          ],
        });
      }
    } catch {
    }
  }
  return shops;
}