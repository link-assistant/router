/** Explicit location metadata policy. This does not conceal the transport IP. */
export const GEOLOCATION_OPT_IN = 'x-router-share-geolocation';

export function geolocationInferencePath(path) {
  return ['/messages','/messages/count_tokens','/messages/batches','/chat/completions',
    '/responses','/responses/compact','/responses/input_tokens','/invoke','/invoke-with-response-stream',
    ':generateContent',':streamGenerateContent',':countTokens',':rawPredict',':streamRawPredict']
    .some(suffix=>path.endsWith(suffix));
}

export function sharesGeolocation(headers) {
  // Headers joins repeated values with commas: duplicates deliberately fail closed.
  return headers.get(GEOLOCATION_OPT_IN) === 'true';
}

export function isGeolocationHeader(name) {
  const lower = name.toLowerCase();
  return /^(?:cf-(?:ip(?:country|city|continent|latitude|longitude|region|region-code|timezone|postal-code)|region|region-code|metro-code|postal-code|timezone)|x-vercel-ip-.*|cloudfront-viewer-(?:country|country-name|country-region|country-region-name|city|latitude|longitude|postal-code|time-zone)|x-appengine-(?:country|region|city|citylatlong)|x-geo-.*|x-geolocation(?:-.*)?|x-user-location|x-client-(?:country|city|region)|x-latitude|x-longitude)$/.test(lower);
}

/** Mutate only API location metadata, never arbitrary prompt/schema properties. */
export function sanitizeGeolocation(value, share = false) {
  if (share || !value || typeof value !== 'object' || Array.isArray(value)) return false;
  let changed = false;
  const remove = (object, key) => {
    if (object && typeof object === 'object' && !Array.isArray(object) && Object.hasOwn(object,key)) {
      delete object[key]; changed = true;
    }
  };
  const roots = [value, value.request, value.response, value.session];
  if (Array.isArray(value.requests)) for (const batch of value.requests) roots.push(batch?.params);
  for (const root of roots) {
    if (!root || typeof root !== 'object' || Array.isArray(root)) continue;
    remove(root.web_search_options,'user_location');
    remove(root.toolConfig?.retrievalConfig,'latLng');
    remove(root.tool_config?.retrieval_config,'lat_lng');
    if (Array.isArray(root.tools)) for (const tool of root.tools) {
      if (typeof tool?.type === 'string' && /^web_search(?:_preview)?(?:_(?:\d{8}|\d{4}_\d{2}_\d{2}))?$/.test(tool.type)) remove(tool,'user_location');
    }
  }
  return changed;
}
