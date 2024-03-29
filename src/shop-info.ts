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
  status: 'legitimate' | 'scalper' | 'questionable' | 'bootlegger' | 'unknown';
  links: {
    url: string;
    match?: true;
  }[];
  reseller?: {
    links: {
      url: string;
      match?: true;
    }[];
  };
  url: string;
  note?: string;
}

export async function findShopInfo(message: string, opts: { ignoreMatches?: boolean } = {}): Promise<ShopInfo[]> {
  let { ignoreMatches = false } = opts;
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
    const query = url.indexOf('?');
    if (query != -1) {
      url = url.substr(0, query);
    }
    return url;
  };
  for (let part of split) {
    try {
      if (part.startsWith('<') && part.endsWith('>')) {
        part = part.substr(1, part.length - 2);
      }
      const url = new URL(part);
      if (!url.hostname || (url.protocol !== 'https:' && url.protocol !== 'http:')) {
        continue;
      }
      let found = false;
      let note: string;
      const check = async () => {
        const response = await request(`https://bootleg.gx.ag/api/v1/check/${encodeURIComponent(part)}`);
        const obj = JSON.parse(response);
        if (obj.shop && obj.link) {
          found = true;
          obj.shop.url = stripUrl(obj.link.url);
          if (obj.notes) {
            obj.shop.note = obj.notes.join(' ');
          }
          shops.push(obj.shop);
        } else if (obj.notes) {
          note = obj.notes.join(' ');
        }
      };
      if (ignoreMatches) {
        await check();
      } else {
        for (const match of matches) {
          if (url.host === match || url.host.endsWith(`.${match}`)) {
            await check();
            break;
          }
        }
      }
      if (!found) {
        shops.push({
          name: 'Unknown',
          status: 'unknown',
          url: stripUrl(part),
          links: [],
          note,
        });
      }
    } catch {
    }
  }
  return shops;
}