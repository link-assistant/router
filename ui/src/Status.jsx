import { useEffect, useState } from 'react'
import { Badge, Box, Code, DataList, Heading, Stack, Table, Text } from '@chakra-ui/react'
import { api } from './api.js'

function Row({ label, value }) {
  return (
    <DataList.Item>
      <DataList.ItemLabel>{label}</DataList.ItemLabel>
      <DataList.ItemValue>{value ?? '—'}</DataList.ItemValue>
    </DataList.Item>
  )
}

/** Read-only status: credential state, account health, and usage counters. */
export default function Status({ token }) {
  const [summary, setSummary] = useState(null)
  const [usage, setUsage] = useState(null)
  const [accounts, setAccounts] = useState(null)
  const [error, setError] = useState('')

  useEffect(() => {
    let cancelled = false
    Promise.all([api.summary(token), api.usage(token), api.accounts(token)])
      .then(([s, u, a]) => {
        if (cancelled) return
        setSummary(s)
        setUsage(u)
        setAccounts(a)
      })
      .catch((e) => !cancelled && setError(e.message))
    return () => {
      cancelled = true
    }
  }, [token])

  if (error) return <Text color="red.500">{error}</Text>

  return (
    <Stack gap="6">
      <Box borderWidth="1px" borderRadius="lg" p="5">
        <Heading size="md" mb="4">
          Router
        </Heading>
        <DataList.Root orientation="horizontal">
          <Row label="Version" value={summary?.version} />
          <Row label="Upstream provider" value={summary?.upstream_provider} />
          <Row label="Upstream base URL" value={summary?.upstream_base_url} />
          <Row label="Accounts configured" value={summary?.accounts} />
          <Row
            label="Claude credential"
            value={summary?.claude_credential ? <Code>{summary.claude_credential}</Code> : 'not found'}
          />
          <Row
            label="Subscription credential"
            value={
              summary?.subscription
                ? `${summary.subscription.home} (${
                    summary.subscription.credential_found ? 'found' : 'missing'
                  })`
                : 'n/a'
            }
          />
          <Row label="Login API" value={summary?.login_api_enabled ? 'enabled' : 'disabled'} />
          <Row
            label="Admin credential"
            value={
              <Badge colorPalette={summary?.admin?.provisioned_by_environment ? 'blue' : 'green'}>
                {summary?.admin?.provisioned_by_environment ? 'provisioned by env' : 'claimed'}
              </Badge>
            }
          />
        </DataList.Root>
      </Box>

      <Box borderWidth="1px" borderRadius="lg" p="5">
        <Heading size="md" mb="4">
          Usage
        </Heading>
        <DataList.Root orientation="horizontal">
          {Object.entries(usage ?? {}).map(([key, value]) => (
            <Row key={key} label={key} value={typeof value === 'object' ? JSON.stringify(value) : String(value)} />
          ))}
        </DataList.Root>
      </Box>

      <Box borderWidth="1px" borderRadius="lg" p="5">
        <Heading size="md" mb="4">
          Accounts
        </Heading>
        {accounts?.accounts?.length ? (
          <Table.Root size="sm" variant="outline">
            <Table.Header>
              <Table.Row>
                {Object.keys(accounts.accounts[0]).map((key) => (
                  <Table.ColumnHeader key={key}>{key}</Table.ColumnHeader>
                ))}
              </Table.Row>
            </Table.Header>
            <Table.Body>
              {accounts.accounts.map((account, index) => (
                <Table.Row key={account.name ?? index}>
                  {Object.values(account).map((value, cell) => (
                    <Table.Cell key={cell}>
                      {typeof value === 'object' ? JSON.stringify(value) : String(value)}
                    </Table.Cell>
                  ))}
                </Table.Row>
              ))}
            </Table.Body>
          </Table.Root>
        ) : (
          <Text color="fg.muted">{accounts?.note ?? 'No accounts configured.'}</Text>
        )}
      </Box>
    </Stack>
  )
}
