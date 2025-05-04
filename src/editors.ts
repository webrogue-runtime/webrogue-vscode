import * as vscode from 'vscode';
import * as common from './wrapp_editor/common';
import * as components from './components';
import * as path from 'path';
import * as cache from './cache';

interface SavedState {
    [key: string]: any
}

class WRAPPDocument extends vscode.Disposable implements vscode.CustomDocument {

    state: common.State;

    constructor(
        readonly uri: vscode.Uri,
        state: common.State,
        readonly saveState: (state: common.State) => void
    ) {
        super(() => {
            saveState(this.state)
        });
        this.state = state;
    }
    static async create(
        uri: vscode.Uri,
        context: vscode.ExtensionContext,
    ): Promise<WRAPPDocument> {
        let state = common.getEmptyState();
        var saveHandlers: ((state: common.State, savedState: SavedState) => void)[] = []
        let storageId = "lastWrappEditorState"
        var lastState = context.globalState.get<SavedState>(storageId)!;
        if (typeof lastState !== "object") {
            lastState = {};
        }

        function getBoolean(id: string, getter: (state: common.State) => boolean): boolean | undefined {
            saveHandlers.push((state, savedState) => {
                savedState[id] = getter(state);
            })
            let result = lastState[id];
            return typeof result === "boolean" ? result : undefined;
        }

        function getString(id: string, getter: (state: common.State) => string): string | undefined {
            saveHandlers.push((state, savedState) => {
                savedState[id] = getter(state);
            })
            let result = lastState[id];
            return typeof result === "string" ? result : undefined;
        }

        state.windows.console = getBoolean("state.windows.console", state => state.windows.console) ?? false;
        state.android.useDebugSignature = getBoolean("state.android.useDebugSignature", state => state.android.useDebugSignature) ?? false;
        state.android.keystorePath = getString("state.android.keystorePath", state => state.android.keystorePath) ?? "";
        state.android.keyAlias = getString("state.android.keyAlias", state => state.android.keyAlias) ?? "";

        return new WRAPPDocument(uri, state, (state) => {
            var savedState: SavedState = {};
            saveHandlers.forEach(saveHandler => saveHandler(state, savedState))
            context.globalState.update(storageId, savedState);
        });
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
        function sendState() {
            webviewPanel.webview.postMessage(document.state);
        }

        listen("setState", (state) => {
            document.state = state;
            document.saveState(state);
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
            let cliInfo = await components.ensureCLI(this._context, vscode.workspace.getWorkspaceFolder(document.uri));
            if (!cliInfo) {
                return
            }
            let args = ["compile", "windows"];
            args.push(document.uri.fsPath);
            let destination = await vscode.window.showSaveDialog({
                filters: {
                    "Windows executable": ["exe"]
                },
                saveLabel: "Save Windows app",
                defaultUri: vscode.Uri.file(path.join(path.dirname(document.uri.fsPath), "out.exe"))
            })
            if (!destination) {
                return
            }
            args.push(destination.fsPath);
            if (document.state.windows.console) {
                args.push("--console");
            }
            await cliInfo.runManaged("Building Windows executable", args);
        });
        listen("buildLinux", async () => {
            let cliInfo = await components.ensureCLI(this._context, vscode.workspace.getWorkspaceFolder(document.uri));
            if (!cliInfo) {
                return
            }
            let args = ["compile", "linux"];
            args.push(document.uri.fsPath);
            let destination = await vscode.window.showSaveDialog({
                saveLabel: "Save Linux app",
                defaultUri: vscode.Uri.file(path.join(path.dirname(document.uri.fsPath), "a.out"))
            })
            if (!destination) {
                return
            }
            args.push(destination.fsPath);
            await cliInfo.runManaged("Building Linux executable", args);
        });
        listen("buildAndroid", async () => {
            let cliInfo = await components.ensureCLI(this._context, vscode.workspace.getWorkspaceFolder(document.uri));
            if (!cliInfo) {
                return
            }
            let config = document.state.android;
            let args = ["compile", "android"];

            let destination = await vscode.window.showSaveDialog({
                filters: {
                    "Android APK": ["apk"]
                },
                saveLabel: "Save APK",
                defaultUri: vscode.Uri.file(path.join(path.dirname(document.uri.fsPath), "out.apk"))
            })
            if (!destination) {
                return
            }
            args.push("--output");
            args.push(destination.fsPath);

            let javaHome: string | undefined = vscode.workspace.getConfiguration("webrogue", null).get("javaInstallationDirectory");
            if (javaHome) {
                args.push("--java-home");
                args.push(javaHome);
            }

            let sdk: string | undefined = vscode.workspace.getConfiguration("webrogue", null).get("androidSdkDirectory");
            if (sdk) {
                args.push("--sdk");
                args.push(sdk);
            }
            if (!config.useDebugSignature) {
                args.push("--keystore-path");
                args.push(config.keystorePath);
                args.push("--key-alias");
                args.push(config.keyAlias);
                args.push("--store-password");
                args.push(config.storePassword);
                args.push("--key-password");
                args.push(config.keyPassword.length > 0 ? config.keyPassword : config.storePassword);
            }

            args.push(document.uri.fsPath);
            args.push((await cache.getBuildDir(this._context, "android")).fsPath);

            await cliInfo.runManaged("Building APK", args);
        });
        listen("pickKeystore", async () => {
            let paths = await vscode.window.showOpenDialog({
                canSelectMany: false,
            });
            if (!paths || paths.length != 1) {
                return;
            }
            document.state.android.keystorePath = paths[0].fsPath;
            sendState();
        });

        webviewPanel.webview.onDidReceiveMessage(async event => {
            handlers.get(event.command)?.(event.data);
        });
        sendState();
    }


