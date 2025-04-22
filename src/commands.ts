import * as vscode from 'vscode';
import * as components from './components';
import * as cmake from './cmake';
import * as path from 'path';

export function register(context: vscode.ExtensionContext) {
    context.subscriptions.push(vscode.commands.registerCommand(
        'webrogue-vscode.updateComponents',
        async () => {
            try {
                let choice = await vscode.window.showQuickPick(
                    components.ALL_DOWNLOADABLE_TYPES.map(t => t.getName()),
                    {
                        canPickMany: true,
                        placeHolder: "Select components to install/update"
                    }
                );
                if (!choice) {
                    return;
                }
                for (const component of components.ALL_DOWNLOADABLE_TYPES) {
                    if (choice.indexOf(component.getName()) === -1) {
                        continue;
                    }
                    await components.installComponent<unknown>(context, component);
                }
                await cmake.checkCmakeExtension(context);
            } catch (e) {
                vscode.window.showErrorMessage(
                    `An error occurred while installing Webrogue SDK: ${e}`
                );
            }
        }
    ));
    context.subscriptions.push(vscode.commands.registerCommand(
        'webrogue-vscode.deleteComponents',
        async () => {
            let variants = [];
            for (const component of components.ALL_DOWNLOADABLE_TYPES) {
                if (await components.getDownloadedComponent<unknown>(context, component) !== null) {
                    variants.push(component.getName());
                }
            }

            let choice = await vscode.window.showQuickPick(
                variants,
                {
                    canPickMany: true,
                    placeHolder: "Select components to delete"
                }
            );
            if (!choice) {
                return;
            }
            for (const component of components.ALL_DOWNLOADABLE_TYPES) {
                if (choice.indexOf(component.getName()) === -1) {
                    continue;
                }
                await components.deleteComponent<unknown>(context, component);
            }
        }
    ));
    context.subscriptions.push(vscode.commands.registerCommand(
        'webrogue-vscode.getWebrogueBinPath',
        async () => {
            let cliInfo = await components.ensureComponent(context, components.CLI_DOWNLOADABLE_TYPE);
            if (!cliInfo) {
                return;
            }
            await vscode.env.clipboard.writeText(cliInfo.bin.fsPath);
            vscode.window.showInformationMessage(
                "Path to Webrogue binary has been copied to your clipboard",
            );
        }
    ));
    context.subscriptions.push(vscode.commands.registerCommand(
        'webrogue-vscode.pack',
        async () => {
            let cliInfo = await components.ensureComponent(context, components.CLI_DOWNLOADABLE_TYPE);
            if (!cliInfo) {
                return;
            }

            let selectText = "[Select path]";

            var variant = await vscode.window.showQuickPick((async () => {
                let variants = (await vscode.workspace.findFiles("**/webrogue.json")).map(p => p.fsPath);
                variants.push(selectText);
                return variants;
            })());
            if (variant === selectText) {
                variant = await vscode.window.showInputBox({
                    value: vscode.workspace.workspaceFolders?.at(0)?.uri?.fsPath
                });
            }
            if (!variant) { return; }
            let outDir = path.dirname(variant);
            let args = [
                "pack",
                "--config",
                variant,
                "--output",
                outDir
            ];
            await cliInfo.runManaged("Packaging WRAPP file", args);
        }
    ));
}