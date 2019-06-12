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


