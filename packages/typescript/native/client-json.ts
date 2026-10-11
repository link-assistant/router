// GENERATED JavaScript -> structured syntax AST -> TypeScript draft.
// Meta sha256=08bd52d80adc5fc73e2085880e8622eed1263f7178b00b4e9db2cacbecc9aa73; dynamic any annotations are explicit draft gaps.
import { optionalClientText, clientObject, objectProperty, clientFailure, renderClientJSON, writeClientFile, writeClientMarker, removeClientFile, sameClientValue } from "./client-files.js";
const managedQwen: any = (value?: any): any => value?.envKey === 'LINK_ASSISTANT_TOKEN' && typeof value.name === 'string' && (value.name.startsWith as any)('Link.Assistant.Router');
function qwenModels(document?: any): any {
    const providers: any = objectProperty(document, 'modelProviders');
    providers.openai ??= [];
    if (!(Array as any).isArray(providers.openai))
        throw clientFailure('modelProviders.openai must be a JSON array');
    return providers.openai;
}
export async function setupClientJSON(paths?: any, endpoint?: any, catalog?: any, { onWrite = async (): Promise<void> => { } }: any = {}): Promise<any> {
    if (!['opencode', 'agent', 'qwen'].includes(paths.info.client))
        throw clientFailure('Client does not use an OpenCode/Qwen JSON provider');
    if (!catalog.length)
        throw clientFailure('Router catalog contains no models from healthy subscriptions');
    const source: any = await optionalClientText(paths.config), document: any = clientObject(source);
    const markerSource: any = await optionalClientText(paths.marker);
    let marker: any = markerSource === null ? null : clientObject(markerSource, 'Ownership marker');
    if (paths.info.client === 'qwen') {
        const models: any = qwenModels(document), previous: any = (marker as any)?.managed_models ?? ((marker as any)?.managed_model ? [(marker as any).managed_model] : []);
        if (!(Array as any).isArray(previous))
            throw clientFailure('Invalid ownership marker');
        const managed: any = (catalog.map as any)(({ id }: any): any => ({ id, name: 'Link.Assistant.Router', baseUrl: endpoint, envKey: 'LINK_ASSISTANT_TOKEN' }));
        const current: any = (models.filter as any)((value?: any): any => managedQwen(value) || previous.some((old?: any): boolean => sameClientValue(old, value)));
        if (sameClientValue(current, managed) && sameClientValue((marker as any)?.managed_models, managed))
            return { path: paths.config, backup: null, changed: false };
        document.modelProviders.openai = [...(models.filter as any)((value?: any): boolean => !managedQwen(value) && !previous.some((old?: any): boolean => sameClientValue(old, value))), ...managed];
        (marker as any) = { ...(marker ?? {}), managed_models: managed };
        delete (marker as any).managed_model;
    }
    else {
        const providers: any = objectProperty(document, 'provider'), previous: any = (providers as any)['link-assistant'];
        const managed: any = previous === undefined ? {} : structuredClone(previous);
        if (!managed || typeof managed !== 'object' || (Array as any).isArray(managed))
            throw clientFailure('provider.link-assistant must be a JSON object');
        (Object as any).assign(managed, { npm: '@ai-sdk/openai-compatible', name: 'Link.Assistant.Router', options: { baseURL: endpoint, apiKey: '{env:LINK_ASSISTANT_TOKEN}' } });
        const models: any = objectProperty(managed, 'models');
        for (const id of (marker as any)?.managed_model_ids ?? [] as any)
            if (!(catalog.some as any)((model?: any): boolean => model.id === id))
                delete (models as any)[id];
        for (const { id } of catalog as any)
            if (!(Object as any).hasOwn(models, id))
                (Object as any).defineProperty(models, id, { value: { name: `Router (${id})` }, writable: true, enumerable: true, configurable: true });
        if (sameClientValue(previous, managed) && sameClientValue((marker as any)?.managed_provider, managed))
            return { path: paths.config, backup: null, changed: false };
        (providers as any)['link-assistant'] = managed;
        (marker as any) = marker ?? { had_previous_provider: previous !== undefined, previous_provider: previous ?? null };
        (Object as any).assign(marker, { managed_provider: managed, managed_model_ids: (catalog.map as any)(({ id }: any): any => id) });
    }
    const result: any = await writeClientFile(paths.config, source, renderClientJSON(document));
    await (onWrite as any)(paths.config, result);
    await writeClientMarker(paths.marker, marker);
    await (onWrite as any)(paths.marker);
    return result;
}
export async function removeClientJSON(paths?: any, { onWrite = async (): Promise<void> => { } }: any = {}): Promise<any> {
    const source: any = await optionalClientText(paths.config);
    if (source === null || !source.trim())
        return { path: paths.config, backup: null, changed: false };
    const markerSource: any = await optionalClientText(paths.marker);
    if (markerSource === null || !markerSource.trim())
        return { path: paths.config, backup: null, changed: false };
    const marker: any = clientObject(markerSource, 'Ownership marker'), document: any = clientObject(source);
    let changed: any = false;
    if (paths.info.client === 'qwen') {
        const managed: any = marker.managed_models ?? (marker.managed_model ? [marker.managed_model] : null);
        if (!(Array as any).isArray(managed))
            throw clientFailure('Invalid ownership marker');
        const models: any = qwenModels(document);
        document.modelProviders.openai = (models.filter as any)((model?: any): boolean => !managed.some((old?: any): boolean => sameClientValue(old, model)));
        (changed as any) = models.length !== document.modelProviders.openai.length;
    }
    else {
        if (!(Object as any).hasOwn(marker, 'managed_provider'))
            throw clientFailure('Invalid ownership marker');
        const providers: any = document.provider;
        if (providers && sameClientValue((providers as any)['link-assistant'], marker.managed_provider)) {
            if (marker.had_previous_provider) {
                if (!(Object as any).hasOwn(marker, 'previous_provider'))
                    throw clientFailure('Invalid ownership marker');
                (providers as any)['link-assistant'] = marker.previous_provider;
            }
            else
                delete (providers as any)['link-assistant'];
            (changed as any) = true;
        }
    }
    const result: any = changed ? await writeClientFile(paths.config, source, renderClientJSON(document)) : { path: paths.config, backup: null, changed: false };
    if (changed)
        await (onWrite as any)(paths.config);
    await removeClientFile(paths.marker);
    await (onWrite as any)(paths.marker);
    return result;
}
