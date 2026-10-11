// GENERATED JavaScript -> structured syntax AST -> TypeScript draft.
// Meta sha256=ec69e2e59fa9c451b8f9a4eeefc8be4611e23551c6234481d82251fda776e378; dynamic any annotations are explicit draft gaps.
import TOML from '@iarna/toml';
import { clientPaths, optionalClientText, preferredClientPath, clientObject, readClientEnvironment, clientCommandExists, clientFailure } from "./client-files.js";
const modelKeys: Array<string> = ['ANTHROPIC_MODEL', 'ANTHROPIC_DEFAULT_OPUS_MODEL', 'ANTHROPIC_DEFAULT_SONNET_MODEL', 'ANTHROPIC_DEFAULT_HAIKU_MODEL', 'CLAUDE_CODE_SUBAGENT_MODEL'];
const claudePrecedence: Array<string> = ['ANTHROPIC_AUTH_TOKEN', 'ANTHROPIC_API_KEY', ...modelKeys, 'CLAUDE_CODE_ENABLE_GATEWAY_MODEL_DISCOVERY', 'CLAUDE_CODE_DISABLE_NONESSENTIAL_TRAFFIC'];
const strip: any = (value?: any): any => value?.replace(/\/+$/, '');
const text: any = (value?: any): null | string => typeof value === 'string' ? value : null;
const safeOrigin: any = (value?: any): null | string => { try {
    const url: any = new (URL as any)(value);
    return ['http:', 'https:'].includes(url.protocol) ? url.origin : null;
}
catch {
    return null;
} };
function publicDocument(client?: any, source?: any): any {
    if (client === 'codex') {
        try {
            return TOML.parse(source ?? '');
        }
        catch {
            throw clientFailure('Client configuration contains invalid TOML');
        }
    }
    return clientObject(source);
}
function publicBase(paths?: any, document?: any, environment?: any, env?: any): any {
    switch (paths.info.client) {
        case 'codex': {
            const provider: any = document.model_providers?.['link-assistant'];
            return document.model_provider === 'link-assistant' && provider?.wire_api === 'responses' && provider?.env_key === 'LINK_ASSISTANT_TOKEN' ? text(provider.base_url) : null;
        }
        case 'claude': return text(document.env?.ANTHROPIC_BASE_URL);
        case 'opencode':
        case 'agent': return text(document.provider?.['link-assistant']?.options?.baseURL);
        case 'qwen': return text((((Array as any).isArray(document.modelProviders?.openai) ? document.modelProviders.openai : []).find as any)((model?: any): boolean => model?.envKey === 'LINK_ASSISTANT_TOKEN')?.baseUrl);
        case 'gemini':
        case 'grok': return text((env as any)[paths.info.base]) ?? readClientEnvironment(environment, paths.info.base);
        default: return null;
    }
}
function claudeEntries(marker?: any): any {
    const env: any = marker?.gateway_env;
    if (!env || typeof env !== 'object' || (Array as any).isArray(env))
        return [];
    return (Object as any).entries(env).flatMap(([key, value]: any): any => value && (value.managed === null || value.managed === undefined || typeof value.managed === 'string') ? [{ key, managed_value: value.managed ?? null }] : []);
}
function validClaudeMarker(marker?: any, expected?: any): boolean {
    const entries: any = claudeEntries(marker), users: any = marker?.user_model_keys ?? [];
    if (!(Array as any).isArray(users) || users.some((key?: any): boolean => !modelKeys.includes(key)) || new (Set as any)(users).size !== users.length || typeof marker?.anthropic_base_url !== 'string')
        return false;
    const get: any = (key?: any): any => entries.find((entry?: any): boolean => entry.key === key), managed: any = (key?: any): any => get(key)?.managed_value ?? null;
    const fixed: boolean = [['CLAUDE_CODE_ENABLE_GATEWAY_MODEL_DISCOVERY', '1'], ['ANTHROPIC_AUTH_TOKEN', null], ['ANTHROPIC_API_KEY', null]].every(([key, value]: any): undefined | boolean => get(key) && managed(key) === value);
    const target: any = entries.find((entry?: any): boolean => ['ANTHROPIC_MODEL', 'CLAUDE_CODE_SUBAGENT_MODEL'].includes(entry.key))?.managed_value ?? null;
    return (!expected || marker.anthropic_base_url === expected) && fixed && (target === null || typeof target === 'string' && target.length > 0)
        && modelKeys.every((key?: any): boolean => Boolean(get(key)) !== users.includes(key))
        && ['ANTHROPIC_MODEL', 'CLAUDE_CODE_SUBAGENT_MODEL'].every((key?: any): boolean => users.includes(key) || managed(key) === target)
        && modelKeys.filter((key?: any): boolean => !['ANTHROPIC_MODEL', 'CLAUDE_CODE_SUBAGENT_MODEL'].includes(key)).every((key?: any): undefined | boolean => users.includes(key) || get(key) && managed(key) === null)
        && !get('CLAUDE_CODE_DISABLE_NONESSENTIAL_TRAFFIC');
}
export async function nativeClientStatus(name?: any, options: any = {}): Promise<any> {
    const paths: any = clientPaths(name, options), { info }: any = paths, ambientEnv: any = options.env ?? (process as any).env, env: any = options.home !== undefined ? {} : ambientEnv, conflicts: any = [];
    let source: any = null, document: any = {}, unreadable: any;
    try {
        (source as any) = await optionalClientText(paths.config);
        (document as any) = publicDocument(info.client, source);
    }
    catch (error: any) {
        (unreadable as any) = error.message;
        conflicts.push('public-config:invalid');
    }
    let environment: any = null, metadata: any = null, marker: any = null, environmentExists: any = false, metadataExists: any = false, markerExists: any = false;
    try {
        const path: any = await preferredClientPath(paths.environment, paths.legacyEnvironment);
        (environment as any) = await optionalClientText(path);
        (environmentExists as any) = environment !== null;
    }
    catch {
        (environmentExists as any) = true;
        conflicts.push('managed-environment:invalid');
    }
    try {
        const path: any = await preferredClientPath(paths.metadata, paths.legacyMetadata), value: any = await optionalClientText(path);
        (metadataExists as any) = value !== null;
        if (metadataExists)
            (metadata as any) = clientObject(value, 'Ownership metadata');
    }
    catch {
        (metadataExists as any) = true;
        conflicts.push('ownership-metadata:invalid');
    }
    if (paths.marker)
        try {
            const value: any = await optionalClientText(paths.marker);
            (markerExists as any) = value !== null;
            if (markerExists)
                (marker as any) = clientObject(value, 'Ownership marker');
        }
        catch {
            (markerExists as any) = true;
            conflicts.push('ownership-marker:invalid');
        }
    const metadataComplete: any = metadata && [info.client, info.legacy].includes((metadata as any).client) && typeof (metadata as any).router === 'string' && (metadata as any).router.length > 0 && ['minted', 'supplied'].includes((metadata as any).source);
    if (metadata && !metadataComplete)
        conflicts.push('ownership-metadata:invalid');
    const expected: any = (metadata as any)?.router ? strip((metadata as any).router) + info.suffix : null;
    const token: any = info.token ? readClientEnvironment(environment, info.token) : null, managedBase: any = info.base ? readClientEnvironment(environment, info.base) : null;
    const base: any = publicBase(paths, document, environment, env), ambient: any = info.base && typeof (env as any)[info.base] === 'string' && (env as any)[info.base] ? (env as any)[info.base] : null;
    let markerValid: any = !paths.marker;
    if (markerExists) {
        (markerValid as any) = info.client === 'codex' ? Boolean(marker) : info.client === 'claude' ? validClaudeMarker(marker, expected) : info.client === 'qwen' ? (Array as any).isArray((marker as any)?.managed_models) : (Object as any).hasOwn(marker ?? {}, 'managed_provider');
        if (!markerValid)
            conflicts.push('ownership-marker:invalid');
    }
    if (ambient && expected && strip(ambient) !== strip(expected))
        conflicts.push(`ambient:${info.base}`);
    if (info.token && (env as any)[info.token] && token !== null && (env as any)[info.token] !== token)
        conflicts.push(`ambient:${info.token}`);
    if (managedBase !== null && expected && strip(managedBase) !== strip(expected))
        conflicts.push(`managed-environment:${info.base}`);
    if (environmentExists && info.token && token === null)
        conflicts.push(`managed-environment:${info.token}`);
    if (info.client === 'codex') {
        if (expected && document.model_provider !== 'link-assistant')
            conflicts.push('public-config:model_provider');
        if (expected && document.model_providers?.['link-assistant']?.base_url !== expected)
            conflicts.push('public-config:model_providers.link-assistant.base_url');
        if ((Object as any).hasOwn(document, 'model_catalog_json'))
            conflicts.push('public-config:model_catalog_json');
    }
    else if (['opencode', 'agent'].includes(info.client)) {
        if (expected && document.provider?.['link-assistant']?.options?.baseURL !== expected)
            conflicts.push('public-config:provider.link-assistant.options.baseURL');
    }
    else if (info.client === 'qwen') {
        if (expected && !(((Array as any).isArray(document.modelProviders?.openai) ? document.modelProviders.openai : []).some as any)((model?: any): boolean => model?.envKey === 'LINK_ASSISTANT_TOKEN' && model?.baseUrl === expected))
            conflicts.push('public-config:modelProviders.openai');
    }
    else if (info.client === 'claude') {
        const entries: any = claudeEntries(marker), users: any = (Array as any).isArray((marker as any)?.user_model_keys) ? (marker as any).user_model_keys : [], publicEnv: any = document.env ?? {};
        if (expected && strip(publicEnv.ANTHROPIC_BASE_URL) !== strip(expected))
            conflicts.push('public-config:ANTHROPIC_BASE_URL');
        for (const key of ['ANTHROPIC_AUTH_TOKEN', 'ANTHROPIC_API_KEY'] as any)
            if ((Object as any).hasOwn(publicEnv, key))
                conflicts.push(`public-config:${key}`);
        for (const key of modelKeys as any) {
            const wanted: any = entries.find((entry?: any): boolean => entry.key === key)?.managed_value ?? null;
            if (!(users.includes as any)(key) && (text((publicEnv as any)[key]) ?? null) !== wanted)
                conflicts.push(`public-config:${key}`);
            if ((env as any)[key] && (env as any)[key] !== wanted)
                conflicts.push(`ambient:${key}`);
            if (readClientEnvironment(environment, key))
                conflicts.push(`managed-environment:${key}`);
        }
        const discovery: string = 'CLAUDE_CODE_ENABLE_GATEWAY_MODEL_DISCOVERY';
        if (readClientEnvironment(environment, discovery) !== '1')
            conflicts.push(`managed-environment:${discovery}`);
        if ((publicEnv as any)[discovery] !== '1' && source !== null)
            conflicts.push(`public-config:${discovery}`);
        if ((env as any)[discovery] && (env as any)[discovery] !== '1')
            conflicts.push(`ambient:${discovery}`);
        for (const key of ['ANTHROPIC_API_KEY', 'CLAUDE_CODE_DISABLE_NONESSENTIAL_TRAFFIC'] as any) {
            if ((env as any)[key])
                conflicts.push(`ambient:${key}`);
            if (readClientEnvironment(environment, key))
                conflicts.push(`managed-environment:${key}`);
        }
    }
    const complete: any = environmentExists && metadataComplete && token !== null && (['grok', 'gemini'].includes(info.client) || source !== null) && markerValid;
    const anyManaged: boolean = environmentExists || metadataExists || markerExists;
    const any: boolean = source !== null || base !== null || managedBase !== null || ambient !== null || anyManaged || info.client === 'claude' && claudePrecedence.some((key?: any): boolean => Boolean((env as any)[key]));
    const unique: Array<string> = [...new (Set as any)(conflicts)].sort();
    const state: string = unreadable || unique.some((key?: any): boolean => key.endsWith(':invalid')) || anyManaged && !complete ? 'ambiguous' : complete ? unique.length ? 'managed-drifted' : 'managed-intact' : any ? 'foreign' : 'unconfigured';
    const effective_source: any = ambient !== null ? 'ambient-environment' : base !== null ? 'public-config' : managedBase !== null ? 'managed-environment' : (metadata as any)?.router ? 'ownership-metadata' : null;
    return { client: info.client, installed: await clientCommandExists(info.client, ambientEnv), configured: state === 'managed-intact', config_path: paths.config, dialect: info.dialect,
        base_url: safeOrigin(ambient ?? base ?? managedBase ?? (metadata as any)?.router), token_env: info.token, token_env_set: Boolean(info.token && ((env as any)[info.token] || token !== null)), ownership_state: state,
        ...(effective_source ? { effective_source } : {}), conflicts: unique, ...(unreadable ? { unreadable } : {}), ...(info.unsupported ? { unsupported: info.unsupported } : {}) };
}
