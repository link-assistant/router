import { useEffect, useState } from 'react'
import {
  Alert,
  Box,
  Button,
  Code,
  Container,
  Dialog,
  Flex,
  Heading,
  Portal,
  Spinner,
  Stack,
  Tabs,
  Text,
} from '@chakra-ui/react'
import { api, clearToken, loadToken, storeTokenVerified } from './api.js'
import Claim from './Claim.jsx'
import SignIn from './SignIn.jsx'
import Status from './Status.jsx'
import Tokens from './Tokens.jsx'

export default function App() {
  const [status, setStatus] = useState(null)
  const [token, setToken] = useState(loadToken())
  const [error, setError] = useState('')
  const [rotated, setRotated] = useState('')
  const [rotating, setRotating] = useState(false)

  useEffect(() => {
    api.status().then(setStatus).catch((e) => setError(e.message))
  }, [])

  // A stored token that the server no longer accepts (rotated elsewhere,
  // state wiped) must not leave the UI stuck on a dead credential.
  useEffect(() => {
    if (!token) return
    api.summary(token).catch((e) => {
      if (e.status === 401) {
        clearToken()
        setToken('')
      }
    })
  }, [token])

  function signOut() {
    clearToken()
    setToken('')
  }

  async function rotate() {
    setRotating(true)
    try {
      const response = await api.rotate(token)
      storeTokenVerified(response.token)
      setToken(response.token)
      setRotated(response.token)
    } catch (e) {
      setError(e.message)
    } finally {
      setRotating(false)
    }
  }

  if (error && !status) {
    return (
      <Container maxW="4xl" py="10">
        <Alert.Root status="error">
          <Alert.Indicator />
          <Alert.Content>
            <Alert.Description>{error}</Alert.Description>
          </Alert.Content>
        </Alert.Root>
      </Container>
    )
  }

  if (!status) {
    return (
      <Flex minH="60vh" align="center" justify="center">
        <Spinner size="lg" />
      </Flex>
    )
  }

  if (!token) {
    return status.bootstrap_open ? (
      <Claim
        onClaimed={(claimed) => {
          setToken(claimed)
          api.status().then(setStatus).catch(() => {})
        }}
      />
    ) : (
      <SignIn
        onSignedIn={setToken}
        provisionedByEnvironment={status.provisioned_by_environment}
      />
    )
  }

  return (
    <Container maxW="6xl" py="8">
      <Stack gap="6">
        <Flex justify="space-between" align="center" wrap="wrap" gap="3">
          <Box>
            <Heading size="lg">Link.Assistant.Router</Heading>
            <Text color="fg.muted">Admin</Text>
          </Box>
          <Flex gap="3">
            <Button
              variant="outline"
              onClick={rotate}
              loading={rotating}
              disabled={status.provisioned_by_environment}
              title={
                status.provisioned_by_environment
                  ? 'The credential is provisioned by environment; rotate it at the deployment.'
                  : undefined
              }
            >
              Rotate admin credential
            </Button>
            <Button variant="subtle" onClick={signOut}>
              Sign out
            </Button>
          </Flex>
        </Flex>

        <Tabs.Root defaultValue="tokens" lazyMount unmountOnExit>
          <Tabs.List>
            <Tabs.Trigger value="tokens">Tokens</Tabs.Trigger>
            <Tabs.Trigger value="status">Status</Tabs.Trigger>
          </Tabs.List>
          <Tabs.Content value="tokens">
            <Tokens token={token} />
          </Tabs.Content>
          <Tabs.Content value="status">
            <Status token={token} />
          </Tabs.Content>
        </Tabs.Root>
      </Stack>

      <Dialog.Root open={Boolean(rotated)} onOpenChange={() => setRotated('')}>
        <Portal>
          <Dialog.Backdrop />
          <Dialog.Positioner>
            <Dialog.Content>
              <Dialog.Header>
                <Dialog.Title>New admin credential</Dialog.Title>
              </Dialog.Header>
              <Dialog.Body>
                <Text mb="3">
                  The previous credential is retired. This value is shown once — it is already
                  stored in this browser, but save it somewhere you can recover from.
                </Text>
                <Code p="2" whiteSpace="pre-wrap" wordBreak="break-all">
                  {rotated}
                </Code>
              </Dialog.Body>
              <Dialog.Footer>
                <Button onClick={() => setRotated('')}>Done</Button>
              </Dialog.Footer>
            </Dialog.Content>
          </Dialog.Positioner>
        </Portal>
      </Dialog.Root>
    </Container>
  )
}
