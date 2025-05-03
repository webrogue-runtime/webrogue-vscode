
import * as vscode from 'vscode';
import * as components from './components';
import * as cache from './cache';

export class LLDBDapConfigurationProvider implements vscode.DebugConfigurationProvider {

    // provideDebugConfigurations?(
    //     folder: vscode.WorkspaceFolder | undefined,
    //     token?: vscode.CancellationToken
    // ): vscode.ProviderResult<vscode.DebugConfiguration[]> {

    //     return undefined;
    // }

    async resolveDebugConfiguration?(
        folder: vscode.WorkspaceFolder | undefined,
        debugConfiguration: vscode.DebugConfiguration,
        token?: vscode.CancellationToken
    ): Promise<vscode.DebugConfiguration | undefined> {
        let type = "webrogue";

        let codeLLDBExtension = vscode.extensions.getExtension("vadimcn.vscode-lldb");
        let lldbDAPExtension = vscode.extensions.getExtension("llvm-vs-code-extensions.lldb-dap");
        let dap = await components.getDownloadedComponent(this.context, components.DAP_DOWNLOADABLE_TYPE);
        if (!codeLLDBExtension && !lldbDAPExtension && !dap) {
            let downloadDAPComponent = "Download fallback LLDB-DAP component";
            let installCodeLLDB = "Install CodeLLDB extension";
            let installLLDBDAP = "Install separate LLDB-DAP extension";
            let answer = await vscode.window.showWarningMessage(
                "Webrogue extension is not ready for debugging",
                {
                    modal: true,
                    detail: `
Possible solutions are:
1) Automatically download and install fallback LLDB-DAP component provided by Webrogue
2) Install CodeLLDB extension
3) Install LLDB-DAP extension. May require additional configuration
                    `.trim()
                },
                downloadDAPComponent, installCodeLLDB, installLLDBDAP
            );

            if (answer === downloadDAPComponent) {
                await components.installComponent(this.context, components.DAP_DOWNLOADABLE_TYPE, "ensure");
            } else if (answer === installCodeLLDB) {
                await vscode.env.openExternal(vscode.Uri.from({
                    scheme: vscode.env.uriScheme,
                    path: "extension/vadimcn.vscode-lldb"
                }));
                return undefined;
            } else if (answer === installLLDBDAP) {
                await vscode.env.openExternal(vscode.Uri.from({
                    scheme: vscode.env.uriScheme,
                    path: "extension/llvm-vs-code-extensions.lldb-dap"
                }));
                return undefined;
            } else {
                return undefined;
            }
        }

        if (codeLLDBExtension) {
            type = "lldb";
        }

        if (lldbDAPExtension) {
            type = "lldb-dap";
        }

        let cli = await components.ensureCLI(this.context, folder);
        if (!cli) {
            throw new Error("Webrogue CLI component is required to debug Webrogue applications");
        }

        return {
            name: debugConfiguration.name,
            type: type,
            request: "launch",
            program: cli.bin.fsPath,
            args: [
                "run",
                "--cache",
                (await cache.getConfig(this.context)).fsPath,
                debugConfiguration.program
            ],
            // Keep as is
            preLaunchTask: debugConfiguration.preLaunchTask,
            postDebugTask: debugConfiguration.postDebugTask,
            internalConsoleOptions: debugConfiguration.internalConsoleOptions,
            suppressMultipleSessionWarning: debugConfiguration.suppressMultipleSessionWarning
        };
    }

    constructor(readonly context: vscode.ExtensionContext) { }
}

export class LLDBDapDescriptorFactory implements vscode.DebugAdapterDescriptorFactory {
    async createDebugAdapterDescriptor(
        session: vscode.DebugSession,
        executable: vscode.DebugAdapterExecutable | undefined,
    ): Promise<vscode.DebugAdapterDescriptor | undefined> {
        let dap = await components.ensureComponent(this.context, components.DAP_DOWNLOADABLE_TYPE);
        if (!dap) {
            throw new Error("LLDB-DAP component is required to debug Webrogue applications");
        }

        return new vscode.DebugAdapterExecutable(
            dap.bin.fsPath,
        );
    }

    constructor(readonly context: vscode.ExtensionContext) { }
}

export function register(context: vscode.ExtensionContext) {
    context.subscriptions.push(
        vscode.debug.registerDebugConfigurationProvider(
            "webrogue",
            new LLDBDapConfigurationProvider(context),
        ),
    );
    context.subscriptions.push(
        vscode.debug.registerDebugAdapterDescriptorFactory(
            "webrogue",
            new LLDBDapDescriptorFactory(context),
        ),
    );
}
