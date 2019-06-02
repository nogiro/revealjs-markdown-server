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
};

export class RevealjsHTMLModel {
  static from({config_path, resource_path, label}: RevealjsHTMLModelParameters): RevealjsHTMLModel | HTMLCodeModel {
    const md_path: string = label + md_extname;
    const md_file: string = path.join(resource_path, md_path);
    if (! fs.statSync(md_file).isFile()) {
      return HTMLCodeModel.from(404);
    }

    return new RevealjsHTMLModel({
      md_path,
      ...generate_parameters({config_path, resource_path, label})
    });
  }

  private constructor(private parameters: RevealHTMLParameters) {}

  get md_path() {return this.parameters.md_path}
  get separator() {return this.parameters.separator}
  get ["separator-vertical"]() {return this.parameters["separator-vertical"]}
  get options() {return this.parameters.options}
}

function generate_parameters({config_path, resource_path, label}: RevealjsHTMLModelParameters): RevealParameters {
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
  return ret;
}

function load_file_parameters(ret: RevealParameters, config_path: string) {
  const config_parameters = yaml.parse(fs.readFileSync(config_path, 'utf8'));

  if (typeof config_parameters.theme === "string") {
    ret.theme = config_parameters.theme;
  }
  if (typeof config_parameters.separator === "string") {
    ret.separator = config_parameters.separator;
  }
  if (typeof config_parameters["separator-vertical"] === "string") {
    ret["separator-vertical"] = config_parameters["separator-vertical"];
  }
  if (typeof config_parameters.options === "object") {
    ret.options = config_parameters.options;
  }
}