    setHTML(webview: vscode.Webview) {
        const nonce = getNonce();

        const scriptUri = webview.asWebviewUri(vscode.Uri.joinPath(
            this._context.extensionUri,
            'dist',
            'wrapp_editor.js'
        ));

        const styleMainUri = webview.asWebviewUri(vscode.Uri.joinPath(
            this._context.extensionUri,
            'media',
            'wrapp.css'
        ));

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

				<!--
				Use a content security policy to only allow loading images from https or from our extension directory,
				and only allow scripts that have a specific nonce.
				-->
				<meta http-equiv="Content-Security-Policy" content="default-src 'none'; img-src ${webview.cspSource} blob:; style-src ${webview.cspSource}; font-src ${webview.cspSource}; script-src 'nonce-${nonce}';">

				<meta name="viewport" content="width=device-width, initial-scale=1.0">

                <link href="${styleMainUri}" rel="stylesheet" />
                <link href="${codiconsUri}" rel="stylesheet" id="vscode-codicon-stylesheet">

				<title>WRAPP</title>
			</head>
			<body>
                <vscode-tabs selected-index="0">
                    <vscode-tab-header slot="header">
                        General
                    </vscode-tab-header>
                    <vscode-tab-panel>
                        <p>
                            This action launches WRAPP and debugs it using LLDB.
                        </p>
                        <p>
                            <vscode-button id="${common.DEBUG_BUTTON_ID}">
                                Run and debug
                            </vscode-button>
                        </p>
                    </vscode-tab-panel>

                    <vscode-tab-header slot="header">
                        Windows
                    </vscode-tab-header>
                    <vscode-tab-panel>
                        <p>
                            When building Windows application, 3 files are produced: 
                            .exe binary, libGLESv2.dll and libEGL.dll.
                            All these files must be in the same directory, otherwise application will crash
                            on attempt to initialize graphics.
                            Currently only Windows 10 or later an x64 CPUs are supported.
                        </p>
                        <p>
                            It is possible to mark executable as "console" application.
                            While it allows to read stdout/stderr as app runs, it also makes
                            Windows open terminal emulator window if executable not launched
                            by usual means such as double click, which annoys most users.
                            </br>
                            <vscode-checkbox id="${common.IS_WINDOWS_CONSOLE_CHECKBOX_ID}">
                                Mark executable as "console" application
                            </vscode-checkbox>
                        </p>
                        <p>
                            <vscode-button id="${common.BUILD_WINDOWS_BUTTON_ID}">
                                Build Windows app
                            </vscode-button>
                        </p>
                    </vscode-tab-panel>

                    <vscode-tab-header slot="header">
                        Linux
                    </vscode-tab-header>
                    <vscode-tab-panel>
                        <p>
                            Currently only x64 CPUs and glibc 2.28+ distros are supported.
                        </p>
                        <p>
                            <vscode-button id="${common.BUILD_LINUX_BUTTON_ID}">
                                Build Linux app
                            </vscode-button>
                        </p>
                    </vscode-tab-panel>
                    
                    <vscode-tab-header slot="header">
                        Android
                    </vscode-tab-header>
                    <vscode-tab-panel>
                        <p>
                            Debug signature allows to sign APK with self-signed debug
                            certificate. It is usable only for testing and debug purposes.
                            </br>
                            <vscode-checkbox id="${common.IS_ANDROID_DEBUG_SIGNATURE_CHECKBOX_ID}" type="checkbox">
                                Use debug signature
                            </vscode-checkbox>
                        </p>
                        <p>
                            Path to keystore file
                            </br>
                            <vscode-textfield id="${common.ANDROID_KEYSTORE_TEXTFIELD_ID}">
                                <vscode-icon slot="content-after" name="file" label="Pick keystore file" action-icon id="${common.ANDROID_KEYSTORE_PICK_ICON_ID}"></vscode-icon>
                            </vscode-textfield>
                        </p>
                        <p>
                            Key alias
                            </br>
                            <vscode-textfield id="${common.ANDROID_KEY_ALIAS_TEXTFIELD_ID}"></vscode-textfield>
                        </p>
                        <p>
                            Store password
                            </br>
                            <vscode-textfield type="password" id="${common.ANDROID_STORE_PASSWORD_TEXTFIELD_ID}"></vscode-textfield>
                        </p>
                        <p>
                            Key password. Usually same as store password
                            </br>
                            <vscode-textfield type="password" id="${common.ANDROID_KEY_PASSWORD_TEXTFIELD_ID}"></vscode-textfield>
                        </p>
                        <p>
                            <vscode-button id="${common.BUILD_ANDROID_BUTTON_ID}">
                                Build APK
                            </vscode-button>
                        </p>
                        <p>
                            <div id="${common.ANDROID_ERROR_ID}"></div>
                        </p>
                    </vscode-tab-panel>
                </vscode-tabs>

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