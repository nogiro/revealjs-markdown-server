import fs from "fs";
import path from "path";
import readline from "readline";

import { md_extname, view_path, label_key, thumbnail_path, recursive_readdir, load_head_chunk_from_file } from "./utils";

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

