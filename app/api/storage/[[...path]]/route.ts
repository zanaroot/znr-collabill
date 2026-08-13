import { type NextRequest, NextResponse } from "next/server";
import { buildStorageProxyUrl } from "@/lib/storage-proxy";
import { serverEnv } from "@/packages/env/server";

export const runtime = "nodejs";

const HOP_BY_HOP_HEADERS = new Set([
  "connection",
  "keep-alive",
  "proxy-authenticate",
  "proxy-authorization",
  "te",
  "trailer",
  "transfer-encoding",
  "upgrade",
]);

const proxyStorageRequest = async (request: NextRequest) => {
  const upstreamUrl = buildStorageProxyUrl(
    request.nextUrl.pathname,
    request.nextUrl.search,
    serverEnv.S3_ENDPOINT,
  );

  const upstream = await fetch(upstreamUrl, {
    method: request.method,
    headers: {
      accept: request.headers.get("accept") ?? "application/octet-stream",
      "accept-encoding": "identity",
      "if-none-match": request.headers.get("if-none-match") ?? "",
      "if-modified-since": request.headers.get("if-modified-since") ?? "",
      range: request.headers.get("range") ?? "",
    },
    cache: "no-store",
  });

  const responseHeaders = new Headers();
  upstream.headers.forEach((value, key) => {
    if (!HOP_BY_HOP_HEADERS.has(key.toLowerCase())) {
      responseHeaders.set(key, value);
    }
  });

  return new NextResponse(upstream.body, {
    status: upstream.status,
    statusText: upstream.statusText,
    headers: responseHeaders,
  });
};

export const GET = (request: NextRequest) => proxyStorageRequest(request);
export const HEAD = (request: NextRequest) => proxyStorageRequest(request);
