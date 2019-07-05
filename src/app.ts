import puppeteer from "puppeteer";
import express, { Request, Response, Express } from "express";

import package_json from "./../package.json";

import { ArgsParser } from "./server/args_parser";
import { RevealRouter } from "./server/reveal_router";

const parser = new ArgsParser(process.argv);

puppeteer
  .launch({ args: ['--no-sandbox']})
  .then(browser => {
    const reveal_router = new RevealRouter(browser, parser);

    const app = express();
    app.set("view engine", "ejs");
    reveal_router.route(app);

    app.listen(parser.port, () => {
      console.log(`${package_json.name} listening on port ${parser.port}!`);
    });
  });

