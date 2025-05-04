import * as vscode from 'vscode';
import * as fs from 'fs';
import * as os from 'os';
import * as tar from 'tar';
import * as cmake from './cmake';
import * as jszip from 'jszip';
import * as childProcess from 'child_process';
import * as cache from './cache';

interface DownloadableComponentType<DownloadedComponent> {
    getReleasesURL(): string
    getName(): string
    versionFile(): string
    getDirName(platform: string, arch: string): string
    getDownloaded(componentDir: vscode.Uri, platform: string, arch: string): Promise<DownloadedComponent | null>
}

class DownloadedSDK {
    constructor(
        readonly dir: vscode.Uri,
        readonly p1ToolchainFile: vscode.Uri
    ) { }
}

export const SDK_DOWNLOADABLE_TYPE: DownloadableComponentType<DownloadedSDK> = {
    getReleasesURL(): string {
        return "https://api.github.com/repos/webrogue-runtime/webrogue-sdk/releases/latest";
    },
    getName(): string {
        return "Webrogue SDK";
    },
    versionFile(): string {
        return "webrogue_sdk_version";
    },
    getDirName(platform: string, arch: string) {
        if (platform === "linux") {
            if (arch === "x64") {
                return "webrogue-sdk-x86_64-linux";
            } else {
                throw new Error("Unsupported platform");
            }
        } else if (platform === "win32") {
            if (arch === "x64") {
                return "webrogue-sdk-x86_64-windows";
            } else {
                throw new Error("Unsupported platform");
            }
        } if (platform === "darwin") {
            if (arch === "x64") {
                return "webrogue-sdk-x86_64-macos";
            } else if (arch === "arm64") {
                return "webrogue-sdk-arm64-macos";
            } else {
                throw new Error("Unsupported platform");
            }
        } else {
            throw new Error("Unsupported platform");
        }
    },
    async getDownloaded(componentDir: vscode.Uri): Promise<DownloadedSDK | null> {
        let p1ToolchainFile = vscode.Uri.joinPath(componentDir, "share", "cmake", "wasi-sdk-p1-pthread.cmake");
        try {
            await vscode.workspace.fs.stat(p1ToolchainFile);
        } catch {
            return null;
        }
        return new DownloadedSDK(componentDir, p1ToolchainFile);
    }
};

class CLI {
    constructor(
        readonly bin: vscode.Uri,
    ) { }

    async run(args: string[]) {
        await new Promise<[string, string]>((resolve, reject) => {
            childProcess.execFile(this.bin.fsPath, args, (error, stdout, stderr) => {
                if (error) {
                    error.stdout = stdout;
                    error.stderr = stderr;
                    reject(error);
                } else {
                    resolve([stdout, stderr]);
                }
            });
        });
    }

    async runManaged(title: string, args: string[]) {
        try {
            await vscode.window.withProgress(
                {
                    location: vscode.ProgressLocation.Notification,
                    title: title
                },
                async (_) => { await this.run(args); }
            );
        } catch (e) {
            let error = <childProcess.ExecFileException>e;
            let openSettingsAnswer = "Open settings";
            if (error.stderr && error.stderr!.includes("Java executable not found")) {
                vscode.window.showErrorMessage(
                    "Webrogue CLI utility is unable to find Java executable. You can specify path to Java installation directory in settings.",
                    openSettingsAnswer
                ).then(async answer => {
                    if (answer === openSettingsAnswer) {
                        await vscode.commands.executeCommand(
                            "workbench.action.openSettings",
                            "webrogue.javaInstallationDirectory",
                        );
                    }
                });
            } else if (error.stderr && error.stderr!.includes("Android SDK not found")) {
                vscode.window.showErrorMessage(
                    "Webrogue CLI utility is unable to find Android SDK. You can specify path to Android SDK directory in settings.",
                    openSettingsAnswer
                ).then(async answer => {
                    if (answer === openSettingsAnswer) {
                        await vscode.commands.executeCommand(
                            "workbench.action.openSettings",
                            "webrogue.androidSdkDirectory",
                        );
                    }
                });
            } else {
                vscode.window.showErrorMessage(`${error}`);
            }
        }
    }
}

