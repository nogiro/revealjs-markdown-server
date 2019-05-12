import path from "path";
import fs from "fs";

import express, { Request, Response, Express } from "express";

import { ArgsParser } from "./args_parser";
import { MDIndexModel } from "./index_model";

import { md_extname, html_extname } from "./utils";

export class RevealRouter {
  private sub_directory: string;
  private resource_directory: string;

  constructor(args: ArgsParser) {
    let sub_directory = "/" + args.sub_directory + "/";
    this.sub_directory = sub_directory.replace(/^\/*/, "/").replace(/\/*$/, "/");
    this.resource_directory = args.resource_directory;
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
    app.get(this.sub_directory, (req: Request, res: Response) => {
      MDIndexModel.from(this.resource_directory)
        .then(model => {
          res.render("./index.ejs", {list: model.list});
        })
        .catch(err => {
          console.error(err);
          res.status(503).send("503: internal server error.");
        });
    });
  }

  private register_page(app: Express) : void {
    app.get(this.sub_directory + ":label" + md_extname, (req: Request, res: Response) => {
      const label = req.params.label;
      const referer = req.header('Referer');
      const is_valid_referer = typeof referer === "string"
        && referer.slice(0, -(html_extname.length)).slice(-(label.length)) === label;
      if (! is_valid_referer) {res.status(503).send("503: internal server error."); return}

      const md_path = req.params.label + md_extname;
      const md_diskpath = path.join(this.resource_directory, md_path);

      res.sendFile(path.join(process.cwd(), md_diskpath));
    });

    app.get(this.sub_directory + ":label" + html_extname, (req: Request, res: Response) => {
      const md_path = req.params.label + md_extname;
      const md_diskpath = path.join(this.resource_directory, md_path);

      try {
        if (! fs.statSync(md_diskpath).isFile()) {throw Error("target is not regular file")}
      } catch (err) {
        console.error(err);
        res.status(404).send("404: not found.");
        return;
      }

      try {
        res.render("./md.ejs", { md_path });
      } catch (err) {
        console.error(err);
        res.status(503).send("503: internal server error.");
        return;
      }
    });
  }
}

