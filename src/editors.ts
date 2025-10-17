import * as vscode from 'vscode';
import * as components from './components';
import * as path from 'path';
import * as cache from './cache';
import { readdirSync, readFile, readFileSync } from 'fs';
import { CommandID, CommandMap, CommandRequest, CommandResponse } from './proto';

interface SavedState {
    [key: string]: any
}

class WRAPPDocument extends vscode.Disposable implements vscode.CustomDocument {
    constructor(
        readonly uri: vscode.Uri,
    ) {
        super(() => {
        });
    }
    static async create(
        uri: vscode.Uri,
        context: vscode.ExtensionContext,
    ): Promise<WRAPPDocument> {
        let storageId = "lastWrappEditorState"
        var lastState = context.globalState.get<SavedState>(storageId)!;
        if (typeof lastState !== "object") {
            lastState = {};
        }

        return new WRAPPDocument(uri,);
    }
}

export class WRAPPEditorProvider implements vscode.CustomReadonlyEditorProvider<WRAPPDocument> {
    async openCustomDocument(
        uri: vscode.Uri,
        openContext: vscode.CustomDocumentOpenContext,
        token: vscode.CancellationToken
    ): Promise<WRAPPDocument> {
        let document = await WRAPPDocument.create(uri, this._context);
        return document;
    }
    async resolveCustomEditor(
        document: WRAPPDocument,
        webviewPanel: vscode.WebviewPanel,
        token: vscode.CancellationToken
    ): Promise<void> {
        webviewPanel.webview.options = {
            enableScripts: true,
        };

        await this.setHTML(webviewPanel.webview);

        type CommandHandler<Command extends CommandID> = (request: CommandMap[Command]["request"]) => CommandMap[Command]["response"] | PromiseLike<CommandMap[Command]["response"]>;

        var handlers: Map<CommandID, CommandHandler<CommandID>> = new Map();


        function listen<Command extends CommandID>(
            id: Command,
            handler: CommandHandler<Command>
        ) {
            handlers.set(id, handler as unknown as CommandHandler<CommandID>);
        }
        listen("debug", (request) => {
            return ""
        })
        listen("setState", (request) => {
            return 1
        })

        // listen("setState", (state) => {
        //     document.state = state;
        //     document.saveState(state);
        // });
        // listen("debug", async () => {
        //     await vscode.debug.startDebugging(undefined, {
        //         name: "Debug WRAPP",
        //         type: "webrogue",
        //         request: "launch",
        //         program: document.uri.fsPath
        //     });
        // });
        // listen("buildWindows", async () => {
        //     let cliInfo = await components.ensureCLI(this._context, vscode.workspace.getWorkspaceFolder(document.uri));
        //     if (!cliInfo) {
        //         return
        //     }
        //     let args = ["compile", "windows"];
        //     args.push(document.uri.fsPath);
        //     let destination = await vscode.window.showSaveDialog({
        //         filters: {
        //             "Windows executable": ["exe"]
        //         },
        //         saveLabel: "Save Windows app",
        //         defaultUri: vscode.Uri.file(path.join(path.dirname(document.uri.fsPath), "out.exe"))
        //     })
        //     if (!destination) {
        //         return
        //     }
        //     args.push(destination.fsPath);
        //     if (document.state.windows.console) {
        //         args.push("--console");
        //     }
        //     await cliInfo.runManaged("Building Windows executable", args);
        // });
        // listen("buildLinux", async () => {
        //     let cliInfo = await components.ensureCLI(this._context, vscode.workspace.getWorkspaceFolder(document.uri));
        //     if (!cliInfo) {
        //         return
        //     }
        //     let args = ["compile", "linux"];
        //     args.push(document.uri.fsPath);
        //     let destination = await vscode.window.showSaveDialog({
        //         saveLabel: "Save Linux app",
        //         defaultUri: vscode.Uri.file(path.join(path.dirname(document.uri.fsPath), "a.out"))
        //     })
        //     if (!destination) {
        //         return
        //     }
        //     args.push(destination.fsPath);
        //     await cliInfo.runManaged("Building Linux executable", args);
        // });
        // listen("buildAndroid", async () => {
        //     let cliInfo = await components.ensureCLI(this._context, vscode.workspace.getWorkspaceFolder(document.uri));
        //     if (!cliInfo) {
        //         return
        //     }
        //     let config = document.state.android;
        //     let args = ["compile", "android"];

        //     let destination = await vscode.window.showSaveDialog({
        //         filters: {
        //             "Android APK": ["apk"]
        //         },
        //         saveLabel: "Save APK",
        //         defaultUri: vscode.Uri.file(path.join(path.dirname(document.uri.fsPath), "out.apk"))
        //     })
        //     if (!destination) {
        //         return
        //     }
        //     args.push("--output");
        //     args.push(destination.fsPath);

        //     let javaHome: string | undefined = vscode.workspace.getConfiguration("webrogue", null).get("javaInstallationDirectory");
        //     if (javaHome) {
        //         args.push("--java-home");
        //         args.push(javaHome);
        //     }

        //     let sdk: string | undefined = vscode.workspace.getConfiguration("webrogue", null).get("androidSdkDirectory");
        //     if (sdk) {
        //         args.push("--sdk");
        //         args.push(sdk);
        //     }
        //     if (!config.useDebugSignature) {
        //         args.push("--keystore-path");
        //         args.push(config.keystorePath);
        //         args.push("--key-alias");
        //         args.push(config.keyAlias);
        //         args.push("--store-password");
        //         args.push(config.storePassword);
        //         args.push("--key-password");
        //         args.push(config.keyPassword.length > 0 ? config.keyPassword : config.storePassword);
        //     }

        //     args.push(document.uri.fsPath);
        //     args.push((await cache.getBuildDir(this._context, "android")).fsPath);

        //     await cliInfo.runManaged("Building APK", args);
        // });
        // listen("pickKeystore", async () => {
        //     let paths = await vscode.window.showOpenDialog({
        //         canSelectMany: false,
        //     });
        //     if (!paths || paths.length != 1) {
        //         return;
        //     }
        //     document.state.android.keystorePath = paths[0].fsPath;
        //     sendState();
        // });

        webviewPanel.webview.onDidReceiveMessage(rawRequest => {
            const request = rawRequest as CommandRequest<CommandID>
            Promise.resolve(handlers.get(request.command)!(request.data)).then(responseData => {
                const response: CommandResponse<CommandID> = {
                    requestId: request.requestId,
                    data: responseData
                }
                webviewPanel.webview.postMessage(response);
            })
        });
    }


