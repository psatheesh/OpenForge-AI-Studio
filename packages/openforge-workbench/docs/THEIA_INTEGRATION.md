# Eclipse Theia IDE integration

## Correct upstream foundation

Use the official open-source [Eclipse Theia IDE repository](https://github.com/eclipse-theia/theia-ide) as the **actual full IDE base**. It already provides Monaco-based editing, terminals, debug integration, search, source-control extension compatibility, tasks, extensions and browser/Electron targets. OpenForge adds a prompt-to-software development service and a Theia-facing UI. The complete upstream Theia source and build artifacts are NOT contained in this download.

## First usable integration: install OpenForge bridge

The included `theia-extension` directory is a VS Code extension API-compatible plugin source. It contributes command-palette entries, a status-bar launcher and preferences for the OpenForge server URL/path. Theia supports compatible VS Code plugins, with compatibility dependent on its bundled API implementation.

1. Clone `https://github.com/eclipse-theia/theia-ide` and follow its current [adopter guide](https://theia-ide.org/docs/blueprint_documentation/). Build/start the browser or Electron target per its supported Node/Yarn requirements.
2. Independently start the included OpenForge service (`node server.js`), then open its browser workbench directly to verify it.
3. To package the bridge, install a VS Code extension packaging tool (e.g. `@vscode/vsce`) in a connected development environment. Run `npx @vscode/vsce package` from `theia-extension`. The plugin is JavaScript and needs no TypeScript compilation. The generated VSIX can be added to the Theia plugins directory/extension manager where supported, after a compatibility check.
4. Use command palette: **OpenForge: Open Universal Prompt Builder** or click the OpenForge status-bar item.
5. Optionally set `openforge.serverPath` and run **OpenForge: Start Local Workbench**. Node.js must be installed on the machine running the Theia extension host.

## Native integration expansion (not yet implemented)

For complete integrated panel embedding, implement a Theia **native frontend/backend extension** in `theia-extensions/openforge`, based on the Theia IDE's currently installed release. Register an OpenForge ReactWidget/TreeWidget under a native view contribution, expose authenticated backend RPC and tasks with Theia's permission model, and configure the `applications/browser` and `applications/electron` packages to depend on it. Add actual AI workflows via the version-matched `@theia/ai-*` packages and registered agents. The exact interfaces change by Theia version; generate this layer against your selected upstream release instead of freezing undocumented APIs here.

Theia IDE's adopter guide documents its Electron installer packaging using `yarn electron package`; it generally creates packages for the host OS and requires OS-specific signing and CI for reproducible multi-platform releases.

## Native Theia AI Builder extension (new)

The `theia-ai-builder-extension/` directory now contains a native Theia AI `@OpenForgeBuilder` agent, three workspace tools and command-palette prompt import commands. This supersedes the previous note that only the browser-launcher plugin exists. See `theia-ai-builder-extension/README.md` for installation, model configuration, offline/online guidance and the precise unverified upstream integration steps. It is source code, not a compiled or installed Theia distribution.
