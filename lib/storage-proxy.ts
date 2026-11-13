const STORAGE_ROUTE_PREFIX = "/api/storage";

export const buildStorageProxyUrl = (
  pathname: string,
  search: string,
  endpoint: string,
) => {
  const storagePath = pathname.startsWith(STORAGE_ROUTE_PREFIX)
    ? pathname.slice(STORAGE_ROUTE_PREFIX.length) || "/"
    : pathname;
  const url = new URL(storagePath, endpoint.replace(/\/+$/, ""));
  url.search = search;
  return url;
};

export const isProjectFileBucketPath = (pathname: string, bucket: string) => {
  try {
    return pathname
      .split("/")
      .some((segment) => decodeURIComponent(segment) === bucket);
  } catch {
    return true;
  }
};
