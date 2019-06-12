import fs from "fs";
import path from "path";

import css from "css";
import yaml from "yaml";

import {
  yaml_extname,
  css_extname,
} from "./utils";

export interface RevealParameters {
  theme: string;
  separator: string;
  "separator-vertical": string;
  options: object;
  "custom-css"?: string;
}

const default_parameters: RevealParameters = {
  "theme": "black",
  "separator": "^\\n\\n\\n",
  "separator-vertical": "^\\n\\n",
  options: {},
};

export interface RequiredByRevealjsParameters {
  config_path: string;
  resource_path: string;
  label: string;
  query: object;
};

export function generate_parameters({config_path, resource_path, label, query}: RequiredByRevealjsParameters): RevealParameters {
  let ret = {...default_parameters};
  const yaml_file: string = path.join(process.cwd(), resource_path, label + yaml_extname);

  try {
    ret = load_file_parameters(label, ret, config_path);
  } catch (err) {
    console.error(`${label}: global config file error.`, err.message);
  }
  try {
    ret = load_file_parameters(label, ret, yaml_file);
  } catch (err) {
    console.error(`${label}: local config file error.`, err.message);
  }

  return load_parameters(label, ret, query);
}

function load_file_parameters(label: string, ret: RevealParameters, config_path: string): RevealParameters {
  const config_parameters = yaml.parse(fs.readFileSync(config_path, 'utf8'));
  return load_parameters(label, ret, config_parameters);
}

const module_revealjs_path = path.join(__dirname, "..", "node_modules", "reveal.js");
const module_revealjs_css_theme_path = path.join(module_revealjs_path, "css", "theme");

function load_parameters(label: string, default_values: RevealParameters, params: any): RevealParameters {
  let ret = {...default_values};
  if (typeof params.theme === "string") {
    const theme_css_path = path.join(module_revealjs_css_theme_path, params.theme + css_extname);
    try {
      if (fs.statSync(theme_css_path).isFile()) {
        ret.theme = params.theme;
      }
    } catch (err) {
      console.error(`${label}: theme file stat error.`, err.message);
    }
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
      console.error(`${label}: css error.`, err.message);
    }
  }

  return ret;
}
