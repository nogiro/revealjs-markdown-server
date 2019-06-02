import fs from "fs";
import path from "path";
import readline from "readline";

import yaml from "yaml";

import { recursive_readdir, md_extname, html_extname, yaml_extname } from "./utils";
import { HTMLCodeModel } from "./html_code";

export interface RevealParameters {
  theme: string;
  separator: string;
  "separator-vertical": string;
  options: object;
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
    const md_path: string = params.label + md_extname;
    const md_file: string = path.join(params.resource_path, md_path);
    if (! fs.statSync(md_file).isFile()) {
      return HTMLCodeModel.from(404);
    }

    return new RevealjsHTMLModel({
      md_path,
      ...generate_parameters(params)
    });
  }

  private constructor(private parameters: RevealHTMLParameters) {}

  get md_path() {return this.parameters.md_path}
  get separator() {return this.parameters.separator}
  get ["separator-vertical"]() {return this.parameters["separator-vertical"]}
  get options() {return this.parameters.options}
}

export class RevealjsMarkdownModel {
  static from({label, referer, resource_path}: {label: string, referer?: string, resource_path: string}): RevealjsMarkdownModel | HTMLCodeModel {

    if (typeof referer !== "string") {return HTMLCodeModel.from(503)}

    const delimiter_pos = [referer.indexOf('#'), referer.indexOf('?')]
      .filter(a => a !== -1)
      .reduce((a, b) => Math.min(a, b) , referer.length);
    const referer_label = referer
      .slice(0, delimiter_pos)
      .slice(0, -(html_extname.length))
      .slice(-(label.length));
    if (referer_label !== label) {return HTMLCodeModel.from(503)}

    return new RevealjsMarkdownModel(path.join(process.cwd(), resource_path, label + md_extname));
  }

  private constructor(private _md_diskpath: string) {}
  get md_diskpath() {return this._md_diskpath}
}

function generate_parameters({config_path, resource_path, label, query}: RevealjsHTMLModelParameters): RevealParameters {
  const ret = {...default_parameters};
  const yaml_file: string = path.join(resource_path, label + yaml_extname);

  try {
    load_file_parameters(ret, config_path);
  } catch (err) {
    console.error("global config file error.", err.message);
  }
  try {
    load_file_parameters(ret, yaml_file);
  } catch (err) {
    console.error("local config file error.", err.message);
  }

  load_parameters(ret, query);

  return ret;
}

function load_file_parameters(ret: RevealParameters, config_path: string): void {
  const config_parameters = yaml.parse(fs.readFileSync(config_path, 'utf8'));
  load_parameters(ret, config_parameters);
}

function load_parameters(ret: RevealParameters, params: any): void {
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
}

