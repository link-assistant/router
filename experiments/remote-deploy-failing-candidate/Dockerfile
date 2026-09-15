ARG BASE_IMAGE=link-assistant-router:issue-579-e2e
FROM ${BASE_IMAGE}

# Keep liveness and the Router CLI available, but deliberately omit every
# catalog route. The remote deploy verifier must reject and remove this image
# without moving the live relay away from the previous backend.
ENTRYPOINT ["bun", "-e", "Bun.serve({port:8080,fetch(request){const path=new URL(request.url).pathname;return new Response(path==='/api/health'?'ok':'deliberately incomplete candidate',{status:path==='/api/health'?200:404});}});await new Promise(()=>{});"]
