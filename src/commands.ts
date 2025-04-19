import * as vscode from 'vscode';
import * as sdk from './sdk';
import * as cmake from './cmake';
import * as path from 'path';
import * as childProcess from 'child_process';

export function register(context: vscode.ExtensionContext) {
    context.subscriptions.push(vscode.commands.registerCommand(
        'webrogue-vscode.updateSDK',
        async () => {
            try {
                await sdk.installSDK(context);
                await cmake.checkCmakeExtension(context);
            } catch (e) {
                vscode.window.showErrorMessage(
                    `An error occurred while installing Webrogue SDK: ${e}`
                );
            }
        }
    ));
    context.subscriptions.push(vscode.commands.registerCommand(
        'webrogue-vscode.deleteSDK',
        async () => {
            await sdk.deleteSDK(context);
        }
    ));
    context.subscriptions.push(vscode.commands.registerCommand(
        'webrogue-vscode.getWebrogueBinPath',
        async () => {
            let sdkInfo = await sdk.ensureSDK(context);
            if (!sdkInfo) {
                return;
            }
            await vscode.env.clipboard.writeText(sdkInfo.webrogueBin.fsPath);
            vscode.window.showInformationMessage(
                "Path to Webrogue binary has been copied to your clipboard",
            );
        }
    ));
    context.subscriptions.push(vscode.commands.registerCommand(
        'webrogue-vscode.pack',
        async () => {
            let sdkInfo = await sdk.ensureSDK(context);
            if (!sdkInfo) {
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

            await vscode.window.withProgress({
                location: vscode.ProgressLocation.Notification,
                title: "Packaging WRAPP file",
            }, async () => {
                await new Promise<void>((resolve, reject) => {
                    childProcess.execFile(sdkInfo.webrogueBin.fsPath, args, (error, stdout, stderr) => {
                        if (error) {
                            reject(error);
                        } else {
                            resolve();
                        }
                    });
                });
            });
        }
    ));
}