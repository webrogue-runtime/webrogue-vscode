import * as vscode from 'vscode';
import * as fs from 'fs';
import * as os from 'os';
import * as tar from 'tar';
import * as cmake from './cmake';
import * as jszip from 'jszip';

function assumeSDKInfo(context: vscode.ExtensionContext): {
    sdkName: string,
    sdk: vscode.Uri,
    archiveName: string,
    isZip: boolean,
    webrogueBin: vscode.Uri,
    p1ToolchainFile: vscode.Uri
} {
    let sdkName;
    let isZip;
    var exeSuffix = "";

    if (os.platform() === "linux") {
        if (os.arch() === "x64") {
            sdkName = "webrogue-x86_64-linux";
            isZip = false;
        } else {
            throw new Error("Unsupported platform");
        }
    } else if (os.platform() === "win32") {
        if (os.arch() === "x64") {
            sdkName = "webrogue-x86_64-windows";
            isZip = true;
            exeSuffix = ".exe";
        } else {
            throw new Error("Unsupported platform");
        }
    } else {
        throw new Error("Unsupported platform");
    }
    let storage = context.globalStorageUri;
    let sdk = vscode.Uri.joinPath(storage, sdkName);
    let webrogueBin = vscode.Uri.joinPath(sdk, "bin", "webrogue" + exeSuffix);
    let p1ToolchainFile = vscode.Uri.joinPath(sdk, "share", "cmake", "wasi-sdk-p1-pthread.cmake");
    return {
        sdkName: sdkName,
        sdk: sdk,
        archiveName: sdkName + (isZip ? ".zip" : ".tar.gz"),
        isZip: isZip,
        webrogueBin: webrogueBin,
        p1ToolchainFile: p1ToolchainFile
    };
}

export interface SDKInfo {
    webrogueBin: vscode.Uri,
    p1ToolchainFile: vscode.Uri
}

export async function getSDK(context: vscode.ExtensionContext): Promise<SDKInfo | undefined> {
    let sdkInfo = assumeSDKInfo(context);
    try {
        await vscode.workspace.fs.stat(sdkInfo.webrogueBin);
    } catch {
        return;
    }
    try {
        await vscode.workspace.fs.stat(sdkInfo.p1ToolchainFile);
    } catch {
        return;
    }
    return {
        webrogueBin: sdkInfo.webrogueBin,
        p1ToolchainFile: sdkInfo.p1ToolchainFile
    };
}

export async function installSDK(context: vscode.ExtensionContext) {
    await vscode.window.withProgress({
        title: "Installing Webrogue SDK",
        location: vscode.ProgressLocation.Notification
    }, async (progress) => {
        let storage = context.globalStorageUri;
        try {
            await vscode.workspace.fs.createDirectory(storage);
        } catch { };
        let sdkInfo = assumeSDKInfo(context);
        let sdk = await getSDK(context);
        let sdk_archive_path = vscode.Uri.joinPath(storage, sdkInfo.archiveName);

        progress.report({
            message: "checking version"
        });
        let metadata_response = await fetch("https://api.github.com/repos/webrogue-runtime/webrogue/releases/latest", {
            headers: [
                ["Accept", "application/vnd.github+json"],
                ["X-GitHub-Api-Version", "2022-11-28"]
            ]
        });
        if (!metadata_response.ok || !metadata_response.body) {
            throw new Error("Fetch error");
        }
        let response = JSON.parse(await (await metadata_response.blob()).text());

        let latest_sdk_version: string = response["created_at"];
        let asset = (<{ name: string, size: number, browser_download_url: string }[]>response["assets"]).find(asset => asset.name === sdkInfo.archiveName);
        if (!asset) {
            return;
        }
        let version_file_path = vscode.Uri.joinPath(storage, "sdk_version");
        let current_version = "";
        try {
            current_version = new TextDecoder().decode(await vscode.workspace.fs.readFile(version_file_path));
        } catch { }

        if ((current_version === latest_sdk_version) && (sdk !== undefined)) {
            return;
        }
        let archiveResponse = await fetch(asset.browser_download_url);

        if (!archiveResponse.ok || !archiveResponse.body) {
            throw new Error("Fetch error");
        }
        let writer = fs.createWriteStream(sdk_archive_path.fsPath);
        let reader = <ReadableStreamDefaultReader<Uint8Array>>(archiveResponse.body.getReader());
        var currentSize = 0;
        var lastPercentage = 0;
        while (true) {
            const { done, value } = await reader.read();
            if (value) {
                currentSize += value.length;
                var percentage = (currentSize / asset.size) * 100;
                if (sdkInfo.isZip) {
                    percentage *= 0.5; // extracting will take significant part of time
                }
                progress.report({
                    increment: percentage - lastPercentage,
                    message: "downloading archive"
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
            message: "extracting archive"
        });
        if (sdkInfo.isZip) {
            let data = new Promise<Buffer<ArrayBufferLike>>((resolve, reject) => {
                fs.readFile(sdk_archive_path.fsPath, function (err, data) {
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
                var outPath = storage;
                filename.split("/").forEach((part) => {
                    outPath = vscode.Uri.joinPath(outPath, part);
                });
                await vscode.workspace.fs.writeFile(outPath, data);
            }
        } else {
            await tar.extract({ file: sdk_archive_path.fsPath, cwd: storage.fsPath });
        }
        await vscode.workspace.fs.writeFile(version_file_path, new TextEncoder().encode(latest_sdk_version));
        await vscode.workspace.fs.delete(sdk_archive_path, {
            useTrash: false
        });

        await cmake.checkCmakeExtension(context);
    });
}

export async function ensureSDK(context: vscode.ExtensionContext): Promise<SDKInfo | undefined> {
    let sdk = await getSDK(context);
    if (sdk) {
        return sdk;
    }
    let answer = await vscode.window.showWarningMessage("Webrogue SDK is not installed.", "Download");
    if (!answer) {
        return;
    }
    await installSDK(context);
    return await getSDK(context);
}


export async function deleteSDK(context: vscode.ExtensionContext) {
    let sdkInfo = assumeSDKInfo(context);
    await vscode.window.withProgress({
        location: vscode.ProgressLocation.Notification,
        title: "Deleting Webrogue SDK"
    }, async () => {
        try {
            await vscode.workspace.fs.delete(sdkInfo.sdk, { recursive: true, useTrash: false });
        } catch { }
        try {
            await vscode.workspace.fs.delete(
                vscode.Uri.joinPath(context.globalStorageUri, "sdk_version"),
                { recursive: true, useTrash: false }
            );
        } catch { }
    });
}
