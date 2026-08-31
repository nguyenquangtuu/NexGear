function normalizeUploadPath(value) {
  if (typeof value !== 'string') return value;
  return value.replace(/(^|[^A-Za-z])\/uploads\//g, (_match, prefix) => `${prefix}/api/uploads/`);
}

function normalizeUploadPathsDeep(value) {
  if (Array.isArray(value)) {
    return value.map(normalizeUploadPathsDeep);
  }

  if (value instanceof Date) {
    return value.toISOString();
  }

  if (value && typeof value === 'object') {
    return Object.fromEntries(
      Object.entries(value).map(([key, entryValue]) => [key, normalizeUploadPathsDeep(entryValue)])
    );
  }

  return normalizeUploadPath(value);
}

module.exports = {
  normalizeUploadPath,
  normalizeUploadPathsDeep,
};
