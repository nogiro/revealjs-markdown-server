import commander from "commander";

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
      .parse(argv);
  }

  get sub_directory() {return this.parser.subDirectory}
  get resource_directory() {return this.parser.resource}
  get port() {return this.parser.port}
  get config() {return this.parser.config}
}

