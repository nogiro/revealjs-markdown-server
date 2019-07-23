import fs from "fs";
import path from "path";

import { img_path } from "./../utils";
import { HTMLCodeModel } from "./html_code";

export class GetImgModel {
  static from(data: {resource_path: string, id?: string}): GetImgModel | HTMLCodeModel{
    if (typeof data.id === "undefined") {
      return HTMLCodeModel.from(400);
    }
    const img = path.join(data.resource_path, "..", img_path, data.id);
    if (! fs.existsSync(img)) {
      return HTMLCodeModel.from(404);
    }
    return new GetImgModel(img);
  }

  private constructor(public readonly path: string) {}
}


