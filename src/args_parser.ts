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
      .parse(argv);
  }

  get sub_directory() {return this.parser.subDirectory}
  get resource_directory() {return this.parser.resource}
  get port() {return this.parser.port}
  get config() {return this.parser.config}
  get cache_bytes(): number {
    const tmp_bytes = bytes(this.parser.cacheBytes);
    if (typeof tmp_bytes === "string") {return 1024 * 1024 * 1024}
    return tmp_bytes;
  }
}

