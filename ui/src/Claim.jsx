import { useState } from 'react'
import { Alert, Box, Button, Code, Heading, Stack, Text } from '@chakra-ui/react'
import { api, storeTokenVerified } from './api.js'

/**
 * First-visitor admin claim — the client half of the two-phase protocol.
 *
 * Mint, store, read back, and only then confirm. If storage is blocked the
 * token is shown for manual copying and no confirm is sent, so bootstrap stays
 * open and the deployment stays recoverable.
 */
export default function Claim({ onClaimed }) {
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const [manualToken, setManualToken] = useState('')

  async function claim() {
    setBusy(true)
    setError('')
    setManualToken('')
    try {
      const minted = await api.bootstrap()
      if (!storeTokenVerified(minted.token)) {
        // Do NOT confirm: we cannot prove we hold the token.
        setManualToken(minted.token)
        setError(
          'This browser refused to store the token, so the claim was not confirmed. ' +
            'Copy the token below and paste it on the sign-in screen; bootstrap stays open until then.',
        )
        return
      }
      await api.confirm(minted.claim_id, minted.token)
      onClaimed(minted.token)
    } catch (e) {
      setError(e.message)
    } finally {
      setBusy(false)
    }
  }

  return (
    <Box maxW="640px" mx="auto" mt="16" p="6" borderWidth="1px" borderRadius="lg">
      <Stack gap="4">
        <Heading size="lg">Claim this router</Heading>
        <Text color="fg.muted">
          No admin credential is configured yet. The first visitor who successfully stores the
          admin token becomes the administrator; everyone after that is asked for a token.
        </Text>
        {error ? (
          <Alert.Root status={manualToken ? 'warning' : 'error'}>
            <Alert.Indicator />
            <Alert.Content>
              <Alert.Description>{error}</Alert.Description>
            </Alert.Content>
          </Alert.Root>
        ) : null}
        {manualToken ? (
          <Code p="3" whiteSpace="pre-wrap" wordBreak="break-all">
            {manualToken}
          </Code>
        ) : null}
        <Button onClick={claim} loading={busy} alignSelf="flex-start">
          Claim admin
        </Button>
        <Text fontSize="sm" color="fg.muted">
          The token is kept in this browser&apos;s localStorage, which any script on this origin can
          read. Keep the admin port bound to loopback and unshared with the proxy port.
        </Text>
      </Stack>
    </Box>
  )
}