const CLI_DOWNLOADABLE_TYPE: DownloadableComponentType<CLI> = {
    getReleasesURL(): string {
        return "https://api.github.com/repos/webrogue-runtime/webrogue/releases/latest";
    },
    getName(): string {
        return "Webrogue CLI utility";
    },
    versionFile(): string {
        return "webrogue_cli_version";
    },
    getDirName(platform: string, arch: string) {
        if (platform === "linux") {
            if (arch === "x64") {
                return "webrogue-cli-linux-x86_64";
            } else {
                throw new Error("Unsupported platform");
            }
        } else if (platform === "win32") {
            if (arch === "x64") {
                return "webrogue-cli-windows-x86_64";
            } else {
                throw new Error("Unsupported platform");
            }
        } else if (platform === "darwin") {
            if (arch === "x64") {
                return "webrogue-cli-macos-x86_64";
            } else if (arch === "arm64") {
                return "webrogue-cli-macos-arm64";
            } else {
                throw new Error("Unsupported platform");
            }
        } else {
            throw new Error("Unsupported platform");
        }
    },
    async getDownloaded(componentDir: vscode.Uri, platform: string, arch: string): Promise<CLI | null> {
        let bin = vscode.Uri.joinPath(componentDir, platform === "win32" ? "webrogue.exe" : "webrogue");
        try {
            await vscode.workspace.fs.stat(bin);
        } catch {
            return null;
        }
        return new CLI(bin);
    },
};


class DownloadedDAP {
    constructor(
        readonly bin: vscode.Uri,
    ) { }
}

export const DAP_DOWNLOADABLE_TYPE: DownloadableComponentType<DownloadedDAP> = {
    getReleasesURL(): string {
        return "https://api.github.com/repos/webrogue-runtime/lldb-dap-builder/releases/latest";
    },
    getName(): string {
        return "Fallback LLDB-DAP executable";
    },
    versionFile(): string {
        return "lldb_dap_version";
    },
    getDirName(platform: string, arch: string) {
        if (platform === "linux") {
            if (arch === "x64") {
                return "lldb-dap-linux-x86_64";
            } else {
                throw new Error("Unsupported platform");
            }
        } else if (platform === "win32") {
            if (arch === "x64") {
                return "lldb-dap-windows-x86_64";
            } else {
                throw new Error("Unsupported platform");
            }
        } else if (platform === "darwin") {
            if (arch === "x64") {
                return "lldb-dap-macos-x86_64";
            } else if (arch === "arm64") {
                return "lldb-dap-macos-arm64";
            } else {
                throw new Error("Unsupported platform");
            }
        } else {
            throw new Error("Unsupported platform");
        }
    },
    async getDownloaded(componentDir: vscode.Uri, platform: string, arch: string): Promise<DownloadedDAP | null> {
        let bin = vscode.Uri.joinPath(componentDir, "bin", platform === "win32" ? "lldb-dap.exe" : "lldb-dap");
        try {
            await vscode.workspace.fs.stat(bin);
        } catch {
            return null;
        }
        return new DownloadedDAP(bin);
    },
};

export const ALL_DOWNLOADABLE_TYPES = [
    CLI_DOWNLOADABLE_TYPE,
    SDK_DOWNLOADABLE_TYPE,
    DAP_DOWNLOADABLE_TYPE,
];

function assumeDownloaded<DownloadedComponent>(
    context: vscode.ExtensionContext,
    component: DownloadableComponentType<DownloadedComponent>
): {
    componentName: string,
    componentDir: vscode.Uri,
    archiveName: string,
    isZip: boolean,
} {
    let platform = os.platform();
    let arch = os.arch();
    let componentName = component.getDirName(platform, arch);
    let isZip = platform === "win32";

    let storage = context.globalStorageUri;
    let componentDir = vscode.Uri.joinPath(storage, "components", componentName);
    return {
        componentName: componentName,
        componentDir: componentDir,
        archiveName: componentName + (isZip ? ".zip" : ".tar.gz"),
        isZip: isZip,
    };
}

export async function getDownloadedComponent<DownloadedComponent>(
    context: vscode.ExtensionContext,
    component: DownloadableComponentType<DownloadedComponent>
): Promise<DownloadedComponent | null> {
    let assumption = assumeDownloaded(context, component);
    return await component.getDownloaded(assumption.componentDir, os.platform(), os.arch());
}

