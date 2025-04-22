import * as vscode from 'vscode';
import * as tasks from './tasks';
import * as cmake from './cmake';
import * as editors from './editors';
import * as commands from './commands';

export function activate(context: vscode.ExtensionContext) {
	tasks.register(context);
	commands.register(context);
	editors.register(context);
	cmake.checkCmakeExtension(context);
	vscode.extensions.onDidChange(
		() => cmake.checkCmakeExtension(context),
		context.subscriptions,
	);
}

export function deactivate() { }
