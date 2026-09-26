import { ContainerModule } from '@theia/core/shared/inversify';
import { CommandContribution } from '@theia/core';
import { WidgetFactory } from '@theia/core/lib/browser';
import { OpenForgeWorkbenchWidget, OpenForgeWorkbenchContribution } from './openforge-workbench-widget';
import { Agent, bindToolProvider } from '@theia/ai-core';
import { ChatAgent } from '@theia/ai-chat';
import { OpenForgeAIBuilderAgent } from './openforge-ai-agent';
import { OpenForgeCreateProjectTool, OpenForgeInspectTool, OpenForgeWriteFileTool } from './openforge-ai-tools';
import { OpenForgePromptCommands } from './openforge-prompt-commands';

export default new ContainerModule(bind => {
    bindToolProvider(OpenForgeInspectTool, bind);
    bindToolProvider(OpenForgeCreateProjectTool, bind);
    bindToolProvider(OpenForgeWriteFileTool, bind);
    bind(OpenForgeAIBuilderAgent).toSelf().inSingletonScope();
    bind(Agent).toService(OpenForgeAIBuilderAgent);
    bind(ChatAgent).toService(OpenForgeAIBuilderAgent);
    bind(OpenForgeWorkbenchWidget).toSelf();
    bind(WidgetFactory).toDynamicValue(ctx => ({id: OpenForgeWorkbenchWidget.ID, createWidget: () => ctx.container.get(OpenForgeWorkbenchWidget)})).inSingletonScope();
    bind(OpenForgeWorkbenchContribution).toSelf().inSingletonScope();
    bind(CommandContribution).toService(OpenForgeWorkbenchContribution);
    bind(OpenForgePromptCommands).toSelf().inSingletonScope();
    bind(CommandContribution).toService(OpenForgePromptCommands);
});
