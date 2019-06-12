import fs from "fs";
import path from "path";

import {
  md_extname,
  label_key,
  md_path,
} from "./utils";

import { HTMLCodeModel } from "./html_code";

import { RevealParameters, RequiredByRevealjsParameters, generate_parameters } from "./parameters";

interface RevealHTMLParameters extends RevealParameters {
  md_path: string;
}

interface RevealjsHTMLModelParameters extends RequiredByRevealjsParameters {
};

export class RevealjsHTMLModel {
  static from(params: RevealjsHTMLModelParameters): RevealjsHTMLModel | HTMLCodeModel {
    if (typeof params.label === "undefined") {
      return HTMLCodeModel.from(404);
    }

    const md_file: string = path.join(process.cwd(), params.resource_path, params.label + md_extname);
    if (! fs.statSync(md_file).isFile()) {
      return HTMLCodeModel.from(404);
    }

    const parameters = generate_parameters(params);
    return new RevealjsHTMLModel({
      md_path: `${md_path}?${label_key}=${params.label}`,
      ...parameters
    });
  }

  private constructor(private _parameters: RevealHTMLParameters) {}

  get parameters() {return this._parameters}
}

export class RevealjsMarkdownModel {
  static from({label, referer, resource_path}: {label: string, referer?: string, resource_path: string}): RevealjsMarkdownModel | HTMLCodeModel {

    try {
      if (!referer) {throw ""}
      const referer_url = new URL(referer);
      const referer_label = referer_url.searchParams.get(label_key);
      if (referer_label !== label) {throw ""}
    } catch (err) {return HTMLCodeModel.from(503)}

    return new RevealjsMarkdownModel(path.join(process.cwd(), resource_path, label + md_extname));
  }

  private constructor(private _md_diskpath: string) {}
  get md_diskpath() {return this._md_diskpath}
}

