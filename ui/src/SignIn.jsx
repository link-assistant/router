import { useState } from 'react'
import { Alert, Box, Button, Field, Heading, Input, Stack, Text } from '@chakra-ui/react'
import { api, storeTokenVerified } from './api.js'

/** Sign-in for an already-claimed or environment-provisioned router. */
export default function SignIn({ onSignedIn, provisionedByEnvironment }) {
  const [token, setToken] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')

  async function submit(event) {
    event.preventDefault()
    setBusy(true)
    setError('')
    try {
      // Any admin-only endpoint proves the credential; summary is the cheapest.
      await api.summary(token)
      storeTokenVerified(token)
      onSignedIn(token)
    } catch (e) {
      setError(e.status === 401 ? 'That token was rejected.' : e.message)
    } finally {
      setBusy(false)
    }
  }

  return (
    <Box maxW="560px" mx="auto" mt="16" p="6" borderWidth="1px" borderRadius="lg">
      <form onSubmit={submit}>
        <Stack gap="4">
          <Heading size="lg">Admin sign-in</Heading>
          <Text color="fg.muted">
            {provisionedByEnvironment
              ? 'This router uses the admin credential provisioned at deploy time (TOKEN_ADMIN_KEY).'
              : 'This router has already been claimed. Present the admin token.'}
          </Text>
          {error ? (
            <Alert.Root status="error">
              <Alert.Indicator />
              <Alert.Content>
                <Alert.Description>{error}</Alert.Description>
              </Alert.Content>
            </Alert.Root>
          ) : null}
          <Field.Root required>
            <Field.Label>Admin token</Field.Label>
            <Input
              type="password"
              value={token}
              autoComplete="off"
              onChange={(e) => setToken(e.target.value)}
              placeholder="la_sk_…"
            />
          </Field.Root>
          <Button type="submit" loading={busy} disabled={!token} alignSelf="flex-start">
            Sign in
          </Button>
        </Stack>
      </form>
    </Box>
  )
}
