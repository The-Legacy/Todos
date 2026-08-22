import type { MiddlewareHandler } from "hono";
import type { AppVariables } from "../types/env";
import { resolveSession } from "../auth/session";

export const requireAuth: MiddlewareHandler<{ Bindings: Env; Variables: AppVariables }> = async (c, next) => {
  const header = c.req.header("Authorization");
  const token = header?.startsWith("Bearer ") ? header.slice("Bearer ".length) : null;
  if (!token) {
    return c.json({ error: "Unauthorized" }, 401);
  }
  const session = await resolveSession(c.env.DB, token);
  if (!session) {
    return c.json({ error: "Unauthorized" }, 401);
  }
  c.set("userId", session.userId);
  await next();
};
