import * as vscode from 'vscode';
import * as tasks from './tasks';
import * as cmake from './cmake';
import * as editors from './editors';
import * as commands from './commands';
import * as debug from './debug';
import * as components from './components';

export function activate(context: vscode.ExtensionContext) {
	tasks.register(context);
	commands.register(context);
	editors.register(context);
	debug.register(context);
	cmake.checkCmakeExtension(context);
	vscode.extensions.onDidChange(
		() => cmake.checkCmakeExtension(context),
		context.subscriptions,
	);
	if (vscode.workspace.getConfiguration("webrogue", null).get("automaticallyUpdateComponents")) {
		components.updateAll(context)
	}
}

export function deactivate() { }
