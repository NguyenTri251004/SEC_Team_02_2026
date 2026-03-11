import type { NextFunction, Request, Response } from "express";

jest.mock("jsonwebtoken", () => ({
  __esModule: true,
  default: {
    verify: jest.fn(),
  },
}));

jest.mock("../../modules/admin/admin.service", () => ({
  updateLastLogin: jest.fn(),
}));

type AuthModule = typeof import("../auth");
type JwtModule = typeof import("jsonwebtoken");
type AdminServiceModule = typeof import("../../modules/admin/admin.service");

interface MockResponse {
  status: jest.MockedFunction<(code: number) => Response>;
  json: jest.MockedFunction<(body: unknown) => Response>;
}

interface DecodedToken {
  sub?: string;
  user_id?: string;
  preferred_username?: string;
  username?: string;
  email?: string;
  roles?: string[];
  realm_access?: {
    roles: string[];
  };
}

interface LoadedAuthContext {
  auth: AuthModule;
  verifyMock: jest.MockedFunction<JwtModule["default"]["verify"]>;
  updateLastLoginMock: jest.MockedFunction<AdminServiceModule["updateLastLogin"]>;
}

const defaultDecodedToken: DecodedToken = {
  sub: "user-001",
  preferred_username: "tester",
  email: "tester@example.com",
  realm_access: { roles: ["admin"] },
};

const originalEnv = process.env;
const originalFetch = global.fetch;

const createResponse = (): MockResponse => {
  const response = {
    status: jest
      .fn<(code: number) => Response>()
      .mockImplementation((_code: number) => response as unknown as Response),
    json: jest
      .fn<(body: unknown) => Response>()
      .mockImplementation((_body: unknown) => response as unknown as Response),
  };

  return response;
};

const createRequest = (authorization?: string): Request =>
  ({
    headers: authorization ? { authorization } : {},
  }) as Request;

const loadAuthContext = async (): Promise<LoadedAuthContext> => {
  jest.resetModules();

  const [auth, jwtModule, adminServiceModule] = await Promise.all([
    import("../auth"),
    import("jsonwebtoken"),
    import("../../modules/admin/admin.service"),
  ]);

  const verifyMock = jest.mocked(jwtModule.default.verify);
  const updateLastLoginMock = jest.mocked(adminServiceModule.updateLastLogin);

  verifyMock.mockReset();
  updateLastLoginMock.mockReset();
  updateLastLoginMock.mockResolvedValue(undefined);
  verifyMock.mockReturnValue(defaultDecodedToken as ReturnType<typeof verifyMock>);

  return {
    auth,
    verifyMock,
    updateLastLoginMock,
  };
};

