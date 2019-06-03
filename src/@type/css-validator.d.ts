declare module "css-validator" {

  type callback = (err?: Error, data?: string) => any;
  type options = string | object;
  export default function(opt: options, cb: callback): any;

}
