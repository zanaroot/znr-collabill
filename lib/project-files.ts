export const MAX_PROJECT_FILE_SIZE = 50 * 1024 * 1024;

const previewableTextExtensions = new Set([
  "txt",
  "md",
  "markdown",
  "json",
  "yaml",
  "yml",
  "toml",
  "ini",
  "conf",
  "config",
  "properties",
  "xml",
  "csv",
]);

const previewableTextMimeTypes = new Set([
  "text/plain",
  "text/markdown",
  "text/x-markdown",
  "application/json",
  "application/yaml",
  "application/x-yaml",
  "text/yaml",
  "text/x-yaml",
]);

export const isPreviewableProjectTextFile = (
  name: string,
  mimeType: string,
) => {
  const normalizedName = name.toLowerCase();
  const extension = normalizedName.split(".").at(-1);
  const isEnvFile =
    normalizedName === ".env" || normalizedName.startsWith(".env.");

  return (
    isEnvFile ||
    (extension !== undefined && previewableTextExtensions.has(extension)) ||
    previewableTextMimeTypes.has(mimeType.toLowerCase())
  );
};

export const isSensitiveProjectFileName = (name: string) => {
  const normalizedName = name.toLowerCase();
  return normalizedName === ".env" || normalizedName.startsWith(".env.");
};
