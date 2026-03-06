import { NextFunction, Request, RequestHandler, Response } from "express";
import router from "../production.routes";

interface RouteLayer {
  route?: {
    path: string;
    methods: Record<string, boolean>;
    stack: Array<{ handle: RequestHandler }>;
  };
}

interface MockResponse extends Partial<Response> {
  statusCode: number;
  body?: unknown;
}

type Mutable<T> = {
  -readonly [K in keyof T]: T[K];
};

type ProductionServiceModule = Mutable<typeof import("../production.service")>;

const serviceModule =
  require("../production.service") as ProductionServiceModule;

const originalCreateBatch = serviceModule.createBatch;
const originalUpdateBatchStatus = serviceModule.updateBatchStatus;

const getRouteHandler = (method: string, path: string): RequestHandler => {
  const layer = (router.stack as RouteLayer[]).find((entry) => {
    return entry.route?.path === path && entry.route.methods[method] === true;
  });

  if (!layer?.route) {
    throw new Error(`Route not found for ${method.toUpperCase()} ${path}`);
  }

  return layer.route.stack[layer.route.stack.length - 1].handle;
};

const createResponse = (): MockResponse => {
  const response: MockResponse = {
    statusCode: 200,
    status(code: number) {
      response.statusCode = code;
      return response as Response;
    },
    json(payload: unknown) {
      response.body = payload;
      return response as Response;
    },
  };

  return response;
};

const noopNext: NextFunction = () => undefined;

afterEach(() => {
  serviceModule.createBatch = originalCreateBatch;
  serviceModule.updateBatchStatus = originalUpdateBatchStatus;
});

it("PATCH /batches/:id/status returns 400 for invalid status values", async () => {
  const handler = getRouteHandler("patch", "/batches/:id/status");
  const req = {
    params: { id: "batch-100" },
    body: { status: "Started" },
  } as unknown as Request;
  const res = createResponse();

  await handler(req, res as Response, noopNext);

  expect(res.statusCode).toBe(400);
  expect(res.body).toEqual({ success: false, error: "Status khong hop le" });
});

test("POST /batches maps duplicate key errors to 409", async () => {
  const handler = getRouteHandler("post", "/batches");
  const duplicateError = Object.assign(new Error("duplicate key"), {
    code: "23505",
  });

  serviceModule.createBatch = async () => {
    throw duplicateError;
  };

  const req = {
    body: {
      batch_id: "batch-101",
      product_id: "MAT001",
      batch_number: "B-2026-101",
      batch_size: 10,
      unit_of_measure: "kg",
      manufacture_date: "2026-03-06",
      expiration_date: "2027-03-06",
    },
  } as unknown as Request;
  const res = createResponse();

  await handler(req, res as Response, noopNext);

  expect(res.statusCode).toBe(409);
  expect(res.body).toEqual({
    success: false,
    error: "batch_id hoac batch_number da ton tai",
  });
});
