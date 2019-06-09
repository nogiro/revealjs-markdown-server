import path from "path";
import fs from "fs";

import express, { Request, Response, Express } from "express";

import { ArgsParser } from "./args_parser";
import { HTMLCodeModel } from "./html_code";
import { MDIndexModel } from "./index_model";
import { RevealjsHTMLModel, RevealjsMarkdownModel } from "./reveal_model";

import { view_path, label_key, md_path } from "./utils";

export class RevealRouter {
  private sub_directory: string;
  private resource_directory: string;
  private config_path: string;

  constructor(args: ArgsParser) {
    let sub_directory = "/" + args.sub_directory + "/";
    this.sub_directory = sub_directory.replace(/^\/*/, "/").replace(/\/*$/, "/");
    this.resource_directory = args.resource_directory;
    this.config_path = args.config;
  }

  route(app: Express) : void {
    this.register_revealjs_resources(app);
    this.register_index(app);
    this.register_page(app);
  }

  private register_revealjs_resources(app: Express) : void {
    const revealjs_resources = [
      "css",
      "js",
      "plugin",
      "lib",
    ];
    
    revealjs_resources.forEach(resource => {
      app.use(this.sub_directory + resource, express.static(path.join("node_modules", "reveal.js", resource)));
    });
  }

  private register_index(app: Express) : void {
    const index_js = "index.js";
    app.get(this.sub_directory, (req: Request, res: Response) => {
      MDIndexModel.from(this.resource_directory)
        .then(model => {
          res.render("./index.ejs", {list: model.list, index_js});
        })
        .catch(err => {
          console.error(err);
          res.status(503).send("503: internal server error.");
        });
    });

    app.get(this.sub_directory + index_js, (req: Request, res: Response) => {
      const dir = path.join(__dirname, "..", "dist");
      const index_js_list = fs.readdirSync(dir)
        .filter(a => (a.startsWith("front") && a.endsWith(".js")))
        .map(a => {
          const filename = path.join(dir, a);
          const mtime = fs.statSync(filename).mtime.getTime();
          return { filename, mtime };
        });
      index_js_list.sort((a, b) => b.mtime - a.mtime);
      const index_js_name = index_js_list[0];

      if (typeof index_js_name === "undefined") {
        console.error("js not found");
        const model = HTMLCodeModel.from(404);
        res.status(model.code).send(model.message);
        return;
      }

      res.sendFile(index_js_name.filename);
    });
  }

  private register_page(app: Express) : void {
    app.get(this.sub_directory + md_path, (req: Request, res: Response) => {
      const label = req.query[label_key];
      const referer = req.header('Referer');

      const data = {
        resource_path: this.resource_directory,
        label,
        referer,
      };

      const model = RevealjsMarkdownModel.from(data);
      if (model instanceof HTMLCodeModel) {
        res.status(model.code).send(model.message);
        return;
      }

      res.sendFile(model.md_diskpath);
    });

    app.get(this.sub_directory + view_path, (req: Request, res: Response) => {
      const label = req.query[label_key];

      try {
        const data = {
          config_path: this.config_path,
          resource_path: this.resource_directory,
          label,
          query: req.query,
        };
        const model = RevealjsHTMLModel.from(data);
        if (model instanceof HTMLCodeModel) {
          res.status(model.code).send(model.message);
          return;
        }
        res.render("./md.ejs", model);
      } catch(err) {
        console.error(err);
        res.status(503).send("503: internal server error.");
        return;
      };
    });
  }
}

