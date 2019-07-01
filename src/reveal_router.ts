import path from "path";
import fs from "fs";

import puppeteer from "puppeteer";
import express, { Request, Response, Express } from "express";

import { ArgsParser } from "./args_parser";
import { HTMLCodeModel } from "./html_code";
import { MDIndexModel, PuppeteerHandle, MDThumbnailModelGenerator, MDThumbnailModel } from "./index_model";
import { RevealjsHTMLModel, RevealjsMarkdownModel } from "./reveal_model";

import { js_extname, css_extname, view_path, label_key, md_path, thumbnail_path } from "./utils";

export class RevealRouter {
  private port: number;
  private sub_directory: string;
  private resource_directory: string;
  private config_path: string;
  private index_js_name: string;
  private index_css_name: string;
  private thumbnail_generator: MDThumbnailModelGenerator;

  constructor(browser: puppeteer.Browser, args: ArgsParser) {
    this.port = args.port;
    this.sub_directory = ("/" + args.sub_directory + "/").replace(/^\/*/, "/").replace(/\/*$/, "/");
    this.resource_directory = args.resource_directory;
    this.config_path = args.config;
    const puppeteer_handle: PuppeteerHandle = {
      browser,
      timeout: args.puppeteer_timeout,
      wait_interval: args.puppeteer_wait_interval,
      wait_limit: args.puppeteer_wait_limit,
    };
    this.thumbnail_generator = new MDThumbnailModelGenerator(puppeteer_handle, args.cache_bytes);
    const index_prefix = "index";
    this.index_js_name = index_prefix + js_extname;
    this.index_css_name = index_prefix + css_extname;
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
      app.use(this.sub_directory + resource, express.static(path.join(__dirname, "..", "node_modules", "reveal.js", resource)));
    });
  }

  private register_index(app: Express) : void {
    app.get(this.sub_directory, this.route_get_index.bind(this));
    app.get(this.sub_directory + this.index_js_name, this.route_get_index_subfile.bind(this));
    app.get(this.sub_directory + this.index_css_name, this.route_get_index_subfile.bind(this));
    app.get(this.sub_directory + thumbnail_path, this.route_get_thumbnail.bind(this));
  }

  private register_page(app: Express) : void {
    app.get(this.sub_directory + md_path, this.route_get_md.bind(this));
    app.get(this.sub_directory + view_path, this.route_get_view.bind(this));
  }

  private route_get_index(req: Request, res: Response) : void {
    const index_js = this.sub_directory + this.index_js_name;
    MDIndexModel.from(this.resource_directory, index_js)
      .then(model => {
        res.render("./index.ejs", model);
      })
      .catch(err => {
        console.error(err);
        res.status(503).send("503: internal server error.");
      });
  }

  private route_get_index_subfile(req: Request, res: Response) : void {
    const extname = path.extname(req.path);
    const dir = path.join(__dirname, "..", "dist");
    const index_file_list = fs.readdirSync(dir)
      .filter(a => (a.startsWith("front") && a.endsWith(extname)))
      .map(a => {
        const filename = path.join(dir, a);
        const mtime = fs.statSync(filename).mtime.getTime();
        return { filename, mtime };
      });
    index_file_list.sort((a, b) => b.mtime - a.mtime);
    const index_file_name = index_file_list[0];

    if (typeof index_file_name === "undefined") {
      console.error(`file(${req.path}) not found`);
      const model = HTMLCodeModel.from(404);
      res.status(model.code).send(model.message);
      return;
    }

    res.sendFile(index_file_name.filename);
  }

  private route_get_thumbnail(req: Request, res: Response) : void {
    const label = req.query[label_key];

    const data = {
      config_path: this.config_path,
      resource_path: this.resource_directory,
      port: this.port,
      sub_directory: this.sub_directory,
      label,
      query: {},
    };

    this.thumbnail_generator.generate(data)
      .then(model => {
        if (model instanceof HTMLCodeModel) {
          res.status(model.code).send(model.message);
          return;
        }
        res.send(model.data);
      })
      .catch(err => {
        console.error(err);
        res.status(503).send("503: internal server error.");
      });
  }

  private route_get_md(req: Request, res: Response) : void {
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
  }

  private route_get_view(req: Request, res: Response) : void {
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
      res.set({date: new Date(model.parameters.mtime)});
      res.render("./md.ejs", model);
    } catch(err) {
      console.error(err);
      res.status(503).send("503: internal server error.");
      return;
    };
  }

}

