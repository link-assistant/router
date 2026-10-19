#!/usr/bin/env python3
"""Reproduce the callback test's shared ephemeral-port assertion race.

The original assertion fails even though the listener-owning task has exited:
another listener can already own its released port. --check-task verifies the
replacement task-completion assertion against that same occupied-port case.
This is a local socket experiment, with no provider or network dependencies.
"""
import argparse
import asyncio
import socket


def listener(port=0):
    result = socket.socket()
    result.setsockopt(socket.SOL_SOCKET, socket.SO_REUSEADDR, 1)
    result.bind(('127.0.0.1', port))
    result.listen()
    return result


async def reproduce(check_task):
    original = listener()
    port = original.getsockname()[1]
    stop = asyncio.Event()

    async def serve():
        try:
            await stop.wait()
        finally:
            original.close()

    server = asyncio.create_task(serve())
    await asyncio.sleep(0)
    stop.set()
    await server
    # The port is a shared kernel resource, independent of the stopped task.
    with listener(port):
        if check_task:
            assert server.done() and server.exception() is None
            print('Callback server finished while another listener owns its port')
        else:
            with listener(port):
                pass


if __name__ == '__main__':
    parser = argparse.ArgumentParser(__doc__)
    parser.add_argument('--check-task', action='store_true')
    asyncio.run(reproduce(parser.parse_args().check_task))
