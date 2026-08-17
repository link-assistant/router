import { useCallback, useEffect, useState } from 'react'
import {
  Alert,
  Badge,
  Box,
  Button,
  Code,
  Dialog,
  Field,
  Heading,
  Input,
  Portal,
  Stack,
  Table,
  Text,
} from '@chakra-ui/react'
import { api } from './api.js'

// Every constraint the token API supports is editable here, so the web surface
// is not weaker than the CLI or the chat commands (issue #194).
const EMPTY_FORM = {
  label: '',
  ttl_hours: '24',
  max_requests: '',
  max_tokens: '',
  rate_limit_per_minute: '',
  account: '',
}

// `issued_at` / `expires_at` are JWT `iat` / `exp`: unix seconds.
function formatTimestamp(seconds) {
  if (!seconds) return '—'
  const date = new Date(Number(seconds) * 1000)
  return Number.isNaN(date.getTime()) ? String(seconds) : date.toLocaleString()
}

function usage(record) {
  const used = record.used_requests ?? 0
  return record.max_requests ? `${used} / ${record.max_requests}` : `${used} / ∞`
}

function spend(record) {
  const used = record.used_tokens ?? 0
  const total = record.max_tokens ? `${used} / ${record.max_tokens}` : `${used} / ∞`
  // Reserved budget is shown separately so an administrator can tell committed
  // spend from spend that is merely held for requests still in flight.
  return record.reserved_tokens ? `${total} (+${record.reserved_tokens} held)` : total
}

/** Lifecycle state, matching what the CLI and chat surfaces report. */
function state(record) {
  if (record.revoked) return { label: 'revoked', palette: 'red' }
  if (record.expires_at && Number(record.expires_at) * 1000 <= Date.now()) {
    return { label: 'expired', palette: 'orange' }
  }
  return { label: 'active', palette: 'green' }
}

/** Numeric form fields are sent only when filled, so blank means "unlimited". */
function constraintsFrom(form) {
  const body = {}
  for (const field of ['max_requests', 'max_tokens', 'rate_limit_per_minute']) {
    if (form[field]) body[field] = Number(form[field])
  }
  if (form.account) body.account = form.account
  return body
}

