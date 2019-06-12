import fs from "fs";
import readline from "readline";

import { md_extname, view_path, label_key, recursive_readdir, load_head_chunk_from_file } from "./utils";

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
      .then(title => ({ path, title: label + ": " + title }))
      .catch(() => ({ path, title: label }))
      .then(({ path, title }) => new MDIndexItem(path, title));
  }

  private constructor(private _path: string, private _title: string) {}

  get path() {return this._path}
  get title() {return this._title}
}

export class MDIndexModel {
  static from(resource_dirname: string): Promise<MDIndexModel> {
    return recursive_readdir(resource_dirname)
      .then((files: string[]) => {
        const links_promises = files
          .filter((filename: string) => filename.slice(-(md_extname.length)) === md_extname)
          .map((filename: string) => MDIndexItem.from(resource_dirname, filename))
        return Promise.all(links_promises);
      })
      .then((items: MDIndexItem[]) => {
        return new MDIndexModel(items);
      });
  }

  private constructor(private _list: MDIndexItem[]) {}

  get list() {return this._list}
}

