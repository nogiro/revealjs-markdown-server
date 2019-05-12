import path from "path";
import fs from "fs";

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

export const md_extname = ".md";
export const html_extname = ".html";