/** Token list, issuance, and revocation. */
export default function Tokens({ token }) {
  const [records, setRecords] = useState([])
  const [error, setError] = useState('')
  const [form, setForm] = useState(EMPTY_FORM)
  const [issued, setIssued] = useState('')
  const [busy, setBusy] = useState(false)
  const [pendingRevoke, setPendingRevoke] = useState(null)
  const [pendingRotate, setPendingRotate] = useState(null)

  const refresh = useCallback(async () => {
    try {
      const response = await api.listTokens(token)
      setRecords(response?.data ?? [])
      setError('')
    } catch (e) {
      setError(e.message)
    }
  }, [token])

  useEffect(() => {
    refresh()
  }, [refresh])

  async function issue(event) {
    event.preventDefault()
    setBusy(true)
    try {
      const body = {
        label: form.label,
        ttl_hours: Number(form.ttl_hours) || 24,
        ...constraintsFrom(form),
      }
      const response = await api.issueToken(token, body)
      // Shown once, here, and never re-displayed: the list keeps records only.
      setIssued(response.token)
      setForm(EMPTY_FORM)
      await refresh()
    } catch (e) {
      setError(e.message)
    } finally {
      setBusy(false)
    }
  }

  async function revoke() {
    const target = pendingRevoke
    setPendingRevoke(null)
    if (!target) return
    try {
      await api.revokeToken(token, target.id)
      await refresh()
    } catch (e) {
      setError(e.message)
    }
  }

  // Rotation keeps every stored constraint; the server revokes the old value
  // as part of the same call, so there is no window with two live tokens.
  async function rotate() {
    const target = pendingRotate
    setPendingRotate(null)
    if (!target) return
    try {
      const response = await api.rotateClientToken(token, { id: target.id })
      setIssued(response.token)
      await refresh()
    } catch (e) {
      setError(e.message)
    }
  }

  return (
    <Stack gap="6">
      {error ? (
        <Alert.Root status="error">
          <Alert.Indicator />
          <Alert.Content>
            <Alert.Description>{error}</Alert.Description>
          </Alert.Content>
        </Alert.Root>
      ) : null}

      <Box borderWidth="1px" borderRadius="lg" p="5">
        <Heading size="md" mb="4">
          Issue a token
        </Heading>
        <form onSubmit={issue}>
          <Stack direction={{ base: 'column', md: 'row' }} gap="4" align="flex-end">
            <Field.Root>
              <Field.Label>Label</Field.Label>
              <Input
                value={form.label}
                onChange={(e) => setForm({ ...form, label: e.target.value })}
                placeholder="ci-runner"
              />
            </Field.Root>
            <Field.Root>
              <Field.Label>TTL (hours)</Field.Label>
              <Input
                value={form.ttl_hours}
                onChange={(e) => setForm({ ...form, ttl_hours: e.target.value })}
                inputMode="numeric"
              />
            </Field.Root>
            <Field.Root>
              <Field.Label>Request cap</Field.Label>
              <Input
                value={form.max_requests}
                onChange={(e) => setForm({ ...form, max_requests: e.target.value })}
                placeholder="unlimited"
                inputMode="numeric"
              />
            </Field.Root>
            <Field.Root>
              <Field.Label>Token cap</Field.Label>
              <Input
                value={form.max_tokens}
                onChange={(e) => setForm({ ...form, max_tokens: e.target.value })}
                placeholder="unlimited"
                inputMode="numeric"
              />
            </Field.Root>
            <Field.Root>
              <Field.Label>Requests / minute</Field.Label>
              <Input
                value={form.rate_limit_per_minute}
                onChange={(e) => setForm({ ...form, rate_limit_per_minute: e.target.value })}
                placeholder="unlimited"
                inputMode="numeric"
              />
            </Field.Root>
            <Field.Root>
              <Field.Label>Account pin</Field.Label>
              <Input
                value={form.account}
                onChange={(e) => setForm({ ...form, account: e.target.value })}
                placeholder="any"
              />
            </Field.Root>
            <Button type="submit" loading={busy}>
              Issue
            </Button>
          </Stack>
        </form>
        {issued ? (
          <Alert.Root status="success" mt="4">
            <Alert.Indicator />
            <Alert.Content>
              <Alert.Title>Copy this token now — it is shown only once.</Alert.Title>
              <Alert.Description>
                <Code mt="2" p="2" whiteSpace="pre-wrap" wordBreak="break-all">
                  {issued}
                </Code>
              </Alert.Description>
            </Alert.Content>
          </Alert.Root>
        ) : null}
      </Box>

      <Box borderWidth="1px" borderRadius="lg" p="5">
        <Heading size="md" mb="4">
          Issued tokens
        </Heading>
        {records.length === 0 ? (
          <Text color="fg.muted">No tokens issued yet.</Text>
        ) : (
          <Table.Root size="sm" variant="outline">
            <Table.Header>
              <Table.Row>
                <Table.ColumnHeader>ID</Table.ColumnHeader>
                <Table.ColumnHeader>Label</Table.ColumnHeader>
                <Table.ColumnHeader>Issued</Table.ColumnHeader>
                <Table.ColumnHeader>Expires</Table.ColumnHeader>
                <Table.ColumnHeader>Requests</Table.ColumnHeader>
                <Table.ColumnHeader>Tokens</Table.ColumnHeader>
                <Table.ColumnHeader>Req/min</Table.ColumnHeader>
                <Table.ColumnHeader>Account</Table.ColumnHeader>
                <Table.ColumnHeader>State</Table.ColumnHeader>
                <Table.ColumnHeader />
              </Table.Row>
            </Table.Header>
            <Table.Body>
              {records.map((record) => (
                <Table.Row key={record.id}>
                  <Table.Cell fontFamily="mono">{record.id}</Table.Cell>
                  <Table.Cell>{record.label || '—'}</Table.Cell>
                  <Table.Cell>{formatTimestamp(record.issued_at)}</Table.Cell>
                  <Table.Cell>{formatTimestamp(record.expires_at)}</Table.Cell>
                  <Table.Cell>{usage(record)}</Table.Cell>
                  <Table.Cell>{spend(record)}</Table.Cell>
                  <Table.Cell>{record.rate_limit_per_minute ?? '∞'}</Table.Cell>
                  <Table.Cell>{record.account || 'any'}</Table.Cell>
                  <Table.Cell>
                    <Badge colorPalette={state(record).palette}>{state(record).label}</Badge>
                  </Table.Cell>
                  <Table.Cell>
                    <Stack direction="row" gap="2">
                      <Button
                        size="xs"
                        variant="outline"
                        disabled={record.revoked || record.scope === 'admin'}
                        onClick={() => setPendingRotate(record)}
                      >
                        Rotate
                      </Button>
                      <Button
                        size="xs"
                        variant="outline"
                        colorPalette="red"
                        disabled={record.revoked}
                        onClick={() => setPendingRevoke(record)}
                      >
                        Revoke
                      </Button>
                    </Stack>
                  </Table.Cell>
                </Table.Row>
              ))}
            </Table.Body>
          </Table.Root>
        )}
      </Box>

      <Dialog.Root open={Boolean(pendingRotate)} onOpenChange={() => setPendingRotate(null)}>
        <Portal>
          <Dialog.Backdrop />
          <Dialog.Positioner>
            <Dialog.Content>
              <Dialog.Header>
                <Dialog.Title>Rotate token</Dialog.Title>
              </Dialog.Header>
              <Dialog.Body>
                <Text>
                  Issue a replacement for <Code>{pendingRotate?.id}</Code>
                  {pendingRotate?.label ? ` (${pendingRotate.label})` : ''}? Its limits are kept and
                  the current value is revoked immediately, so anything still using it will start
                  failing.
                </Text>
              </Dialog.Body>
              <Dialog.Footer>
                <Button variant="outline" onClick={() => setPendingRotate(null)}>
                  Cancel
                </Button>
                <Button onClick={rotate}>Rotate</Button>
              </Dialog.Footer>
            </Dialog.Content>
          </Dialog.Positioner>
        </Portal>
      </Dialog.Root>

      <Dialog.Root open={Boolean(pendingRevoke)} onOpenChange={() => setPendingRevoke(null)}>
        <Portal>
          <Dialog.Backdrop />
          <Dialog.Positioner>
            <Dialog.Content>
              <Dialog.Header>
                <Dialog.Title>Revoke token</Dialog.Title>
              </Dialog.Header>
              <Dialog.Body>
                <Text>
                  Revoke <Code>{pendingRevoke?.id}</Code>
                  {pendingRevoke?.label ? ` (${pendingRevoke.label})` : ''}? Requests presenting it
                  will be rejected immediately. This cannot be undone.
                </Text>
              </Dialog.Body>
              <Dialog.Footer>
                <Button variant="outline" onClick={() => setPendingRevoke(null)}>
                  Cancel
                </Button>
                <Button colorPalette="red" onClick={revoke}>
                  Revoke
                </Button>
              </Dialog.Footer>
            </Dialog.Content>
          </Dialog.Positioner>
        </Portal>
      </Dialog.Root>
    </Stack>
  )
}
