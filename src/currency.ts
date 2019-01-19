// Currency class fetches currency rates from fixer.io and caches the result.
// Data is stored in memory and on disk (at cache/currency.json).
// The cache is invalidated after 12 hours.
// A valid fixer API key is required. The free tier is sufficient.

import * as fs from 'fs-extra';
import * as _ from 'lodash';
import * as request from 'request-promise-native';
import * as env from './env';
import { Mutex } from './mutex';

class Currency {
  private time = new Date(0);
  private rates: any = {};
  private mutex = new Mutex();

  private parse(data: any) {
    if (!data.success) {
      let err = new Error(data.error.info);
      (<any>err).code = data.error.type;
      throw err;
    }
    this.time = new Date(data.time);
    this.rates = data.rates;
  }

  private async fetch(): Promise<any> {
    let data: any = JSON.parse(await request(`http://data.fixer.io/api/latest?access_key=${env.fixerKey}`));
    data.time = new Date();
    return data;
  }

  private async update() {
    // are the rates already valid?
    if (this.valid) {
      return;
    }

    // fetch rates
    await this.mutex.lock();
    try {
      // try to read cache from disk
      try {
        this.parse(await fs.readJson('data/cache/currency.json'));
      } catch (err) {
        if (_.get(err, 'code') != 'ENOENT') {
          throw err;
        }
      }
      if (this.valid) {
        return;
      }

      // fetch from api
      let data = await this.fetch();
      this.parse(data);
      await fs.writeJson('data/cache/currency.json', data);
    } finally {
      this.mutex.release();
    }
  }

  private get valid() {
    // invalidate cached results after 12 hours
    return this.time && (new Date().getTime() - this.time.getTime() < 1000 * 60 * 60 * 12);
  }

  async convert(value: number, from: string, to: string) {
    // converts from currency to another
    await this.update();
    from = from.toUpperCase();
    to = to.toUpperCase();
    let toBase = value / this.rates[from];
    return Math.round((toBase * this.rates[to]) * 100) / 100;
  }

  async exists(code: string) {
    await this.update();
    return !!this.rates[code.toUpperCase()];
  }
}

export const currency = new Currency();
