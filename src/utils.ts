import path from "path";
import fs from "fs";
import readline from "readline";

export const md_extname = ".md";
export const yaml_extname = ".yaml";
export const css_extname = ".css";

export const view_path = "view";
export const label_key = "label";
export const md_path = "md";
export const thumbnail_path = "thumbnail";

export async function recursive_readdir(pathname: string) : Promise<string[]> {
  const ret : string[] = [];

  const f = (current : string) => {
    const files = fs.readdirSync(current, {withFileTypes: true});
    files.forEach((file : fs.Dirent) => {
      const joined = path.join(current, file.name);
      if (file.isFile()) {
        ret.push(joined);
      } else if (file.isDirectory()) {
        f(joined);
      }
    });
  };

  f(pathname);
  return ret;
}

export async function load_head_chunk_from_file(pathname : string, pattern: string | RegExp, num_load: number = 3, max: number = 10): Promise<{chunk: string; matched: RegExpMatchArray;}> {
  const read_interface = readline.createInterface(fs.createReadStream(pathname));

  const loaded: Array<string> = [];

  return new Promise((res, rej) => {
    let finished = false;
    read_interface.on("line", (line : string) => {
      if (finished) {return}
      loaded.push(line);
      if ((loaded.length % num_load) !== 0) {return}

      if (loaded.length > max) {
        read_interface.close();
        rej();
        return;
      }

      const chunk = loaded.join("\n");
      const matched = chunk.match(pattern);

      if (matched === null) {return}
      finished = true;
      read_interface.close();
      res({chunk, matched});
    });
  });
}

export class Cache {
  private contailner: {[key: string]: {data: Buffer, pulled: number}};
  private sum: number;

  constructor(private cache_limit: number) {
    this.contailner = {};
    this.sum = 0;
  }

  push(key: string, data: Buffer): void {
    const hit = this.contailner[key];
    if (hit) {
      this.sum -= hit.data.length;
    }

    this.sum += data.length;
    this.contailner[key] = {data, pulled: Date.now()}

    while (this.sum > this.cache_limit) {
      const deleting_key = Object.keys(this.contailner)
        .reduce((cum, cur) => {
          const cum_obj = this.contailner[cum];
          const cur_obj = this.contailner[cur];
          return cum_obj < cur_obj ? cum : cur;
        });
      this.delete_element(deleting_key);
    }
  }

  pull(key: string): Buffer | undefined {
    const hit = this.contailner[key];
    if (typeof hit === "undefined") {return}
    hit.pulled = Date.now();
    return hit.data;
  }

  trash_if(key: string, new_date: number): void {
    const hit = this.contailner[key];
    if (typeof hit === "undefined") {return}
    if (hit.pulled > new_date) {return}
    this.delete_element(key);
  }

  private delete_element(key: string): void {
    const deleting = this.contailner[key];
    if (typeof deleting === "undefined") {return}
    this.sum -= deleting.data.length;
    delete this.contailner[key];
  }
}

