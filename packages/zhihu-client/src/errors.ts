export class ZhihuHttpError extends Error {
  readonly status: number;

  constructor(status: number, message: string) {
    super(message);
    this.name = "ZhihuHttpError";
    this.status = status;
  }
}

export class ZhihuApiError extends Error {
  readonly code: number;

  constructor(code: number, message: string) {
    super(message);
    this.name = "ZhihuApiError";
    this.code = code;
  }
}

export class ZhihuProtocolError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "ZhihuProtocolError";
  }
}