interface UpdateInfo<DownloadedComponent> {
    componentArchivePath: vscode.Uri,
    asset: {
        name: string;
        size: number;
        browser_download_url: string;
        updated_at: string;
    },
    componentInfo: {
        componentName: string;
        componentDir: vscode.Uri;
        archiveName: string;
        isZip: boolean;
    },
    version_file_path: vscode.Uri,
    latest_sdk_version: string,
}

/// Returns null if update is not available
async function checkForUpdate<DownloadedComponent>(
    context: vscode.ExtensionContext,
    component: DownloadableComponentType<DownloadedComponent>,
): Promise<null | UpdateInfo<DownloadedComponent>> {
    let storage = context.globalStorageUri;
    try {
        await vscode.workspace.fs.createDirectory(storage);
    } catch { };
    try {
        await vscode.workspace.fs.createDirectory(vscode.Uri.joinPath(storage, "components"));
    } catch { };
    let componentInfo = assumeDownloaded(context, component);
    let downloadedComponent = await getDownloadedComponent(context, component);
    let componentArchivePath = vscode.Uri.joinPath(storage, "components", componentInfo.archiveName);


    let metadata_response = await fetch(component.getReleasesURL(), {
        headers: [
            ["Accept", "application/vnd.github+json"],
            ["X-GitHub-Api-Version", "2022-11-28"]
        ]
    });
    if (!metadata_response.ok || !metadata_response.body) {
        throw new Error("Fetch error");
    }
    let response = JSON.parse(await (await metadata_response.blob()).text());

    let assets: { name: string, size: number, browser_download_url: string, updated_at: string }[] = response["assets"];
    let asset = assets.find(asset => asset.name === componentInfo.archiveName);
    if (!asset) {
        return null;
    }
    let latest_sdk_version: string = asset.updated_at;
    let version_file_path = vscode.Uri.joinPath(storage, "components", component.versionFile());
    let current_version = "";
    try {
        current_version = new TextDecoder().decode(await vscode.workspace.fs.readFile(version_file_path));
    } catch { }

    if ((current_version === latest_sdk_version) && (downloadedComponent !== undefined)) {
        return null;
    }

    return {
        componentArchivePath: componentArchivePath,
        asset: asset,
        componentInfo: componentInfo,
        version_file_path: version_file_path,
        latest_sdk_version: latest_sdk_version
    }
}

