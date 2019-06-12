import fs from "fs";
import path from "path";
import readline from "readline";

import { md_extname, view_path, label_key, recursive_readdir, load_head_chunk_from_file } from "./utils";

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

export class MDThumbnailModel {
  static from(params: RequiredByRevealjsParameters): Promise<MDThumbnailModel | HTMLCodeModel> {
    return Promise.resolve()
      .then(() => {
        if (typeof params.label === "undefined") {
          throw "";
        }

        const md_file: string = path.join(process.cwd(), params.resource_path, params.label + md_extname);
        if (! fs.statSync(md_file).isFile()) {
          throw "";
        }

        const parameters = generate_parameters(params);
        const separators = [
          parameters.separator,
          parameters["separator-vertical"],
        ].map(tmp_sep => {
          if (tmp_sep[0] === "^") {return tmp_sep.substr(1)}
          return tmp_sep;
        });

        const thumbnail_regexp = new RegExp("^(.*)(" + separators.join("|") + ")");
        return load_head_chunk_from_file(md_file, thumbnail_regexp);
      })
      .then(chunk_result => {
        const matched = chunk_result.matched;
        const thumbnail_md_data = matched[1];
        if (typeof thumbnail_md_data === "undefined") {return HTMLCodeModel.from(404)}
        return new MDThumbnailModel(thumbnail_md_data);
      })
      .catch(() => {
        return HTMLCodeModel.from(404);
      });
  }

  private constructor(public readonly data: string) {}
}

