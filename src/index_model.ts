import fs from "fs";
import path from "path";
import readline from "readline";
import http from "http";

import rp from "request-promise";
import puppeteer from "puppeteer";

import { md_extname, view_path, label_key, thumbnail_path, recursive_readdir, load_head_chunk_from_file, Cache } from "./utils";

import { RequiredByRevealjsParameters, generate_parameters } from "./parameters";
import { HTMLCodeModel } from "./html_code";

const title_regexp = /(^|\n)#+ ([^\n]*)/;

async function extract_title(pathname : string): Promise<string> {
  const chunk_result = await load_head_chunk_from_file(pathname, title_regexp);
  const matched = chunk_result.matched;
  const title = matched[2];
  if (typeof title === "undefined") {throw new Error()}
  return title;
}

class MDIndexItem {
  static from(resource_dirname: string, filename: string): Promise<MDIndexItem> {
    const label = filename.slice(resource_dirname.length + 1).slice(0, -(md_extname.length));
    const path = `${view_path}?${label_key}=${label}`;
    return extract_title(filename)
      .then(title => ({ label, path, title: label + ": " + title }))
      .catch(() => ({ label, path, title: label }))
      .then(({ label, path, title }) => new MDIndexItem(label, path, title));
  }

  private constructor(
    public readonly label: string,
    public readonly path: string,
    public readonly title: string,
  ) {}
}

interface MDIndexMeta {
  view_path: string;
  thumbnail_path: string;
}

export class MDIndexModel {
  static from(resource_dirname: string, index_js: string): Promise<MDIndexModel> {
    return recursive_readdir(resource_dirname)
      .then((files: string[]) => {
        const links_promises = files
          .filter((filename: string) => filename.slice(-(md_extname.length)) === md_extname)
          .map((filename: string) => MDIndexItem.from(resource_dirname, filename))
        return Promise.all(links_promises);
      })
      .then((items: MDIndexItem[]) => {
        return new MDIndexModel({view_path, thumbnail_path}, items, index_js);
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

export class MDThumbnailModelGenerator {
  private cache: Cache;

  constructor(private puppeteer_handle: PuppeteerHandle, cache_limit: number) {
    this.cache = new Cache(cache_limit);
  }

  generate(port: number, sub_directory: string, label: string): Promise<MDThumbnailModel | HTMLCodeModel> {
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
      return MDThumbnailModel.from(this.puppeteer_handle, html_url)
        .then(model => {
          if (model instanceof MDThumbnailModel) {
            this.cache.push(html_url, model.data);
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
        await page.close();

        return new MDThumbnailModel(image);
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

