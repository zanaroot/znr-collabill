import { getPublicS3Endpoint } from "@/app/_utils/get-pulic-s3-endpoint";

const LOCAL_PATH_PATTERN =
  /^(\/(home|Users|tmp|var|opt|private)\/|[A-Za-z]:[\\/]|file:\/\/)/;

const HTTP_URL_PATTERN = /^https?:\/\//i;
const STORAGE_PROXY_PREFIX = "/api/storage";

export const isLocalFilesystemPath = (url: string): boolean => {
  const trimmed = url.trim();
  if (!trimmed) {
    return false;
  }

  return LOCAL_PATH_PATTERN.test(trimmed);
};

export const isAllowedImageSrc = (url: string): boolean => {
  const trimmed = url.trim();
  if (!trimmed || isLocalFilesystemPath(trimmed)) {
    return false;
  }

  if (HTTP_URL_PATTERN.test(trimmed)) {
    return true;
  }

  if (trimmed.startsWith(`${STORAGE_PROXY_PREFIX}/`)) {
    return true;
  }

  const endpoint = getPublicS3Endpoint();
  if (trimmed.startsWith(`${endpoint}/`)) {
    return true;
  }

  return /^\/[^/]+\/(editor|avatars)\//.test(trimmed);
};

export const normalizeDescriptionImageUrl = (src: string): string | null => {
  const trimmed = src.trim();
  if (!trimmed || isLocalFilesystemPath(trimmed)) {
    return null;
  }

  if (HTTP_URL_PATTERN.test(trimmed)) {
    return trimmed;
  }

  const endpoint = getPublicS3Endpoint();

  if (
    trimmed.startsWith(`${endpoint}/`) ||
    trimmed.startsWith(`${STORAGE_PROXY_PREFIX}/`)
  ) {
    return trimmed;
  }

  if (trimmed.startsWith("/") && !trimmed.startsWith("//")) {
    return `${endpoint}${trimmed}`;
  }

  return null;
};

export const extractDescriptionImageUrls = (html: string): string[] => {
  if (!html) {
    return [];
  }

  const urls: string[] = [];
  const imgSrcRegex = /<img\b[^>]*\bsrc=["']([^"']+)["'][^>]*>/gi;
  let match = imgSrcRegex.exec(html);

  while (match !== null) {
    const normalized = normalizeDescriptionImageUrl(match[1]);
    if (normalized) {
      urls.push(normalized);
    }
    match = imgSrcRegex.exec(html);
  }

  return urls;
};

export const sanitizeDescriptionHtml = (html: string): string => {
  if (!html) {
    return html;
  }

  return html.replace(/<img\b[^>]*>/gi, (imgTag) => {
    const srcMatch = imgTag.match(/\bsrc=(["'])([^"']+)\1/i);
    if (!srcMatch) {
      return "";
    }

    const normalized = normalizeDescriptionImageUrl(srcMatch[2]);
    if (!normalized) {
      return "";
    }

    if (normalized === srcMatch[2]) {
      return imgTag;
    }

    return imgTag.replace(srcMatch[0], `src="${normalized}"`);
  });
};
