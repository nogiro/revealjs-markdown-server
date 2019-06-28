import commander from "commander";
import bytes from "bytes";

import package_json from "./../package.json";

export class ArgsParser {
  parser : commander.Command;

  constructor(argv : string[]) {
    this.parser = commander
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
  }

  get sub_directory(): string {return this.parser.subDirectory}
  get resource_directory(): string {return this.parser.resource}
  get port(): number {return this.parser.port}
  get config(): string {return this.parser.config}
  get cache_bytes(): number {
    const tmp_bytes = bytes(this.parser.cacheBytes);
    if (typeof tmp_bytes === "string") {return 1024 * 1024 * 1024}
    return tmp_bytes;
  }
  get puppeteer_timeout(): number {return this.parser.puppeteerTimeout}
  get puppeteer_wait_interval(): number {return this.parser.puppeteerWaitInterval}
  get puppeteer_wait_limit(): number {return this.parser.puppeteerWaitLimit}
}