export async function installComponent<DownloadedComponent>(
    context: vscode.ExtensionContext,
    component: DownloadableComponentType<DownloadedComponent>,
    source: "command" | "auto" | "ensure"
) {
    let storage = context.globalStorageUri;
    var updateInfo: null | UpdateInfo<DownloadedComponent> = null;
    if (source === "auto") {
        updateInfo = await checkForUpdate(context, component);
        if (!updateInfo) {
            return
        }
    }

    await vscode.window.withProgress({
        title: `Installing ${component.getName()}`,
        location: vscode.ProgressLocation.Notification
    }, async (progress) => {
        if (source !== "auto") {
            progress.report({
                message: `checking version`
            });
            updateInfo = await checkForUpdate(context, component);
        }
        if (!updateInfo) {
            return
        }
        let { asset, componentArchivePath, componentInfo, version_file_path, latest_sdk_version } = updateInfo;

        let archiveResponse = await fetch(asset.browser_download_url);
        if (!archiveResponse.ok || !archiveResponse.body) {
            throw new Error("Fetch error");
        }
        let writer = fs.createWriteStream(componentArchivePath.fsPath);
        let reader = <ReadableStreamDefaultReader<Uint8Array>>(archiveResponse.body.getReader());
        var currentSize = 0;
        var lastPercentage = 0;
        while (true) {
            const { done, value } = await reader.read();
            if (value) {
                currentSize += value.length;
                var percentage = (currentSize / asset.size) * 100;
                if (componentInfo.isZip) {
                    percentage *= 0.5; // extracting will take significant part of time
                }
                progress.report({
                    increment: percentage - lastPercentage,
                    message: `downloading archive`
                });
                lastPercentage = percentage;
                await new Promise<void>((resolve, reject) => {
                    writer.write(value, (e) => {
                        if (e) {
                            reject(e);
                        }
                        resolve();
                    });
                });
            }
            if (done) {
                break;
            }
        }
        progress.report({
            message: `extracting archive`
        });
        if (componentInfo.isZip) {
            let data = new Promise<Buffer<ArrayBufferLike>>((resolve, reject) => {
                fs.readFile(componentArchivePath.fsPath, function (err, data) {
                    if (err) {
                        reject(err);
                    } else {
                        resolve(data);
                    }
                });
            });
            let files = (await jszip.loadAsync(data)).files;
            let filenames = Object.keys(files);

            // Shuffle to make progress smoother
            for (let i = filenames.length - 1; i > 0; i--) {
                const rand = Math.floor(Math.random() * (i + 1));
                [filenames[i], filenames[rand]] = [filenames[rand], filenames[i]];
            }

            var processedFiles = 0;
            for (const filename of filenames) {
                let file = files[filename];
                processedFiles += 1;
                let percentage = ((processedFiles / filenames.length) * 50) + 50;

                progress.report({
                    increment: percentage - lastPercentage,
                    message: `extracting ${filename.slice(filename.indexOf("/") + 1)}`
                });
                lastPercentage = percentage;

                if (file.dir) { continue; }
                let data = await file.async("uint8array");
                var outPath = vscode.Uri.joinPath(storage, "components");
                filename.split("/").forEach((part) => {
                    outPath = vscode.Uri.joinPath(outPath, part);
                });
                await vscode.workspace.fs.writeFile(outPath, data);
            }
        } else {
            await tar.extract({
                file: componentArchivePath.fsPath,
                cwd: vscode.Uri.joinPath(storage, "components").fsPath
            });
        }
        await vscode.workspace.fs.writeFile(version_file_path, new TextEncoder().encode(latest_sdk_version));
        await vscode.workspace.fs.delete(componentArchivePath, {
            useTrash: false
        });

        await cmake.checkCmakeExtension(context);
        await cache.clean(context);
    });
}

export async function ensureComponent<DownloadedComponent>(
    context: vscode.ExtensionContext,
    component: DownloadableComponentType<DownloadedComponent>
): Promise<DownloadedComponent | null> {
    let downloaded = await getDownloadedComponent(context, component);
    if (downloaded) {
        return downloaded;
    }
    let answer = await vscode.window.showWarningMessage(
        `${component.getName()} is not installed.`,
        { modal: true },
        "Download"
    );
    if (!answer) {
        return null;
    }
    await installComponent(context, component, "ensure");
    return await getDownloadedComponent(context, component);
}


export async function deleteComponent<DownloadedComponent>(
    context: vscode.ExtensionContext,
    component: DownloadableComponentType<DownloadedComponent>
) {
    let componentInfo = assumeDownloaded(context, component);
    await vscode.window.withProgress({
        location: vscode.ProgressLocation.Notification,
        title: `Deleting ${component.getName()}`
    }, async () => {
        try {
            await vscode.workspace.fs.delete(componentInfo.componentDir, { recursive: true, useTrash: false });
        } catch { }
        try {
            await vscode.workspace.fs.delete(
                vscode.Uri.joinPath(context.globalStorageUri, "components", component.versionFile()),
                { recursive: true, useTrash: false }
            );
        } catch { }
    });
}

export async function updateAll(
    context: vscode.ExtensionContext,
) {
    for (const component of ALL_DOWNLOADABLE_TYPES) {
        if (await getDownloadedComponent<unknown>(context, component)) {
            await installComponent<unknown>(context, component, "auto");
        }
    }
}

export async function ensureCLI(
    context: vscode.ExtensionContext,
    folder: vscode.WorkspaceFolder | null | undefined
): Promise<CLI | null> {
    let customBinary: string | undefined = vscode.workspace.getConfiguration("webrogue", folder).get("CliUtilityPath");
    if (!customBinary) {
        return await ensureComponent(context, CLI_DOWNLOADABLE_TYPE);
    }
    let customBinaryUri = vscode.Uri.file(customBinary);
    return new CLI(customBinaryUri)
}
