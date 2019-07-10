import path from "path";
import fs from "fs";

import puppeteer from "puppeteer";
import express, { Request, Response, Express } from "express";

import { ArgsParser } from "./args_parser";
import { HTMLCodeModel } from "./model/html_code";
import {
  MDIndexModel,
  PuppeteerHandle,
  MDThumbnailModelGenerator,
  MDThumbnailModel
} from "./model/index_model";
import { RevealjsHTMLModel, RevealjsMarkdownModel } from "./model/reveal_model";
import { GetImgModel } from "./model/img_model";

import { js_extname, css_extname, view_path, label_key, md_path, thumbnail_path, img_path } from "./utils";

export class RevealRouter {
  private port: number;
  private sub_directory: string;
  private resource_path: string;
  private config_path: string;
  private index_js_name: string;
  private index_css_name: string;
  private thumbnail_generator: MDThumbnailModelGenerator;

  constructor(browser: puppeteer.Browser, args: ArgsParser) {
    this.port = args.port;
    this.sub_directory = ("/" + args.sub_directory + "/").replace(/^\/*/, "/").replace(/\/*$/, "/");
    this.resource_path = path.join(args.resource_directory, md_path);
    this.config_path = args.config;
    const puppeteer_handle: PuppeteerHandle = {
      browser,
      timeout: args.puppeteer_timeout,
      wait_interval: args.puppeteer_wait_interval,
      wait_limit: args.puppeteer_wait_limit,
    };
    const thumbnail_root = path.join(args.resource_directory, thumbnail_path);
    this.thumbnail_generator = new MDThumbnailModelGenerator(puppeteer_handle, thumbnail_root, args.cache_bytes);
    const index_prefix = "index";
    this.index_js_name = index_prefix + js_extname;
    this.index_css_name = index_prefix + css_extname;
  }

  route(app: Express) : void {
    this.register_revealjs_resources(app);
    this.register_index(app);
    this.register_page(app);
  }

  private get_members() {
    return {
      port: this.port,
      sub_directory: this.sub_directory,
      resource_path: this.resource_path,
      config_path: this.config_path,
      index_js_name: this.index_js_name,
      index_css_name: this.index_css_name,
    };
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
    app.get(this.sub_directory + img_path + "/:id", this.route_get_img.bind(this));
  }

  private route_get_index(req: Request, res: Response) : void {
    const index_js = this.sub_directory + this.index_js_name;
    const data = Object.assign(
      this.get_members(),
      {index_js},
    );

    MDIndexModel.from(data)
      .then(model => {
        res.render("./index.ejs", model);
      })
      .catch(err => {
        console.error(err);
        res.status(503).send("503: internal server error.");
      });
  }

  private route_get_index_subfile(req: Request, res: Response) : void {
    const basename = path.basename(req.path);
    const dir = path.join(__dirname, "..", "dist");
    const index_file_list = fs.readdirSync(dir)
      .filter(a => a === basename)
      .map(a => path.join(dir, a));

    const index_file_name = index_file_list[0];
    if (typeof index_file_name === "undefined") {
      console.error(`file(${req.path}) not found`);
      const model = HTMLCodeModel.from(404);
      res.status(model.code).send(model.message);
      return;
    }

    res.sendFile(index_file_name);
  }

  private route_get_thumbnail(req: Request, res: Response) : void {
    const label = req.query[label_key];

    const data = Object.assign(
      this.get_members(),
      { label, query: {} },
    );

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
      resource_path: this.resource_path,
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
        resource_path: this.resource_path,
        label,
        query: req.query,
      };
      const model = RevealjsHTMLModel.from(data);
      if (model instanceof HTMLCodeModel) {
        res.status(model.code).send(model.message);
        return;
      }
      res.set({date: new Date(model.parameters.times.mtime)});
      res.render("./md.ejs", model);
    } catch(err) {
      console.error(err);
      res.status(503).send("503: internal server error.");
      return;
    };
  }

  private route_get_img(req: Request, res: Response) : void {
    const id: string | undefined = req.params.id;

    try {
      const data = {
        resource_path: this.resource_path,
        id,
      };
      const model = GetImgModel.from(data);
      if (model instanceof HTMLCodeModel) {
        res.status(model.code).send(model.message);
        return;
      }
      res.sendFile(model.path);
    } catch(err) {
      console.error(err);
      res.status(503).send("503: internal server error.");
      return;
    };
  }

}

