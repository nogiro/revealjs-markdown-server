
const code_message_list: Array<{code: number, message: string}> = [
  {code: 100, message: "Continue"},
  {code: 101, message: "Switching Protocols"},
  {code: 200, message: "OK"},
  {code: 201, message: "Created"},
  {code: 202, message: "Accepted"},
  {code: 203, message: "Non-Authoritative Information"},
  {code: 204, message: "No Content"},
  {code: 205, message: "Reset Content"},
  {code: 300, message: "Multiple Choices"},
  {code: 301, message: "Moved Permanently"},
  {code: 302, message: "Found"},
  {code: 303, message: "See Other"},
  {code: 305, message: "Use Proxy"},
  {code: 307, message: "Temporary Redirect"},
  {code: 400, message: "Bad Request"},
  {code: 402, message: "Payment Required"},
  {code: 403, message: "Forbidden"},
  {code: 404, message: "Not Found"},
  {code: 405, message: "Method Not Allowed"},
  {code: 406, message: "Not Acceptable"},
  {code: 408, message: "Request Timeout"},
  {code: 409, message: "Conflict"},
  {code: 410, message: "Gone"},
  {code: 411, message: "Length Required"},
  {code: 413, message: "Payload Too Large"},
  {code: 414, message: "URI Too Long"},
  {code: 415, message: "Unsupported Media Type"},
  {code: 417, message: "Expectation Failed"},
  {code: 426, message: "Upgrade Required"},
  {code: 500, message: "Internal Server Error"},
  {code: 501, message: "Not Implemented"},
  {code: 502, message: "Bad Gateway"},
  {code: 503, message: "Service Unavailable"},
  {code: 504, message: "Gateway Timeout"},
  {code: 505, message: "HTTP Version Not Supported"},
];

const default_value = {code: 503, message: "Service Unavailable"};

export class HTMLCodeModel {
  static from(code: number): HTMLCodeModel {
    let found = code_message_list.find(a => a.code === code);
    if (typeof found === "undefined") {
      found = default_value;
    }

    return new HTMLCodeModel(found.code, found.message);
  }

  private constructor(private _code: number, private _message: string) {}

  get code() {return this._code}
  get message() {return this._message}
}

