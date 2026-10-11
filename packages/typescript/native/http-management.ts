// GENERATED JavaScript -> structured syntax AST -> TypeScript draft.
// Meta sha256=3af5b39545ab42f28fa5f9b89e9ef89c20d1934402297444859e9338d12e6155; dynamic any annotations are explicit draft gaps.
import { ProtocolError } from "./protocols.js";
const invoke: any = async (target?: any, method?: any, ...args: any[]): Promise<any> => { if (typeof target?.[method] !== 'function')
    throw new (ProtocolError as any)('Management service is unavailable', 503); return ((target as any)[method] as any)(...args); };
export async function managementOperation(core?: any, request?: any, path?: any, body?: any): Promise<any> {
    const method: any = request.method;
    if (path === '/api/management/admin/status' && method === 'GET')
        return invoke(core.admin, 'status');
    if (path === '/api/management/admin/bootstrap' && method === 'POST')
        return invoke(core.admin, 'beginWithTtl', body?.ttl_hours);
    if (path === '/api/management/admin/bootstrap/confirm' && method === 'POST') {
        const token: any = (request.headers.get as any)('authorization')?.match(/^Bearer (.+)$/)?.[1];
        if (!token)
            throw new (ProtocolError as any)('Confirm must present the candidate token as a Bearer credential', 401);
        if (typeof body?.claim_id !== 'string' || !body.claim_id)
            throw new (ProtocolError as any)('claim_id is required');
        await invoke(core.admin, 'confirm', body.claim_id, token);
        return { claimed: true };
    }
    if (path === '/api/management/admin/rotate' && method === 'POST')
        return invoke(core.admin, 'rotate', (request.headers.get as any)('authorization')?.replace(/^Bearer /, ''), body?.ttl_hours);
    if (path === '/api/management/admin/summary' && method === 'GET')
        return invoke(core.admin, 'summary');
    if (path === '/api/management/auth/status' && method === 'GET')
        return invoke(core, 'credentialStatus');
    if (path === '/api/management/auth/diagnostics' && method === 'GET')
        return core.diagnostics && core.emergency ? { diagnostics: core.diagnostics.snapshot(), emergency_auth: core.emergency.status() } : invoke(core, 'authDiagnostics');
    if (path === '/api/management/health/subscriptions' && method === 'GET')
        return invoke(core, 'subscriptionHealth');
    if (path === '/api/management/emergency-auth' && method === 'GET')
        return invoke(core.emergency ?? core.emergencyAuth, 'status');
    if (path === '/api/management/emergency-auth/disable' && method === 'POST') {
        const emergency: any = core.emergency ?? core.emergencyAuth, was_active: any = await invoke(emergency, 'disable');
        return { disabled: true, was_active, status: await invoke(emergency, 'status') };
    }
    if (path === '/api/management/login' && method === 'POST') {
        const provider: any = (body?.provider ?? 'claude').trim().toLowerCase();
        if (!['claude', 'codex'].includes(provider))
            throw new (ProtocolError as any)('provider must be claude or codex');
        if (body?.mode && !['full', 'setup-token'].includes(body.mode))
            throw new (ProtocolError as any)('mode must be full or setup-token');
        return invoke(core.login, 'begin', { ...body, provider });
    }
    const login: any = /^\/api\/management\/login\/([^/]+)(?:\/(code))?$/.exec(path);
    if (login) {
        const id: string = decodeURIComponent((login as any)[1]);
        if ((login as any)[2] && method === 'POST') {
            if (typeof body?.code !== 'string' || !body.code.trim())
                throw new (ProtocolError as any)('code must not be empty');
            return invoke(core.login, 'submitCode', id, body.code);
        }
        if (!(login as any)[2] && method === 'GET') {
            const result: any = await invoke(core.login, 'status', id);
            if (!result)
                throw new (ProtocolError as any)('Login not found', 404);
            return result;
        }
        if (!(login as any)[2] && method === 'DELETE') {
            const result: any = await invoke(core.login, 'cancel', id);
            if (!result)
                throw new (ProtocolError as any)('Login not found', 404);
            return { cancelled: true };
        }
    }
    const definitions: any = /^\/api\/management\/routing\/model-definitions\/([^/]+)$/.exec(path);
    if (definitions && method === 'GET')
        return invoke(core, 'modelDefinitions', decodeURIComponent((definitions as any)[1]));
    if (path === '/api/management/server/latest-version' && method === 'GET')
        return invoke(core, 'latestVersion');
    return undefined;
}
