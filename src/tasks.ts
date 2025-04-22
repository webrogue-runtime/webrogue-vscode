import * as vscode from 'vscode';
import * as terminal from './terminal';

const TaskType = "webrogue";

interface PackTaskDefinition extends vscode.TaskDefinition {
    config: string;
}

function makePackTask(
    originalDefinition: PackTaskDefinition,
    context: vscode.ExtensionContext,
    scope: vscode.WorkspaceFolder | vscode.TaskScope.Global | vscode.TaskScope.Workspace
): vscode.Task {
    let result = new vscode.Task(
        originalDefinition,
        scope,
        vscode.workspace.workspaceFolders?.length === 1 ? "pack" : `pack ${originalDefinition.config}`,
        TaskType,
        new vscode.CustomExecution(async (resolvedDefinition) => new terminal.TaskTerminal(
            context,
            async (run) => {
                let configUri = vscode.Uri.file(resolvedDefinition.config);
                let configStat = await vscode.workspace.fs.stat(configUri);
                let configDir;
                if (configStat.type === vscode.FileType.Directory) {
                    configDir = vscode.Uri.joinPath(configUri, "out.wrapp");
                } else {
                    let userInput = await vscode.window.showInputBox({
                        title: "Path to place resulting WRAPP to"
                    });
                    if (!userInput) {
                        throw new Error("Unable to infer path to place resulting WRAPP to");
                    }
                    configDir = vscode.Uri.file(userInput);
                }
                await run([
                    "pack",
                    "--config", resolvedDefinition.config,
                    "--output", configDir.fsPath
                ]);
            }
        )),
        [],
    );
    result.group = vscode.TaskGroup.Build;
    return result;
}

export function register(context: vscode.ExtensionContext) {
    context.subscriptions.push(vscode.tasks.registerTaskProvider(TaskType, {
        provideTasks(token) {
            return (vscode.workspace.workspaceFolders ?? [])
                .map(folder => makePackTask(
                    {
                        type: TaskType,
                        config: vscode.workspace.workspaceFolders?.length === 1 ? "${workspaceFolder}" : folder.uri.fsPath
                    },
                    context,
                    folder,
                ));
        },
        resolveTask: function (task: vscode.Task, token: vscode.CancellationToken): vscode.ProviderResult<vscode.Task> {
            const definition: PackTaskDefinition = <any>task.definition;
            return makePackTask(definition, context, task.scope ?? vscode.TaskScope.Workspace);
        }
    }));
}