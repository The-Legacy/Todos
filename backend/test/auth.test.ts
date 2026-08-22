import { describe, it, expect } from "vitest";
import { env } from "cloudflare:test";
import worker from "../src/index";

function jsonRequest(path: string, init: RequestInit = {}) {
  return new Request(`https://example.com${path}`, {
    ...init,
    headers: { "Content-Type": "application/json", ...(init.headers ?? {}) },
  });
}

async function signup(email: string, password = "password123") {
  const res = await worker.fetch(
    jsonRequest("/api/auth/signup", { method: "POST", body: JSON.stringify({ email, password }) }),
    env,
  );
  return { res, body: await res.json<any>() };
}

describe("auth", () => {
  it("signs up a new user and returns a token", async () => {
    const { res, body } = await signup("alice@example.com");
    expect(res.status).toBe(201);
    expect(body.token).toBeTypeOf("string");
    expect(body.user.email).toBe("alice@example.com");
  });

  it("rejects duplicate signups", async () => {
    await signup("bob@example.com");
    const { res } = await signup("bob@example.com");
    expect(res.status).toBe(409);
  });

  it("rejects weak passwords", async () => {
    const { res } = await signup("weak@example.com", "short");
    expect(res.status).toBe(400);
  });

  it("logs in with correct credentials and rejects wrong password", async () => {
    await signup("carol@example.com", "correcthorse");
    const good = await worker.fetch(
      jsonRequest("/api/auth/login", {
        method: "POST",
        body: JSON.stringify({ email: "carol@example.com", password: "correcthorse" }),
      }),
      env,
    );
    expect(good.status).toBe(200);

    const bad = await worker.fetch(
      jsonRequest("/api/auth/login", {
        method: "POST",
        body: JSON.stringify({ email: "carol@example.com", password: "wrongpassword" }),
      }),
      env,
    );
    expect(bad.status).toBe(401);
  });

  it("requires auth for /me and returns the current user when authed", async () => {
    const unauthed = await worker.fetch(jsonRequest("/api/auth/me"), env);
    expect(unauthed.status).toBe(401);

    const { body } = await signup("dave@example.com");
    const authed = await worker.fetch(
      jsonRequest("/api/auth/me", { headers: { Authorization: `Bearer ${body.token}` } }),
      env,
    );
    expect(authed.status).toBe(200);
    const authedBody = await authed.json<any>();
    expect(authedBody.user.email).toBe("dave@example.com");
  });

  it("seeds default categories on signup", async () => {
    const { body } = await signup("erin@example.com");
    const res = await worker.fetch(
      jsonRequest("/api/categories", { headers: { Authorization: `Bearer ${body.token}` } }),
      env,
    );
    const data = await res.json<any>();
    expect(data.categories).toHaveLength(6);
    expect(data.categories.map((c: any) => c.name)).toContain("School");
  });

  it("does not allow one user to see another user's categories", async () => {
    const alice = await signup("frank@example.com");
    const bob = await signup("gina@example.com");

    const res = await worker.fetch(
      jsonRequest("/api/categories", { headers: { Authorization: `Bearer ${bob.body.token}` } }),
      env,
    );
    const data = await res.json<any>();
    const aliceRes = await worker.fetch(
      jsonRequest("/api/categories", { headers: { Authorization: `Bearer ${alice.body.token}` } }),
      env,
    );
    const aliceData = await aliceRes.json<any>();

    const bobIds = new Set(data.categories.map((c: any) => c.id));
    const aliceIds = new Set(aliceData.categories.map((c: any) => c.id));
    for (const id of aliceIds) {
      expect(bobIds.has(id)).toBe(false);
    }
  });

  it("rejects a made-up bearer token", async () => {
    const res = await worker.fetch(
      jsonRequest("/api/categories", { headers: { Authorization: "Bearer not-a-real-token" } }),
      env,
    );
    expect(res.status).toBe(401);
  });

  it("logout invalidates the session", async () => {
    const { body } = await signup("hank@example.com");
    await worker.fetch(
      jsonRequest("/api/auth/logout", { method: "POST", headers: { Authorization: `Bearer ${body.token}` } }),
      env,
    );
    const res = await worker.fetch(
      jsonRequest("/api/auth/me", { headers: { Authorization: `Bearer ${body.token}` } }),
      env,
    );
    expect(res.status).toBe(401);
  });
});
