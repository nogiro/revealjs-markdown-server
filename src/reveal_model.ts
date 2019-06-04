import fs from "fs";
import path from "path";
import readline from "readline";

import yaml from "yaml";
import css from "css";

import { recursive_readdir, md_extname, yaml_extname, label_key, md_path } from "./utils";
import { HTMLCodeModel } from "./html_code";

export interface RevealParameters {
  theme: string;
  separator: string;
  "separator-vertical": string;
  options: object;
  "custom-css"?: string;
}

interface RevealHTMLParameters extends RevealParameters {
  md_path: string;
}

const default_parameters: RevealParameters = {
  "theme": "black",
  "separator": "^\\n\\n\\n",
  "separator-vertical": "^\\n\\n",
  options: {},
};

interface RevealjsHTMLModelParameters {
  config_path: string;
  resource_path: string;
  label: string;
  query: object;
};

export class RevealjsHTMLModel {
  static from(params: RevealjsHTMLModelParameters): RevealjsHTMLModel | HTMLCodeModel {
    if (typeof params.label === "undefined") {
      return HTMLCodeModel.from(404);
    }

    const md_file: string = path.join(params.resource_path, params.label + md_extname);
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

function generate_parameters({config_path, resource_path, label, query}: RevealjsHTMLModelParameters): RevealParameters {
  let ret = {...default_parameters};
  const yaml_file: string = path.join(resource_path, label + yaml_extname);

  try {
    ret = load_file_parameters(ret, config_path);
  } catch (err) {
    console.error("global config file error.", err.message);
  }
  try {
    ret = load_file_parameters(ret, yaml_file);
  } catch (err) {
    console.error("local config file error.", err.message);
  }

  return load_parameters(ret, query);
}

function load_file_parameters(ret: RevealParameters, config_path: string): RevealParameters {
  const config_parameters = yaml.parse(fs.readFileSync(config_path, 'utf8'));
  return load_parameters(ret, config_parameters);
}

function load_parameters(default_values: RevealParameters, params: any): RevealParameters {
  let ret = {...default_values};
  if (typeof params.theme === "string") {
    ret.theme = params.theme;
  }
  if (typeof params.separator === "string") {
    ret.separator = params.separator;
  }
  if (typeof params["separator-vertical"] === "string") {
    ret["separator-vertical"] = params["separator-vertical"];
  }
  if (typeof params.options === "object") {
    ret.options = params.options;
  }
  if (typeof params["custom-css"] === "string") {
    try {
      ret["custom-css"] = css.stringify(css.parse(params["custom-css"]));
    } catch (err) {
      console.error("css error.", err.message);
    }
  }

  return ret;
}

