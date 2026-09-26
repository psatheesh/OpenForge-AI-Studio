/** Command-palette entrypoints to author or import long prompts without chat textbox truncation. */
import { inject, injectable } from '@theia/core/shared/inversify';
import { Command, CommandContribution, CommandRegistry, MessageService } from '@theia/core';
import { WorkspaceService } from '@theia/workspace/lib/browser';
import { FileService } from '@theia/filesystem/lib/browser/file-service';
import { EditorManager } from '@theia/editor/lib/browser';
import { BinaryBuffer } from '@theia/core/lib/common/buffer';
import URI from '@theia/core/lib/common/uri';

export const NEW_PROMPT: Command = {id: 'openforge.ai.newPrompt', label: 'OpenForge: Create Prompt Specification'};
export const IMPORT_PROMPT: Command = {id: 'openforge.ai.importPrompt', label: 'OpenForge: Import Active Editor as Prompt'};

@injectable()
export class OpenForgePromptCommands implements CommandContribution {
    @inject(WorkspaceService) protected readonly workspaces!: WorkspaceService;
    @inject(EditorManager) protected readonly editors!: EditorManager;
    @inject(FileService) protected readonly files!: FileService;
    @inject(MessageService) protected readonly messages!: MessageService;

    registerCommands(commands: CommandRegistry): void {
        commands.registerCommand(NEW_PROMPT, {execute: () => this.newPrompt()});
        commands.registerCommand(IMPORT_PROMPT, {execute: () => this.importPrompt()});
    }
    private async promptDestination(): Promise<URI> {
        const roots = await this.workspaces.roots;
        if (!roots.length) throw new Error('Open a workspace folder first.');
        const root = new URI(roots[0].resource.toString());
        const folder = root.resolve('openforge-prompts');
        await this.files.createFolder(folder);
        let name = 'specification.md';
        let index = 1;
        while (await this.files.exists(folder.resolve(name))) name = `specification-${index++}.md`;
        return folder.resolve(name);
    }
    private async newPrompt(): Promise<void> {
        try {
            const destination = await this.promptDestination();
            await this.files.createFile(destination, BinaryBuffer.fromString(
                '# OpenForge software specification\n\nPaste your complete AI-generated software prompt below.\n\n## Requirements\n\n## Target platforms\n\n## Acceptance tests\n'));
            await this.editors.open(destination);
            this.messages.info('Prompt created. Paste your specification and use @OpenForgeBuilder in AI Chat.');
        } catch (e) {this.messages.error(String(e));}
    }
    private async importPrompt(): Promise<void> {
        try {
            const content = this.editors.currentEditor?.editor.document.getText();
            if (!content?.trim()) throw new Error('Open an editor containing your complete prompt first.');
            const destination = await this.promptDestination();
            await this.files.createFile(destination, BinaryBuffer.fromString(content));
            await this.editors.open(destination);
            this.messages.info('Prompt preserved. Open AI Chat and invoke @OpenForgeBuilder.');
        } catch (e) {this.messages.error(String(e));}
    }
}
