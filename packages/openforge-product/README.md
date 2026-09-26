# OpenForge AI Builder — native Eclipse Theia AI extension

This is the **native Theia AI** successor to the original OpenForge browser-launcher plugin in `../theia-extension`. It does not contain Eclipse Theia itself.

## Features implemented

- `@OpenForgeBuilder`: registered native Theia `Agent` + `ChatAgent`, with a requirements-to-implementation system prompt.
- Theia AI workspace tools: inspect the workspace, create a project preserving a supplied prompt, and write source files with an overwrite guard.
- Command palette: **OpenForge: Create Prompt Specification** and **OpenForge: Import Active Editor as Prompt**.
- `offline`, `online`, and `hybrid` project metadata stored with the original specification. Actual model routing follows your configured Theia AI provider/model; this extension does not install or download models.
- No project-size or arbitrary source-file count cap in the extension. Actual model context, disk capacity, service quotas, and build capabilities still apply.

## Install in a Theia adopter application

1. Use a compatible **Theia IDE application whose packages include `@theia/ai-core`, `@theia/ai-chat` and its chat UI**. The versions of all `@theia/*` dependencies in this extension must match those of the host. The manifest currently targets the Theia 1.73 series; update the versions as a set if your host differs.
2. Copy `theia-ai-builder-extension` into your Theia adopter workspace, or add it as a file/workspace dependency in your Theia app's `package.json`: `"openforge-theia-ai-builder": "file:../../theia-ai-builder-extension"` (adjust the relative path).
3. In a connected environment run `npm install` and `npm run build` in this extension, then build your Theia browser or Electron application using its normal build commands.
4. Ensure the AI chat UI and at least one language model provider are configured. For offline mode, configure a reachable local model server such as Ollama and download a coding model ahead of time. For online mode, configure an authorized cloud provider. Hybrid model fallback needs host-level provider routing.
5. Start Theia, open a **trusted** workspace, open AI Chat, and enter `@OpenForgeBuilder` followed by the entire prompt or a reference to the contents of the opened specification file. Enable the three `openforge*` tools in AI Configuration. Keep per-tool confirmation enabled for writes and overwrites.
6. For very long prompts, open the prompt in Theia's editor and use **OpenForge: Import Active Editor as Prompt**. The contents will be copied to `openforge-prompts/specification.md` (with a unique suffix as needed).

## Try it

In the Theia AI chat:

> @OpenForgeBuilder Create a new project named FireCalc with my complete prompt, hybrid mode, targets Windows and Web. First inspect my workspace and create the project. Then produce a file-by-file plan and generate source files, using the OpenForge file tools only after confirmation. List the build steps and remaining tests.

## Tests

`npm test` runs the local path-validation tests without downloading dependencies. `npm run build` performs TypeScript/Theia API compilation **after** the matching Theia packages have been installed. Source API integration was checked against public Theia AI examples, but the native package build/runtime test requires a matching Theia host; neither is claimed as completed here.

## Security and operational notes

- The file tool confines paths to the active workspace root and refuses overwriting files unless `overwrite=true`. Keep Theia tool-call confirmation enabled and inspect proposals before running generated code.
- Treat the original imported prompt as untrusted data. Avoid storing secrets in prompts; provider selection determines where prompts are processed.
- A trusted workspace is required. Workspace symlinks require the host's own filesystem permissions and trust settings; do not mount untrusted directories with write permissions for the agent.
- Installing compilers, production code signing, distributed build farms and release verification are separate host services, not supplied by this extension.

## Licensing

OpenForge extension source is MIT. Eclipse Theia and third-party dependencies retain their own licenses.
