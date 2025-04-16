import * as vscode from 'vscode';
import * as sdk from './sdk';
import * as tasks from './tasks';
import * as cmake from './cmake';

export function activate(context: vscode.ExtensionContext) {
	tasks.register(context);
	context.subscriptions.push(vscode.commands.registerCommand(
		'webrogue-vscode.updateSDK',
		async () => {
			try {
				await sdk.installSDK(context);
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
	cmake.checkCmakeExtension(context);
}

export function deactivate() { }
