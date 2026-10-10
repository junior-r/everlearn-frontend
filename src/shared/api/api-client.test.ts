import { describe, expect, it, vi } from "vitest";
import { ApiError, createApiClient } from "./api-client";

type FetchCall = { url: string; init: RequestInit };

function json(status: number, body: unknown): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}

function setup(handler: (call: FetchCall) => Response | Promise<Response>) {
  const calls: FetchCall[] = [];
  const fetchMock = vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
    const call = { url: String(input), init: init ?? {} };
    calls.push(call);
    return handler(call);
  });
  const client = createApiClient({
    baseUrl: "http://api.test",
    refreshPath: "/auth/refresh",
    fetch: fetchMock as typeof fetch,
  });
  return { client, calls };
}

const authHeader = (call: FetchCall) =>
  (call.init.headers as Record<string, string>).Authorization;

describe("createApiClient", () => {
  it("attaches the access token and always sends credentials", async () => {
    const { client, calls } = setup(() => json(200, { ok: true }));
    client.setAccessToken("token-1");

    await client.request("/auth/me");

    expect(calls[0].url).toBe("http://api.test/auth/me");
    expect(authHeader(calls[0])).toBe("Bearer token-1");
    expect(calls[0].init.credentials).toBe("include");
  });

  it("sends no Authorization header without a token or when auth is skipped", async () => {
    const { client, calls } = setup(() => json(200, {}));

    await client.request("/public");
    client.setAccessToken("token-1");
    await client.request("/auth/login", { method: "POST", body: { a: 1 }, skipAuth: true });

    expect(authHeader(calls[0])).toBeUndefined();
    expect(authHeader(calls[1])).toBeUndefined();
    expect(calls[1].init.body).toBe('{"a":1}');
  });

  it("sends FormData untouched and lets the browser set the multipart content type", async () => {
    const { client, calls } = setup(() => json(200, {}));
    const form = new FormData();
    form.append("file", new Blob(["x"]), "id.jpg");

    await client.request("/onboarding/document", { method: "POST", body: form });

    expect(calls[0].init.body).toBe(form);
    expect((calls[0].init.headers as Record<string, string>)["Content-Type"]).toBeUndefined();
  });

  it("downloads files as blobs with the same auth and refresh behaviour", async () => {
    const { client, calls } = setup((call) => {
      if (call.url.endsWith("/auth/refresh")) {
        return json(200, { accessToken: "token-2" });
      }
      return authHeader(call) === "Bearer token-2"
        ? new Response("photo-bytes", { status: 200, headers: { "Content-Type": "image/jpeg" } })
        : json(401, {});
    });
    client.setAccessToken("expired");

    const blob = await client.requestBlob("/photo", { headers: { "x-institution-id": "inst-1" } });

    expect(await blob.text()).toBe("photo-bytes");
    expect(blob.type).toBe("image/jpeg");
    expect((calls[2].init.headers as Record<string, string>)["x-institution-id"]).toBe("inst-1");
  });

  it("reports a failed download as an ApiError with the backend code", async () => {
    const { client } = setup(() => json(404, { code: "APPLICATION_NOT_FOUND", message: "nope" }));

    await expect(client.requestBlob("/photo", { skipAuth: true })).rejects.toMatchObject({
      status: 404,
      code: "APPLICATION_NOT_FOUND",
    });
  });

  it("refreshes once on a 401 and retries with the new token", async () => {
    const { client, calls } = setup((call) => {
      if (call.url.endsWith("/auth/refresh")) {
        return json(200, { accessToken: "token-2" });
      }
      return authHeader(call) === "Bearer token-2" ? json(200, { id: 7 }) : json(401, {});
    });
    client.setAccessToken("expired");

    await expect(client.request("/courses")).resolves.toEqual({ id: 7 });

    expect(calls.map((call) => call.url)).toEqual([
      "http://api.test/courses",
      "http://api.test/auth/refresh",
      "http://api.test/courses",
    ]);
    expect(client.getAccessToken()).toBe("token-2");
  });

  it("shares a single refresh between concurrent 401s", async () => {
    const { client, calls } = setup((call) => {
      if (call.url.endsWith("/auth/refresh")) {
        return json(200, { accessToken: "token-2" });
      }
      return authHeader(call) === "Bearer token-2" ? json(200, {}) : json(401, {});
    });
    client.setAccessToken("expired");

    await Promise.all([client.request("/a"), client.request("/b"), client.request("/c")]);

    expect(calls.filter((call) => call.url.endsWith("/auth/refresh"))).toHaveLength(1);
  });

  it("clears the token, notifies listeners and surfaces the 401 when the refresh fails", async () => {
    const { client, calls } = setup(() => json(401, { code: "INVALID_REFRESH_TOKEN", message: "expired" }));
    const listener = vi.fn();
    client.setAccessToken("expired");
    client.subscribe(listener);

    await expect(client.request("/courses")).rejects.toMatchObject({
      status: 401,
      code: "INVALID_REFRESH_TOKEN",
    });

    expect(client.getAccessToken()).toBeNull();
    expect(listener).toHaveBeenCalledWith(null);
    expect(calls).toHaveLength(2);
  });

  it("does not try to refresh when a skipAuth request gets a 401", async () => {
    const { client, calls } = setup(() => json(401, { code: "INVALID_CREDENTIALS", message: "Invalid email or password" }));

    const error = await client
      .request("/auth/login", { method: "POST", body: {}, skipAuth: true })
      .catch((caught: unknown) => caught);

    expect(error).toBeInstanceOf(ApiError);
    expect(error).toMatchObject({ code: "INVALID_CREDENTIALS", message: "Invalid email or password" });
    expect(calls).toHaveLength(1);
  });

  it("joins validation messages and falls back to an HTTP code", async () => {
    const { client } = setup(() => json(400, { message: ["email must be an email", "password is too short"] }));

    await expect(client.request("/x", { skipAuth: true })).rejects.toMatchObject({
      code: "HTTP_400",
      message: "email must be an email. password is too short",
    });
  });

  it("returns undefined for 204 and reports network failures as ApiError", async () => {
    const ok = setup(() => new Response(null, { status: 204 }));
    await expect(ok.client.request("/auth/logout", { method: "POST" })).resolves.toBeUndefined();

    const down = setup(() => {
      throw new TypeError("fetch failed");
    });
    await expect(down.client.request("/x")).rejects.toMatchObject({ status: 0, code: "NETWORK_ERROR" });
  });

  it("stops notifying after unsubscribe", () => {
    const { client } = setup(() => json(200, {}));
    const listener = vi.fn();
    const unsubscribe = client.subscribe(listener);

    client.setAccessToken("a");
    unsubscribe();
    client.setAccessToken("b");

    expect(listener).toHaveBeenCalledTimes(1);
  });
});