    async setHTML(webview: vscode.Webview): Promise<void> {
        const nonce = getNonce();

        const webviewAssetsDirPath = vscode.Uri.joinPath(
            this._context.extensionUri,
            'dist',
            'webview',
            'assets',
        ).fsPath;

        const webviewScriptPath = path.join(webviewAssetsDirPath, readdirSync(webviewAssetsDirPath).filter((dirname) => dirname.endsWith(".js"))[0]);
        const webviewScriptUrl = webview.asWebviewUri(vscode.Uri.file(webviewScriptPath));

        const webviewStylePath = path.join(webviewAssetsDirPath, readdirSync(webviewAssetsDirPath).filter((dirname) => dirname.endsWith(".css"))[0]);
        const webviewStyleUrl = webview.asWebviewUri(vscode.Uri.file(webviewStylePath));

        const codiconsUri = webview.asWebviewUri(vscode.Uri.joinPath(
            this._context.extensionUri,
            'media',
            'codicons',
            'codicon.css'
        ));

        webview.html = `
			<!DOCTYPE html>
			<html lang="en">
			<head>
				<meta charset="UTF-8">

				<meta http-equiv="Content-Security-Policy" content="default-src 'none'; img-src ${webview.cspSource} blob:; style-src ${webview.cspSource}; font-src ${webview.cspSource} data:; script-src 'nonce-${nonce}' 'http://localhost:5173/';">

				<meta name="viewport" content="width=device-width, initial-scale=1.0">

                <link href="${webviewStyleUrl}" rel="stylesheet" id="vscode-codicon-stylesheet"/>

				<title>WRAPP</title>
			</head>
			<body>
                <div id="root"></div>
                <script nonce="${nonce}" src="${webviewScriptUrl}"></script>
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