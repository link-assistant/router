// GENERATED JavaScript -> structured syntax AST -> TypeScript draft.
// Meta sha256=82a56beba2b7851c95f5938a3430a2f49422f1882757226613a3fb8dc3ce277b; dynamic any annotations are explicit draft gaps.
const fail: any = (message?: any): any => (Object as any).assign(new (Error as any)(message), { code: 'provider_import', exitCode: 2 });
const fields: any = new (Set as any)(['name', 'kind', 'base_url', 'default_model', 'models', 'supported_clients', 'api_key', 'api_key_env', 'encrypted_api_key', 'enabled', 'subscriber_id', 'acknowledge_intermediary_risk', 'acknowledge_unsupported_clients', 'if_absent']);
function record(input?: any): any {
    if (!input || typeof input !== 'object' || (Array as any).isArray(input) || typeof input.name !== 'string' || typeof input.base_url !== 'string')
        throw fail('Provider declarations require name and base_url strings');
    const result: any = { if_absent: false, ...(Object as any).fromEntries((Object as any).entries(input).filter(([key]: any): boolean => fields.has(key))) };
    for (const name of ['kind', 'default_model', 'api_key', 'api_key_env', 'encrypted_api_key', 'subscriber_id'] as any)
        if ((result as any)[name] != null && typeof (result as any)[name] !== 'string')
            throw fail(`${name} must be a string`);
    for (const name of ['models', 'supported_clients', 'acknowledge_unsupported_clients'] as any)
        if ((result as any)[name] != null && (!(Array as any).isArray((result as any)[name]) || (result as any)[name].some((value?: any): boolean => typeof value !== 'string')))
            throw fail(`${name} must contain strings`);
    for (const name of ['enabled', 'acknowledge_intermediary_risk', 'if_absent'] as any)
        if ((result as any)[name] != null && typeof (result as any)[name] !== 'boolean')
            throw fail(`${name} must be boolean`);
    if ((result.kind ?? '').toLowerCase() === 'lefine' && result.api_key)
        throw fail('Lefine import files cannot contain plaintext api_key material; use api_key_env or providers add --api-key-stdin');
    return result;
}
export function parseProviderImport(text?: any): any {
    if (typeof text !== 'string')
        throw fail('Provider import requires UTF-8 text');
    const trimmed: string = text.trimStart();
    let inputs: any;
    if (trimmed.startsWith('{') || trimmed.startsWith('[')) {
        const value: any = (JSON as any).parse(text);
        (inputs as any) = (Array as any).isArray(value) ? value : (Array as any).isArray(value?.providers) ? value.providers : [value];
    }
    else if (text.split(/\r?\n/).some((line?: any): boolean => line.startsWith('PROVIDER: '))) {
        (inputs as any) = text.split(/\r?\n/).map((line?: any): string => line.trim()).filter((line?: any): boolean => line.startsWith('PROVIDER: ')).map((line?: any): any => (JSON as any).parse(line.slice(10)));
    }
    else {
        (inputs as any) = [];
        let current: any;
        const aliases: any = { 'base-url': 'base_url', api_base: 'base_url', 'api-base': 'base_url', model: 'default_model', 'default-model': 'default_model', 'supported-clients': 'supported_clients', 'api-key': 'api_key', 'api-key-env': 'api_key_env', 'subscriber-id': 'subscriber_id', 'acknowledge-intermediary-risk': 'acknowledge_intermediary_risk', 'acknowledge-unsupported-clients': 'acknowledge_unsupported_clients' };
        for (const raw of text.split(/\r?\n/) as any) {
            if (!raw.trim() || raw.trimStart().startsWith('#'))
                continue;
            if (!/^[ \t]/.test(raw)) {
                (current as any) = { name: raw.trim(), kind: 'openai-compatible', base_url: '', models: [], supported_clients: [], enabled: true, if_absent: false };
                inputs.push(current);
                continue;
            }
            if (!current)
                throw fail('Indented provider field without provider name');
            const match: any = /^(\S+)\s+(.*)$/.exec(raw.trim());
            if (!match)
                throw fail('Provider field must be key value');
            const key: any = (aliases as any)[(match as any)[1]] ?? (match as any)[1];
            let value: any = (match as any)[2].trim();
            if (value.startsWith('"') && value.endsWith('"'))
                (value as any) = value.slice(1, -1);
            if (!fields.has(key) || ['name', 'encrypted_api_key', 'if_absent'].includes(key))
                throw fail(`Unknown provider field: ${(match as any)[1]}`);
            if (['models', 'supported_clients', 'acknowledge_unsupported_clients'].includes(key))
                (value as any) = value.split(',').map((value?: any): string => value.trim()).filter(Boolean);
            else if (['enabled', 'acknowledge_intermediary_risk'].includes(key))
                (value as any) = ['true', '1', 'yes'].includes(value);
            (current as any)[key] = value;
        }
        if (!inputs.length)
            throw fail('Provider import did not contain any providers');
    }
    return ((inputs as any).map as any)(record);
}
export function providerProvisionResponse(answer?: any): any {
    if (!answer || !['created', 'replaced', 'already_present'].includes(answer.outcome) || typeof answer.name !== 'string' || !['openai-compatible', 'lefine', 'zai-coding-plan'].includes(answer.kind) || typeof answer.base_url !== 'string')
        throw fail('Remote provider acceptance is unverified');
    for (const key of ['models', 'supported_clients', 'unsupported_clients'] as any)
        if (!(Array as any).isArray((answer as any)[key]) || (answer as any)[key].some((value?: any): boolean => typeof value !== 'string'))
            throw fail('Remote provider acceptance is unverified');
    for (const key of ['has_encrypted_api_key', 'enabled', 'intermediary_risk_acknowledged'] as any)
        if (typeof (answer as any)[key] !== 'boolean')
            throw fail('Remote provider acceptance is unverified');
    for (const key of ['default_model', 'api_key_env'] as any)
        if ((answer as any)[key] != null && typeof (answer as any)[key] !== 'string')
            throw fail('Remote provider acceptance is unverified');
    return (Object as any).fromEntries(['outcome', 'name', 'kind', 'base_url', 'models', 'supported_clients', 'has_encrypted_api_key', 'enabled', 'intermediary_risk_acknowledged', 'unsupported_clients', 'default_model', 'api_key_env'].filter((key?: any): boolean => (answer as any)[key] != null).map((key?: any): any => [key, (answer as any)[key]]));
}
