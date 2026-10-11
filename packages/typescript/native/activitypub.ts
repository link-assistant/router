// GENERATED JavaScript -> structured syntax AST -> TypeScript draft.
// Meta sha256=c4fe09894f59b72a5c39182c38d8a785d7fe9c8c886a0ac63c5324aa6c0126bf; dynamic any annotations are explicit draft gaps.
const ROOT: string = '/api/services/activitypub';
const context: any = ['https://www.w3.org/ns/activitystreams', 'https://forgefed.org/ns', { 'fep': 'https://w3id.org/fep/ef61#', aliases: 'fep:aliases' }];
export const defaultActivityPublicKey: string = '-----BEGIN PUBLIC KEY-----\nMCowBQYDK2VwAyEA0000000000000000000000000000000000000000000=\n-----END PUBLIC KEY-----';
export function activityDocument(path?: any, config: any = {}): any {
    const base: any = ((config.activitypub_actor_base_url ?? `http://${config.host ?? '127.0.0.1'}:${config.port ?? 3000}`).replace as any)(/\/+$/, '');
    const actor: string = `${base}${ROOT}/actor/code`;
    if (path === `${ROOT}/actor/code`)
        return { '@context': context, id: actor, type: 'Service', preferredUsername: 'code', name: 'Link Assistant Code Router', summary: 'ActivityPub and ForgeFed service actor for coding problem federation', inbox: `${base}${ROOT}/inbox/code`, outbox: `${base}${ROOT}/outbox/code`, followers: `${base}${ROOT}/actors/code/followers`, aliases: ['urn:link-assistant:router:code', actor], publicKey: { id: `${actor}#main-key`, owner: actor, publicKeyPem: config.activitypub_public_key_pem ?? defaultActivityPublicKey } };
    if ([`${ROOT}/outbox/code`, `${ROOT}/actors/code/followers`].includes(path))
        return { '@context': context, id: base + path, type: 'OrderedCollection', totalItems: 0, orderedItems: [] };
    if (path === `${ROOT}/activities/follow-problemsets-code-001`)
        return { '@context': context, id: base + path, type: 'Follow', actor, object: 'https://problemsets.lefine.pro/actor/code', to: ['https://problemsets.lefine.pro/actor/code'] };
}
export async function activityResponse(request?: any, config?: any, readJSON?: any): Promise<any> {
    const path: string = new (URL as any)(request.url).pathname;
    const reply: any = (value?: any, status: any = 200): any => new (Response as any)((JSON as any).stringify(value), { status, headers: { 'content-type': 'application/activity+json', accept: 'application/activity+json' } });
    if (request.method === 'GET') {
        const document: any = activityDocument(path, config);
        if (document)
            return reply(document);
    }
    if (request.method === 'POST' && path === `${ROOT}/inbox/code`) {
        const body: any = await (readJSON as any)(request);
        let message: any;
        for (const field of ['id', 'type'] as any)
            if (typeof body?.[field] !== 'string' || !(body as any)[field].trim()) {
                (message as any) = `activity ${field} is required`;
                break;
            }
        if (!message && typeof body?.actor !== 'string' && typeof body?.attributedTo !== 'string')
            (message as any) = 'activity must include actor or attributedTo';
        if (message)
            return new (Response as any)((JSON as any).stringify({ error: 'invalid_activity', message }), { status: 400, headers: { 'content-type': 'application/json' } });
        return reply({ '@context': context, type: 'Accept', object: body }, 202);
    }
}
