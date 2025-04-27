import * as vscode from 'vscode';
import * as common from './wrapp_editor/common';
import * as components from './components';
import * as path from 'path';


class WRAPPDocument extends vscode.Disposable implements vscode.CustomDocument {

    state: common.State;

    constructor(
        readonly uri: vscode.Uri,
        state: common.State,
    ) {
        super(() => { });
        this.state = state;
    }
    static async create(
        uri: vscode.Uri,
    ): Promise<WRAPPDocument> {
        let state: common.State = {
            isWindowsConsole: true,
        };
        return new WRAPPDocument(uri, state);
    }
}

export class WRAPPEditorProvider implements vscode.CustomReadonlyEditorProvider<WRAPPDocument> {
    async openCustomDocument(
        uri: vscode.Uri,
        openContext: vscode.CustomDocumentOpenContext,
        token: vscode.CancellationToken
    ): Promise<WRAPPDocument> {
        let document = await WRAPPDocument.create(uri);
        return document;
    }
    resolveCustomEditor(
        document: WRAPPDocument,
        webviewPanel: vscode.WebviewPanel,
        token: vscode.CancellationToken
    ): Thenable<void> | void {
        webviewPanel.webview.options = {
            enableScripts: true,
        };

        this.setHTML(webviewPanel.webview);

        var handlers: Map<common.CommandID, (data: any) => void | PromiseLike<void>> = new Map();

        function listen<Command extends common.CommandID>(
            id: Command,
            handler: (data: common.CommandMap[Command]) => undefined | void | PromiseLike<undefined | void>
        ) {
            handlers.set(id, handler);
        }

        listen("setState", (state) => {
            document.state = state;
        });
        listen("debug", async () => {
            await vscode.debug.startDebugging(undefined, {
                name: "Debug WRAPP",
                type: "webrogue",
                request: "launch",
                program: document.uri.fsPath
            });
        });
        listen("buildWindows", async () => {
            let cliInfo = await components.ensureComponent(this._context, components.CLI_DOWNLOADABLE_TYPE);
            let args = ["compile", "windows"];
            args.push(document.uri.fsPath);
            args.push(path.join(path.dirname(document.uri.fsPath), "out.exe"));
            if (document.state.isWindowsConsole) {
                args.push("--console");
            }
            await cliInfo?.runManaged("Building Windows executable", args);
        });
        listen("buildLinux", async () => {
            let cliInfo = await components.ensureComponent(this._context, components.CLI_DOWNLOADABLE_TYPE);
            let args = ["compile", "linux"];
            args.push(document.uri.fsPath);
            args.push(path.join(path.dirname(document.uri.fsPath), "a.out"));
            await cliInfo?.runManaged("Building Linux executable", args);
        });
        webviewPanel.webview.onDidReceiveMessage(async event => {
            handlers.get(event.command)?.(event.data);
        });

        webviewPanel.webview.postMessage(document.state);
    }

    setHTML(webview: vscode.Webview) {
        const nonce = getNonce();

        const scriptUri = webview.asWebviewUri(vscode.Uri.joinPath(
            this._context.extensionUri, 'dist', 'wrapp_editor.js'));

        const styleResetUri = webview.asWebviewUri(vscode.Uri.joinPath(
            this._context.extensionUri, 'media', 'reset.css'));

        const styleVSCodeUri = webview.asWebviewUri(vscode.Uri.joinPath(
            this._context.extensionUri, 'media', 'vscode.css'));

        const styleMainUri = webview.asWebviewUri(vscode.Uri.joinPath(
            this._context.extensionUri, 'media', 'wrapp.css'));

        // <link href="${styleVSCodeUri}" rel="stylesheet" />
        // <script nonce="${nonce}" src="${scriptUri}"></script>

        // <button data-color="black" class="black active" title="Black"></button>
        // <button data-color="white" class="white" title="White"></button>
        // <button data-color="red" class="red" title="Red"></button>
        // <button data-color="green" class="green" title="Green"></button>
        // <button data-color="blue" class="blue" title="Blue"></button>

        webview.html = `
			<!DOCTYPE html>
			<html lang="en">
			<head>
				<meta charset="UTF-8">

				<!--
				Use a content security policy to only allow loading images from https or from our extension directory,
				and only allow scripts that have a specific nonce.
				-->
				<meta http-equiv="Content-Security-Policy" content="default-src 'none'; img-src ${webview.cspSource} blob:; style-src ${webview.cspSource}; script-src 'nonce-${nonce}';">

				<meta name="viewport" content="width=device-width, initial-scale=1.0">

                <link href="${styleResetUri}" rel="stylesheet" />
				<link href="${styleVSCodeUri}" rel="stylesheet" />
                <link href="${styleMainUri}" rel="stylesheet" />

				<title>Paw Draw</title>
			</head>
			<body>
				<button id="${common.DEBUG_BUTTON_ID}">Run and debug</button>

                <h1>Windows</h1>
                <input id="${common.IS_WINDOWS_CONSOLE_CHECKBOX_ID}" type="checkbox">Show console while running resulting application</input>
                <br>
				<button id="${common.BUILD_WINDOWS_BUTTON_ID}">Build Windows app</button>

                <h1>Linux</h1>
                <button id="${common.BUILD_LINUX_BUTTON_ID}">Build Linux app</button>

                <script nonce="${nonce}" src="${scriptUri}"></script>
			</body>
			</html>`;
    }

    constructor(
        private readonly _context: vscode.ExtensionContext
    ) { }

}

function getNonce() {
    let text = '';
    const possible = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
    for (let i = 0; i < 32; i++) {
        text += possible.charAt(Math.floor(Math.random() * possible.length));
    }
    return text;
}

export function register(context: vscode.ExtensionContext) {
    context.subscriptions.push(vscode.window.registerCustomEditorProvider(
        "webrogue.wrapp",
        new WRAPPEditorProvider(context)
    ));
}