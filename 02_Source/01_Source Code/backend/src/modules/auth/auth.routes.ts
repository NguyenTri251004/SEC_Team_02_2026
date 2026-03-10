import { Router } from "express";

// Authentication is handled entirely by Keycloak (OpenID Connect).
// The frontend redirects users to Keycloak for login; the backend
// only validates Keycloak-issued JWTs via the authenticateJWT middleware.
// No custom /login endpoint is provided here.

const router = Router();

export default router;
