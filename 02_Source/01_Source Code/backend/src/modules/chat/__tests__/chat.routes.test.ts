import request from "supertest";
import express from "express";

jest.mock("../../../security/auth", () => ({
  authenticateJWT: (req: any, _res: any, next: any) => {
    req.user = {
      user_id: "USR-001",
      username: "admin",
      roles: ["admin"],
    };
    next();
  },
}));

jest.mock("../../../security/rbac", () => ({
  requirePermission: () => (_req: any, _res: any, next: any) => next(),
}));

jest.mock("../chat.service", () => ({
  askChatbot: jest.fn(),
}));

import { askChatbot } from "../chat.service";
import chatRouter from "../chat.routes";

const mockedAskChatbot = askChatbot as jest.MockedFunction<typeof askChatbot>;

const app = express();
app.use(express.json());
app.use("/api/chat", chatRouter);

describe("POST /api/chat/ask", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("returns 400 when question is missing", async () => {
    const res = await request(app).post("/api/chat/ask").send({});

    expect(res.status).toBe(400);
    expect(res.body.success).toBe(false);
  });

  it("returns chatbot answer when request is valid", async () => {
    mockedAskChatbot.mockResolvedValue({
      answer: "There are 5 lots in quarantine.",
      confidence: 0.92,
      intent: "lots_in_quarantine",
      citations: [],
      retrieval_trace_id: "trace-1",
      warnings: [],
      generated_at: "2026-04-20T00:00:00.000Z",
    });

    const res = await request(app)
      .post("/api/chat/ask")
      .set("x-correlation-id", "trace-1")
      .send({ question: "How many lots are in quarantine?" });

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.intent).toBe("lots_in_quarantine");
    expect(mockedAskChatbot).toHaveBeenCalledTimes(1);
  });
});
