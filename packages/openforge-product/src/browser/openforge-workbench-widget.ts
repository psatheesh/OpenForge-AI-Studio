/** First-party product view: launches the bundled prompt-to-software workbench inside Theia. */
import { injectable, inject } from '@theia/core/shared/inversify';
import { ReactWidget, ApplicationShell } from '@theia/core/lib/browser';
import { Command, CommandContribution, CommandRegistry, MessageService } from '@theia/core';
import { WidgetManager } from '@theia/core/lib/browser/widget-manager';
import * as React from '@theia/core/shared/react';

const OPEN_BUILDER: Command = { id: 'openforge.builder.open', label: 'OpenForge: Open AI Software Builder' };
const OPEN_AGENT: Command = { id: 'openforge.ai.help', label: 'OpenForge: AI Agent Instructions' };

@injectable()
export class OpenForgeWorkbenchWidget extends ReactWidget {
  static readonly ID = 'openforge-ai-software-builder';
  constructor() {
    super();
    this.id = OpenForgeWorkbenchWidget.ID;
    this.title.label = 'AI Software Builder';
    this.title.caption = 'OpenForge Universal Prompt Builder';
    this.title.closable = true;
    this.title.iconClass = 'codicon codicon-hubot';
    this.addClass('openforge-workbench');
    this.update();
  }
  protected render(): React.ReactNode {
    // The sidecar is shipped inside THIS application distribution and starts with Theia.
    // Bind it to loopback; a hosted deployment must provide authentication/TLS independently.
    const target = 'http://127.0.0.1:4343';
    return React.createElement('div', {style: {display:'flex',flexDirection:'column',height:'100%',background:'#101b2b'}},
      React.createElement('div', {style:{padding:'9px 14px',color:'#dde7f5',fontSize:'12px'}},
        'OpenForge · Universal Prompt Builder · Local project workspace'),
      React.createElement('iframe', {title:'OpenForge AI Software Builder', src:target,
        sandbox:'allow-scripts allow-forms allow-downloads allow-same-origin',
        style:{width:'100%',height:'100%',border:'0',flex:'1',background:'#101b2b'}}));
  }
}

@injectable()
export class OpenForgeWorkbenchContribution implements CommandContribution {
  @inject(WidgetManager) protected readonly widgets: WidgetManager;
  @inject(ApplicationShell) protected readonly shell: ApplicationShell;
  @inject(MessageService) protected readonly messages: MessageService;
  registerCommands(registry: CommandRegistry): void {
    registry.registerCommand(OPEN_BUILDER, {execute: async () => {
      const widget = await this.widgets.getOrCreateWidget(OpenForgeWorkbenchWidget.ID);
      this.shell.addWidget(widget,{area:'main'});
      this.shell.activateWidget(widget.id);
    }});
    registry.registerCommand(OPEN_AGENT, {execute: () => this.messages.info('Open AI Chat and select @OpenForgeBuilder; configure Ollama or a cloud provider in Theia AI preferences.')});
  }
}
