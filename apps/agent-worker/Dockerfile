FROM node:20-slim AS build
WORKDIR /repo

# npm workspaces need the whole monorepo's package.json files to resolve
# the workspace graph, even though this image only ships agent-worker.
COPY package.json package-lock.json ./
COPY apps/agent-worker/package.json apps/agent-worker/package.json
RUN npm install --workspace=apps/agent-worker --no-audit --no-fund

COPY apps/agent-worker apps/agent-worker
COPY docs/routine-prompt.md docs/routine-prompt.md
RUN npm run build --workspace=apps/agent-worker

FROM node:20-slim
WORKDIR /repo
COPY --from=build /repo/node_modules node_modules
COPY --from=build /repo/apps/agent-worker/dist apps/agent-worker/dist
COPY --from=build /repo/apps/agent-worker/package.json apps/agent-worker/package.json
COPY --from=build /repo/docs/routine-prompt.md docs/routine-prompt.md

WORKDIR /repo/apps/agent-worker
CMD ["node", "dist/index.js"]
