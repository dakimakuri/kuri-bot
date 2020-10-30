import * as Discord from 'discord.js';
import * as fs from 'fs-extra';
import * as _ from 'lodash';
import { validate } from 'jsonschema';
import { Mutex } from './mutex';

export class Publisher {
  private channels: string[] = [];
  private _lastPublish = new Date();
  private mutex = new Mutex();
  get lastPublish() { return this._lastPublish; }
  constructor(private client: Discord.Client, private name: string) {
  }
  async publish(embeds: Discord.MessageEmbed[]) {
    await this.mutex.lock();
    try {
      // limit the number of embeds to avoid spam
      while (embeds.length > 10) {
        embeds.splice(0, 1);
      }
      embeds = _.filter(embeds, embed => embed.timestamp > this.lastPublish.getTime());
      for (let embed of embeds) {
        for (let channel of this.channels) {
          let find = await this.client.channels.fetch(channel);
          if (find instanceof Discord.TextChannel) {
            await find.send(embed);
          }
        }
        if (embed.timestamp > this.lastPublish.getTime()) {
          this._lastPublish = new Date(embed.timestamp);
        }
      }
    } finally {
      this.mutex.release();
      await this.save();
    }
  }
  async subscribe(newChannel: Discord.TextChannel) {
    await this.mutex.lock();
    try {
      if (this.channels.indexOf(newChannel.id) === -1) {
        this.channels.push(newChannel.id);
      }
    } finally {
      this.mutex.release();
      await this.save();
    }
  }
  async unsubscribe(channel: Discord.TextChannel) {
    await this.mutex.lock();
    try {
      let ind = this.channels.indexOf(channel.id);
      if (ind !== -1) {
        this.channels.splice(ind, 1);
      }
    } finally {
      this.mutex.release();
      await this.save();
    }
  }
  async load() {
    await this.mutex.lock();
    try {
      try {
        let data = await fs.readJson(`data/publishers/${this.name}.json`);
        validate(data, {
          type: 'object',
          properties: {
            channels: {
              type: 'array',
              required: true,
              items: {
                type: 'string'
              }
            },
            lastPublish: {
              type: 'string',
              format: 'date-time',
              required: true
            }
          }
        }, { throwError: true });
        this.channels = data.channels;
        this._lastPublish = new Date(data.lastPublish);
      } catch (err) {
        if (_.get(err, 'code') == 'ENOENT') {
          this.channels = [];
          this._lastPublish = new Date();
        } else {
          throw err;
        }
      }
    } finally {
      this.mutex.release();
    }
  }
  async save() {
    await this.mutex.lock();
    try {
      await fs.writeJson(`data/publishers/${this.name}.json`, {
        channels: this.channels,
        lastPublish: this._lastPublish.toISOString()
      });
    } finally {
      this.mutex.release();
    }
  }
}
