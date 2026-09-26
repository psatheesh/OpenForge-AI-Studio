/** Workspace-scoped file tools. Theia's AI configuration can require confirmation per invocation. */
import { inject, injectable } from '@theia/core/shared/inversify';
import { ToolProvider, ToolRequest, ToolInvocationContext } from '@theia/ai-core';
import { WorkspaceService } from '@theia/workspace/lib/browser';
import { FileService } from '@theia/filesystem/lib/browser/file-service';
import { BinaryBuffer } from '@theia/core/lib/common/buffer';
import URI from '@theia/core/lib/common/uri';
import { normalizeProjectName, safeRelativePath } from '../common/path-policy';

export const OPENFORGE_INSPECT_TOOL = 'openforgeInspectProject';
export const OPENFORGE_CREATE_PROJECT_TOOL = 'openforgeCreateProject';
export const OPENFORGE_WRITE_FILE_TOOL = 'openforgeWriteProjectFile';

@injectable()
abstract class OpenForgeWorkspaceTool {
    @inject(WorkspaceService) protected readonly workspaceService!: WorkspaceService;
    @inject(FileService) protected readonly fileService!: FileService;

    protected async workspaceRoot(): Promise<URI> {
        const roots = await this.workspaceService.roots;
        if (!roots.length) throw new Error('Open a trusted workspace folder first.');
        return new URI(roots[0].resource.toString());
    }

    protected async write(root: URI, relative: string, text: string, overwrite = false): Promise<string> {
        const safe = safeRelativePath(relative);
        const destination = root.resolve(safe);
        if (!destination.toString().startsWith(root.toString().replace(/\/$/, '') + '/')) {
            throw new Error('The proposed path is outside the workspace.');
        }
        if (!overwrite && await this.fileService.exists(destination)) {
            throw new Error(`File already exists: ${safe}. Set overwrite=true only after review.`);
        }
        const parent = destination.parent;
        await this.fileService.createFolder(parent);
        if (overwrite && await this.fileService.exists(destination)) {
            await this.fileService.writeFile(destination, BinaryBuffer.fromString(text));
        } else {
            await this.fileService.createFile(destination, BinaryBuffer.fromString(text));
        }
        return destination.toString();
    }

    protected result(action: () => Promise<unknown>, ctx?: ToolInvocationContext): Promise<string> {
        if (ctx?.cancellationToken?.isCancellationRequested) return Promise.resolve(JSON.stringify({ok: false, error: 'Cancelled'}));
        return action().then(value => JSON.stringify({ok: true, result: value}), error =>
            JSON.stringify({ok: false, error: error instanceof Error ? error.message : String(error)}));
    }
}

@injectable()
export class OpenForgeInspectTool extends OpenForgeWorkspaceTool implements ToolProvider {
    getTool(): ToolRequest {
        return {
            id: OPENFORGE_INSPECT_TOOL,
            name: OPENFORGE_INSPECT_TOOL,
            description: 'List the current workspace roots and top-level project files before generating code.',
            parameters: { type: 'object', properties: {} },
            handler: (_args: string, ctx?: ToolInvocationContext) => this.result(async () => {
                const root = await this.workspaceRoot();
                const stat = await this.fileService.resolve(root);
                return {root: root.toString(), entries: (stat.children || []).map(c => ({name: c.name, directory: c.isDirectory}))};
            }, ctx)
        };
    }
}

@injectable()
export class OpenForgeCreateProjectTool extends OpenForgeWorkspaceTool implements ToolProvider {
    getTool(): ToolRequest {
        return {
            id: OPENFORGE_CREATE_PROJECT_TOOL,
            name: OPENFORGE_CREATE_PROJECT_TOOL,
            description: 'Create a new project folder and preserve an imported AI prompt verbatim in REQUIREMENTS.md.',
            parameters: {
                type: 'object',
                properties: {
                    name: {type: 'string', description: 'New project name'},
                    prompt: {type: 'string', description: 'Full pasted software creation prompt'},
                    mode: {type: 'string', enum: ['offline', 'online', 'hybrid']},
                    targets: {type: 'array', items: {type: 'string'}}
                },
                required: ['name', 'prompt', 'mode', 'targets']
            },
            handler: (args: string, ctx?: ToolInvocationContext) => this.result(async () => {
                const input = JSON.parse(args) as {name: string; prompt: string; mode: string; targets: string[]};
                if (!input.prompt?.trim()) throw new Error('An original prompt is required.');
                if (!['offline', 'online', 'hybrid'].includes(input.mode)) throw new Error('Invalid development mode.');
                if (!Array.isArray(input.targets) || !input.targets.every(t => typeof t === 'string')) throw new Error('Invalid targets.');
                const name = normalizeProjectName(input.name);
                const root = await this.workspaceRoot();
                const directory = root.resolve(name);
                if (await this.fileService.exists(directory)) throw new Error('Project already exists; choose another name.');
                await this.fileService.createFolder(directory);
                const req = `# ${name} — Imported AI Specification\n\n${input.prompt}\n`;
                const metadata = JSON.stringify({name, developmentMode: input.mode, targets: input.targets, createdBy: 'OpenForgeBuilder'}, null, 2) + '\n';
                await this.write(root, `${name}/REQUIREMENTS.md`, req);
                await this.write(root, `${name}/openforge.project.json`, metadata);
                await this.write(root, `${name}/IMPLEMENTATION.md`, '# Implementation tracker\n\n- [ ] Analyze requirements\n- [ ] Implement source code\n- [ ] Write tests\n- [ ] Run builds and tests\n- [ ] Verify releases\n');
                return {project: directory.toString(), created: ['REQUIREMENTS.md', 'openforge.project.json', 'IMPLEMENTATION.md']};
            }, ctx)
        };
    }
}

@injectable()
export class OpenForgeWriteFileTool extends OpenForgeWorkspaceTool implements ToolProvider {
    getTool(): ToolRequest {
        return {
            id: OPENFORGE_WRITE_FILE_TOOL,
            name: OPENFORGE_WRITE_FILE_TOOL,
            description: 'Create a source file inside the active workspace. Overwriting existing files requires explicit overwrite=true.',
            parameters: {
                type: 'object',
                properties: {
                    path: {type: 'string', description: 'Relative path from workspace root, e.g. my-app/src/main.ts'},
                    content: {type: 'string', description: 'Exact UTF-8 source code'},
                    overwrite: {type: 'boolean', description: 'Set true only when explicitly approving an existing-file replacement'}
                },
                required: ['path', 'content']
            },
            handler: (args: string, ctx?: ToolInvocationContext) => this.result(async () => {
                const input = JSON.parse(args) as {path: string; content: string; overwrite?: boolean};
                if (typeof input.content !== 'string') throw new Error('Content must be a string.');
                return {path: await this.write(await this.workspaceRoot(), input.path, input.content, input.overwrite === true)};
            }, ctx)
        };
    }
}
