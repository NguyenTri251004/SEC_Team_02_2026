declare module "express-pino-logger" {
  import { RequestHandler } from "express";
  import pino from "pino";

  interface ExpressPinoLoggerOptions {
    logger?: pino.Logger;
    customLogLevel?: (res: import("http").IncomingMessage, err: Error) => string;
    serializers?: pino.Serializers;
    useLevel?: boolean;
    genReqId?: (req: import("http").IncomingMessage) => string;
    autoLogging?: boolean;
    ignoredRoutes?: string[];
  }

  function expressPinoLogger(options?: ExpressPinoLoggerOptions): RequestHandler;
  export = expressPinoLogger;
}
