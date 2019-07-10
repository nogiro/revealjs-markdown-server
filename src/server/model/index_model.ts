import fs from "fs";
import path from "path";
import readline from "readline";
import http from "http";

import rp from "request-promise";
import puppeteer from "puppeteer";

import {
  md_extname,
  thumbnail_extname,
  view_path,
  label_key,
  thumbnail_path,
  recursive_readdir,
  recursive_mkdir,
  load_head_chunk_from_file,
  Cache,
  Times,
} from "./../utils";

import {
  RequiredByRevealjsParameters,
  generate_parameters,
} from "./../parameters";
import { HTMLCodeModel } from "./html_code";

const title_regexp = /(^|\n)#+ ([^\n]*)/;

async function extract_title(pathname : string): Promise<string> {
  const chunk_result = await load_head_chunk_from_file(pathname, title_regexp);
  const matched = chunk_result.matched;
  const title = matched[2];
  if (typeof title === "undefined") {throw new Error()}
  return title;
}

interface MDIndexModelParameters {
  config_path: string;
  resource_path: string;
  index_js: string;
}

interface MDIndexItemParameters extends RequiredByRevealjsParameters {
  filename: string;
}

class MDIndexItem {

  static from(index_parameters: MDIndexModelParameters, filename: string): Promise<MDIndexItem> {
    const label = filename.slice(index_parameters.resource_path.length + 1).slice(0, -(md_extname.length));
    const path = `${view_path}?${label_key}=${label}`;

    const parameters = generate_parameters({
      ...index_parameters,
      label, query: {},
    });
    const times = parameters.times;

    return extract_title(filename)
      .catch(() => label)
      .then((title) => new MDIndexItem( label, path, title, times ));
  }

  private constructor(
    public readonly label: string,
    public readonly path: string,
    public readonly title: string,
    public readonly times: Times,
  ) {}
}

interface MDIndexMeta {
  view_path: string;
  thumbnail_path: string;
}

export class MDIndexModel {
  static from(parameters: MDIndexModelParameters): Promise<MDIndexModel> {
    return recursive_readdir(parameters.resource_path)
      .then((files: string[]) => {
        const links_promises = files
          .filter((filename: string) => path.extname(filename) === md_extname)
          .map((filename: string) => MDIndexItem.from(parameters, filename))
        return Promise.all(links_promises);
      })
      .then((items: MDIndexItem[]) => {
        return new MDIndexModel({view_path, thumbnail_path}, items, parameters.index_js);
      });
  }

  private constructor(
    public readonly meta: MDIndexMeta,
    public readonly slides: MDIndexItem[],
    public readonly index_js: string,
  ) {}
}

function isResponse(data: any): data is http.IncomingMessage {
  return data instanceof http.IncomingMessage;
}

export interface PuppeteerHandle {
  browser: puppeteer.Browser;
  timeout: number;
  wait_interval: number;
  wait_limit: number;
}

interface MDThumbnailModelParameters extends RequiredByRevealjsParameters {
  port: number;
  sub_directory: string;
}

export class MDThumbnailModelGenerator {
  private cache: Cache;

  constructor(private puppeteer_handle: PuppeteerHandle, private thumbnail_root: string, cache_limit: number) {
    this.cache = new Cache(cache_limit);
  }

  generate({port, sub_directory, config_path, resource_path, label, query}: MDThumbnailModelParameters): Promise<MDThumbnailModel | HTMLCodeModel> {
    const html_url = `http://localhost:${port}${sub_directory}${view_path}?${label_key}=${label}`;

    return rp({
      method: 'HEAD',
      uri: html_url,
      resolveWithFullResponse: true,
    }).then(response => {
      if (! isResponse(response)) {throw ""}
      const header_date = response.headers["date"];
      if (typeof header_date === "undefined") {throw ""}
      this.cache.trash_if(html_url, (new Date(header_date)).getTime());
      const pulled = this.cache.pull(html_url);
      if (typeof pulled !== "undefined") {
        return MDThumbnailModel.from_buffer(pulled);
      }

      const parameters = generate_parameters({config_path, resource_path, label, query: {}});

      const thumbnail_file = path.join(this.thumbnail_root, label + thumbnail_extname);
      try {
        const thumbnail_mtime = fs.statSync(thumbnail_file).mtime.getTime();
        if (thumbnail_mtime > parameters.times.mtime) {
          const thumbnail_data = fs.readFileSync(thumbnail_file);
          this.cache.push(html_url, thumbnail_data);
          return MDThumbnailModel.from_buffer(thumbnail_data);
        }
      } catch (err) {}

      return MDThumbnailModel.from(this.puppeteer_handle, html_url)
        .then(model => {
          if (model instanceof MDThumbnailModel) {
            const thumbnail_data = model.data;
            this.cache.push(html_url, model.data);
            recursive_mkdir(path.dirname(thumbnail_file));
            fs.writeFileSync(thumbnail_file, thumbnail_data);
          }
          return model;
        });
    }).catch(() => {
      return HTMLCodeModel.from(503)
    });
  }
}

export class MDThumbnailModel {
  static from(puppeteer_handle: PuppeteerHandle, html_url: string): Promise<MDThumbnailModel | HTMLCodeModel> {
    return Promise.resolve()
      .then(() => {
        return puppeteer_handle.browser.newPage();
      })
      .then(async (page) => {
        try {
          const timeout = puppeteer_handle.timeout;
          const wait_interval = puppeteer_handle.wait_interval;
          const wait_limit = puppeteer_handle.wait_limit;

          await page.goto(html_url, {timeout, waitUntil: "networkidle0"});
          let prev_image = Buffer.from([]);
          let image = await page.screenshot({ encoding: 'binary' });
          let wait_count = 0;
          while (image.compare(prev_image) !== 0 && wait_count < wait_limit) {
            prev_image = image;
            await page.waitFor(wait_interval);
            ++wait_count;
            image = await page.screenshot({ encoding: 'binary' });
          }
          try {
            await page.close();
          } catch (err) {}
          return new MDThumbnailModel(image);
        } catch (err) {
          await page.close();
          throw "";
        }
      })
      .catch(() => {
        return HTMLCodeModel.from(404);
      });
  }

  static from_buffer(data: Buffer) {
    return new MDThumbnailModel(data);
  }

  private constructor(public readonly data: Buffer) {}
}

