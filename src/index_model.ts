import fs from "fs";
import readline from "readline";

import { recursive_readdir, md_extname, view_path, label_key } from "./utils";

const search_max = 10;
const title_regexp = /^#+ /;

function extract_title(pathname : string): Promise<string> {
  const read_interface = readline.createInterface(fs.createReadStream(pathname));

  return new Promise((res, rej) => {
    let count = 0;
    read_interface.on("line", (line : string) => {
      ++count;
      if (line.match(title_regexp)) {
        read_interface.close();
        res(line.replace(title_regexp, ""));
      } else if (line.length !== 0 || count > search_max) {
        read_interface.close();
        rej();
      }
    });
  });
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

