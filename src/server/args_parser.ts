import path from "path";

import commander from "commander";
import bytes from "bytes";

import package_json from "./../../package.json";

export class ArgsParser {
  public readonly sub_directory: string;
  public readonly resource_directory: string;
  public readonly port: number;
  public readonly config: string;
  public readonly cache_bytes: number;
  public readonly puppeteer_timeout: number;
  public readonly puppeteer_wait_interval: number;
  public readonly puppeteer_wait_limit: number;

  constructor(argv : string[]) {
    const parser = commander
      .version(package_json.version)
      .option("-s, --sub-directory <sub-directory>", "change sub directory", "/")
      .option("-d, --resource <resource>", "change resource directory", "resource")
      .option("-p, --port <port>", "change port", 3000)
      .option("-f, --config <config>", "config file", "config.yaml")
      .option("-b, --cache-bytes <cache-bytes>", "change cache limit [bytes]", "100MB")
      .option("--puppeteer_timeout <puppeteer-timeout>", "change puppeteer access timeout [msec]", 15000)
      .option("--puppeteer_wait_interval <puppeteer-wait-interval>", "change puppeteer index transition detection interval [msec]", 100)
      .option("--puppeteer_wait_limit <puppeteer-wait-limit>", "change puppeteer index transition detection limit", 10)
      .parse(argv);

    this.sub_directory = parser.subDirectory;
    if (path.isAbsolute(parser.resource)) {
      this.resource_directory = parser.resource;
    } else {
      this.resource_directory = path.join(process.cwd(), parser.resource);
    }
    this.port = parser.port;
    this.config = parser.config;

    this.puppeteer_timeout = parser.puppeteerTimeout;
    this.puppeteer_wait_interval = parser.puppeteerWaitInterval;
    this.puppeteer_wait_limit = parser.puppeteerWaitLimit;

    const tmp_bytes = bytes(parser.cacheBytes);
    if (typeof tmp_bytes === "string") {
      this.cache_bytes = 1024 * 1024 * 1024;
    } else {
      this.cache_bytes = tmp_bytes;
    }
  }

}

