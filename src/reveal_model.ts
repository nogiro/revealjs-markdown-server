import fs from "fs";
import path from "path";
import readline from "readline";

import { recursive_readdir, md_extname, html_extname } from "./utils";
import { HTMLCodeModel } from "./html_code";

export interface RevealParameters {
  theme: string;
  separator: string;
  "separator-vertical": string;
  options: object;
};

interface RevealHTMLParameters extends RevealParameters {
  md_path: string;
}

const default_parameters: RevealParameters = {
  "theme": "black",
  "separator": "^\\n\\n\\n",
  "separator-vertical": "^\\n\\n",
  options: {},
};

export class RevealjsHTMLModel {
  static from(resource_path: string, label: string): RevealjsHTMLModel | HTMLCodeModel {
    const md_path: string = label + md_extname;
    const md_file: string = path.join(resource_path, md_path);
    if (! fs.statSync(md_file).isFile()) {
      return HTMLCodeModel.from(404);
    }

    return new RevealjsHTMLModel({
      md_path,
      ...default_parameters
    });
  }

  private constructor(private parameters: RevealHTMLParameters) {}

  get md_path() {return this.parameters.md_path}
  get separator() {return this.parameters.separator}
  get ["separator-vertical"]() {return this.parameters["separator-vertical"]}
  get options() {return this.parameters.options}
}

