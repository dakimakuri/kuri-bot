import * as Discord from 'discord.js';
import * as fs from 'fs-extra';
import * as _ from 'lodash';
import { validate } from 'jsonschema';
import { Mutex } from './mutex';

export class Publisher {
  private channels: Discord.TextChannel[] = [];
  private _lastPublish = new Date();
  private mutex = new Mutex();
  get lastPublish() { return this._lastPublish; }
  constructor(private client: Discord.Client, private name: string) {
  }
  async publish(embeds: Discord.RichEmbed[]) {
    // limit the number of embeds to avoid spam
    await this.mutex.lock();
    try {
      while (embeds.length > 5) {
        embeds.splice(0, 1);
      }
      embeds = _.filter(embeds, embed => embed.timestamp > this.lastPublish);
      for (let embed of embeds) {
        for (let channel of this.channels) {
          await channel.send(embed);
        }
        if (embed.timestamp > this.lastPublish) {
          this._lastPublish = embed.timestamp;
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
      for (let channel of this.channels) {
        if (channel.id == newChannel.id) {
          return;
        }
      }
      this.channels.push(newChannel);
    } finally {
      this.mutex.release();
      await this.save();
    }
  }
  async unsubscribe(newChannel: Discord.TextChannel) {
    await this.mutex.lock();
    try {
      for (let i = 0; i < this.channels.length; ++i) {
        this.channels.splice(i, 1);
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
        this.channels = [];
        for (let channel of data.channels) {
          let find = this.client.channels.get(channel);
          if (find instanceof Discord.TextChannel) {
            this.channels.push(find);
          }
        }
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
        channels: _.map(this.channels, channel => channel.id),
        lastPublish: this._lastPublish.toISOString()
      });
    } finally {
      this.mutex.release();
    }
  }
}
