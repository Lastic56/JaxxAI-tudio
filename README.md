# JAXX Agent OS

A desktop-first concept for a human-directed, local-first agent operating system. Built with React, Vite, and Electron.

## Run locally

- `npm install`
- `npm run dev` — starts Vite and opens the Electron desktop window
- `npm run build` — builds the UI
- `npm run dist` — packages the desktop app with electron-builder

## Product direction

The interface treats agents as a coordinated operating layer rather than a chat box: an intent composer turns outcomes into queued workflows; specialist agents expose live states; a cognitive-field visualization makes the network legible; and approvals keep consequential actions human-governed. Memory/context, trust and permissions, workflow orchestration, and local runtime health are first-class surfaces.

This initial build is an interactive UI prototype. Workflow execution and model/provider connections are not wired yet. Electron uses a context-isolated, sandboxed renderer with a deliberately minimal preload bridge.
