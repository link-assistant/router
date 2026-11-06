// GENERATED JavaScript -> structured syntax AST -> TypeScript draft.
// Meta sha256=20d75ebe6e90fde4245f49cb37012e003e4a5966b27a6594975c5dfaeb6f2411; dynamic any annotations are explicit draft gaps.
export const GEOLOCATION_OPT_IN: string = 'x-router-share-geolocation';
export function geolocationInferencePath(path?: any): boolean {
    return ['/messages', '/messages/count_tokens', '/messages/batches', '/chat/completions',
        '/responses', '/responses/compact', '/responses/input_tokens', '/invoke', '/invoke-with-response-stream',
        ':generateContent', ':streamGenerateContent', ':countTokens', ':rawPredict', ':streamRawPredict']
        .some((suffix?: any): any => (path.endsWith as any)(suffix));
}
export function sharesGeolocation(headers?: any): boolean {
    return (headers.get as any)(GEOLOCATION_OPT_IN) === 'true';
}
export function isGeolocationHeader(name?: any): boolean {
    const lower: any = name.toLowerCase();
    return /^(?:cf-(?:ip(?:country|city|continent|latitude|longitude|region|region-code|timezone|postal-code)|region|region-code|metro-code|postal-code|timezone)|x-vercel-ip-.*|cloudfront-viewer-(?:country|country-name|country-region|country-region-name|city|latitude|longitude|postal-code|time-zone)|x-appengine-(?:country|region|city|citylatlong)|x-geo-.*|x-geolocation(?:-.*)?|x-user-location|x-client-(?:country|city|region)|x-latitude|x-longitude)$/.test(lower);
}
export function sanitizeGeolocation(value?: any, share: any = false): boolean {
    if (share || !value || typeof value !== 'object' || (Array as any).isArray(value))
        return false;
    let changed: any = false;
    const remove: any = (object?: any, key?: any): void => {
        if (object && typeof object === 'object' && !(Array as any).isArray(object) && (Object as any).hasOwn(object, key)) {
            delete (object as any)[key];
            (changed as any) = true;
        }
    };
    const roots: any = [value, value.request, value.response, value.session];
    if ((Array as any).isArray(value.requests))
        for (const batch of value.requests as any)
            roots.push(batch?.params);
    for (const root of roots as any) {
        if (!root || typeof root !== 'object' || (Array as any).isArray(root))
            continue;
        remove(root.web_search_options, 'user_location');
        remove(root.toolConfig?.retrievalConfig, 'latLng');
        remove(root.tool_config?.retrieval_config, 'lat_lng');
        if ((Array as any).isArray(root.tools))
            for (const tool of root.tools as any) {
                if (typeof tool?.type === 'string' && /^web_search(?:_preview)?(?:_(?:\d{8}|\d{4}_\d{2}_\d{2}))?$/.test(tool.type))
                    remove(tool, 'user_location');
            }
    }
    return changed;
}
