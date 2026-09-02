// Admin API client and token storage.
//
// The admin credential lives in `localStorage`. That is the pragmatic choice
// for a self-hosted single-operator tool, but it is readable by any script on
// this origin — which is why the admin port is disabled by default and never
// shared with the proxy port.

export const TOKEN_KEY = 'la_router_admin_token'

export function loadToken() {
  try {
    return window.localStorage.getItem(TOKEN_KEY) || ''
  } catch {
    return ''
  }
}

/**
 * Store the token and read it back.
 *
 * Returns true only when the value survived the round trip. The bootstrap
 * confirm must not run otherwise: an unconfirmed mint leaves the system
 * unclaimed and recoverable, while confirming a token we cannot recall would
 * brick the deployment.
 */
export function storeTokenVerified(token) {
  try {
    window.localStorage.setItem(TOKEN_KEY, token)
    return window.localStorage.getItem(TOKEN_KEY) === token
  } catch {
    return false
  }
}

export function clearToken() {
  try {
    window.localStorage.removeItem(TOKEN_KEY)
  } catch {
    /* storage blocked; nothing to clear */
  }
}

async function request(path, { method = 'GET', body, token } = {}) {
  const headers = {}
  if (body !== undefined) headers['content-type'] = 'application/json'
  if (token) headers.authorization = `Bearer ${token}`
  const response = await fetch(path, {
    method,
    headers,
    body: body === undefined ? undefined : JSON.stringify(body),
  })
  const text = await response.text()
  let payload = null
  if (text) {
    try {
      payload = JSON.parse(text)
    } catch {
      payload = { raw: text }
    }
  }
  if (!response.ok) {
    const message = payload?.error?.message || payload?.raw || response.statusText
    const error = new Error(message)
    error.status = response.status
    error.payload = payload
    throw error
  }
  return payload
}

export const api = {
  status: () => request('/api/management/admin/status'),
  bootstrap: () => request('/api/management/admin/bootstrap', { method: 'POST' }),
  confirm: (claimId, token) =>
    request('/api/management/admin/bootstrap/confirm', {
      method: 'POST',
      body: { claim_id: claimId },
      token,
    }),
  rotate: (token) => request('/api/management/admin/rotate', { method: 'POST', token }),
  summary: (token) => request('/api/management/admin/summary', { token }),
  usage: (token) => request('/api/management/usage', { token }),
  accounts: (token) => request('/api/management/accounts', { token }),
  listTokens: (token) => request('/api/management/tokens', { token }),
  issueToken: (token, body) =>
    request('/api/management/tokens', { method: 'POST', body, token }),
  revokeToken: (token, id) =>
    request('/api/management/tokens/revoke', { method: 'POST', body: { id }, token }),
  // Reissues one client token. Omitted constraints are preserved server-side.
  rotateClientToken: (token, body) =>
    request('/api/management/tokens/rotate-client', { method: 'POST', body, token }),
}