describe("auth middleware", () => {
  beforeEach(() => {
    process.env = {
      ...originalEnv,
      KEYCLOAK_PUBLIC_KEY: "static-public-key",
      KEYCLOAK_URL: "http://keycloak.test",
      KEYCLOAK_REALM: "ims-test",
    };
    global.fetch = originalFetch;
  });

  afterEach(() => {
    process.env = originalEnv;
    global.fetch = originalFetch;
  });

  describe("authenticateJWT", () => {
    it("returns 401 when Authorization header is missing", async () => {
      const { auth } = await loadAuthContext();
      const request = createRequest();
      const response = createResponse();
      const next = jest.fn<NextFunction>();

      await auth.authenticateJWT(
        request,
        response as unknown as Response,
        next,
      );

      expect(response.status).toHaveBeenCalledWith(401);
      expect(response.json).toHaveBeenCalledWith({
        success: false,
        error: "Unauthorized - No token provided",
      });
      expect(next).not.toHaveBeenCalled();
    });

    it("returns 401 when bearer token format is invalid", async () => {
      const { auth } = await loadAuthContext();
      const request = createRequest("Token abc123");
      const response = createResponse();
      const next = jest.fn<NextFunction>();

      await auth.authenticateJWT(
        request,
        response as unknown as Response,
        next,
      );

      expect(response.status).toHaveBeenCalledWith(401);
      expect(response.json).toHaveBeenCalledWith({
        success: false,
        error: "Unauthorized - Invalid token format",
      });
      expect(next).not.toHaveBeenCalled();
    });

    it("attaches user info and calls next on successful verification", async () => {
      const { auth, verifyMock, updateLastLoginMock } = await loadAuthContext();
      const request = createRequest("Bearer valid-token");
      const response = createResponse();
      const next = jest.fn<NextFunction>();

      await auth.authenticateJWT(
        request,
        response as unknown as Response,
        next,
      );

      expect(verifyMock).toHaveBeenCalledWith(
        "valid-token",
        "static-public-key",
      );
      expect(request.user).toEqual({
        user_id: "user-001",
        username: "tester",
        email: "tester@example.com",
        roles: ["admin"],
        realm_access: { roles: ["admin"] },
      });
      expect(updateLastLoginMock).toHaveBeenCalledWith("user-001");
      expect(next).toHaveBeenCalledTimes(1);
    });

    it("falls back to decoded roles and username fields when realm_access is absent", async () => {
      const { auth, verifyMock } = await loadAuthContext();
      verifyMock.mockReturnValueOnce({
        user_id: "user-roles",
        username: "fallback-user",
        roles: ["viewer"],
      } as ReturnType<typeof verifyMock>);

      const request = createRequest("Bearer valid-token");
      const response = createResponse();
      const next = jest.fn<NextFunction>();

      await auth.authenticateJWT(
        request,
        response as unknown as Response,
        next,
      );

      expect(request.user).toEqual({
        user_id: "user-roles",
        username: "fallback-user",
        email: undefined,
        roles: ["viewer"],
        realm_access: undefined,
      });
      expect(next).toHaveBeenCalledTimes(1);
    });

    it("returns 403 when token verification fails", async () => {
      const { auth, verifyMock } = await loadAuthContext();
      verifyMock.mockImplementationOnce(() => {
        throw new Error("invalid token");
      });

      const request = createRequest("Bearer bad-token");
      const response = createResponse();
      const next = jest.fn<NextFunction>();

      await auth.authenticateJWT(
        request,
        response as unknown as Response,
        next,
      );

      expect(response.status).toHaveBeenCalledWith(403);
      expect(response.json).toHaveBeenCalledWith({
        success: false,
        error: "Forbidden - Invalid token",
      });
      expect(next).not.toHaveBeenCalled();
    });
  });

  describe("optionalAuth", () => {
    it("continues without user when Authorization header is missing", async () => {
      const { auth, verifyMock } = await loadAuthContext();
      const request = createRequest();
      const response = createResponse();
      const next = jest.fn<NextFunction>();

      await auth.optionalAuth(request, response as unknown as Response, next);

      expect(request.user).toBeUndefined();
      expect(next).toHaveBeenCalledTimes(1);
      expect(verifyMock).not.toHaveBeenCalled();
    });

    it("continues without user when bearer format is invalid", async () => {
      const { auth, verifyMock } = await loadAuthContext();
      const request = createRequest("Basic abc123");
      const response = createResponse();
      const next = jest.fn<NextFunction>();

      await auth.optionalAuth(request, response as unknown as Response, next);

      expect(request.user).toBeUndefined();
      expect(next).toHaveBeenCalledTimes(1);
      expect(verifyMock).not.toHaveBeenCalled();
    });

    it("attaches user when optional token is valid", async () => {
      const { auth } = await loadAuthContext();
      const request = createRequest("Bearer valid-token");
      const response = createResponse();
      const next = jest.fn<NextFunction>();

      await auth.optionalAuth(request, response as unknown as Response, next);

      expect(request.user?.user_id).toBe("user-001");
      expect(next).toHaveBeenCalledTimes(1);
    });

    it("swallows verification errors and continues without user", async () => {
      const { auth, verifyMock } = await loadAuthContext();
      verifyMock.mockImplementationOnce(() => {
        throw new Error("bad token");
      });

      const request = createRequest("Bearer bad-token");
      const response = createResponse();
      const next = jest.fn<NextFunction>();

      await auth.optionalAuth(request, response as unknown as Response, next);

      expect(request.user).toBeUndefined();
      expect(next).toHaveBeenCalledTimes(1);
    });
  });

  describe("extractUserFromToken", () => {
    it("returns decoded user when token is valid", async () => {
      const { auth } = await loadAuthContext();

      const result = await auth.extractUserFromToken("valid-token");

      expect(result).toEqual(defaultDecodedToken);
    });

    it("returns null when token verification fails", async () => {
      const { auth, verifyMock } = await loadAuthContext();
      verifyMock.mockImplementationOnce(() => {
        throw new Error("verify failed");
      });

      const result = await auth.extractUserFromToken("bad-token");

      expect(result).toBeNull();
    });

    it("fetches Keycloak public key dynamically when no static key is configured", async () => {
      delete process.env.KEYCLOAK_PUBLIC_KEY;
      const { auth, verifyMock } = await loadAuthContext();
      const fetchMock = jest.fn<ReturnType<typeof fetch>, Parameters<typeof fetch>>();

      fetchMock.mockResolvedValue({
        ok: true,
        json: async () => ({ public_key: "dynamic-key" }),
      } as unknown as Response);
      global.fetch = fetchMock;

      await auth.extractUserFromToken("dynamic-token");

      expect(fetchMock).toHaveBeenCalledWith(
        "http://keycloak.test/realms/ims-test",
        expect.objectContaining({ signal: expect.any(Object) }),
      );
      expect(verifyMock).toHaveBeenCalledWith(
        "dynamic-token",
        "-----BEGIN PUBLIC KEY-----\ndynamic-key\n-----END PUBLIC KEY-----",
      );
    });

    it("returns null when Keycloak key cannot be fetched", async () => {
      delete process.env.KEYCLOAK_PUBLIC_KEY;
      const { auth, verifyMock } = await loadAuthContext();
      const fetchMock = jest.fn<ReturnType<typeof fetch>, Parameters<typeof fetch>>();

      fetchMock.mockRejectedValue(new Error("network down"));
      global.fetch = fetchMock;

      const result = await auth.extractUserFromToken("dynamic-token");

      expect(result).toBeNull();
      expect(verifyMock).not.toHaveBeenCalled();
    });
  });
});
