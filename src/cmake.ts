
import * as vscode from 'vscode';
import * as components from './components';

function getWatchedCmakeKitsPath(api: any): string | undefined {
    let watched: object = api.manager.kitsWatcher.getWatched();
    let dirs = Object.keys(watched).filter(path => path.endsWith("CMakeTools"));
    if (dirs.length !== 1) { return; }
    return vscode.Uri.joinPath(vscode.Uri.file(dirs[0]), "cmake-tools-kits.json").fsPath;
}

export async function checkCmakeExtension(context: vscode.ExtensionContext) {
    let cmake_extension = vscode.extensions.getExtension("ms-vscode.cmake-tools");
    if (cmake_extension) {

        let sdk_info;
        try {
            sdk_info = await components.getDownloadedComponent(context, components.SDK_DOWNLOADABLE_TYPE);
        } catch {
            return;
        }
        if (!sdk_info) { return; }
        var cmakeKitsPath = context.globalState.get<string>("cmakeKitsPath");
        if (!cmakeKitsPath) {
            let exports = await cmake_extension.activate();
            let api = exports.getApi(2);
            cmakeKitsPath = getWatchedCmakeKitsPath(api);
            if (cmakeKitsPath) {
                await context.globalState.update("cmakeKitsPath", cmakeKitsPath);
            } else {
                await vscode.commands.executeCommand("cmake.scanForKits");
                cmakeKitsPath = getWatchedCmakeKitsPath(api);
                if (!cmakeKitsPath) {
                    return;
                }
            }
        }
        let kitsContent: { name: string, toolchainFile?: string }[] = [];
        let dirty = false;
        try {
            kitsContent = JSON.parse(new TextDecoder().decode(await vscode.workspace.fs.readFile(vscode.Uri.file(cmakeKitsPath))));
        } catch { dirty = true; };
        var missingKits: { name: string, toolchainFile?: string }[] = [
            { name: "Webrogue WASIp1-threads", toolchainFile: sdk_info.p1ToolchainFile.fsPath }
        ];
        let oldKitsCount = kitsContent.length;
        // Remove kits where only name or toolchain matches
        kitsContent = kitsContent.filter(kit =>
            !missingKits.find(missingKit =>
                (kit.name !== missingKit.name) !== (kit.toolchainFile !== missingKit.toolchainFile)
            )
        );
        if (oldKitsCount !== kitsContent.length) {
            dirty = true;
        }
        kitsContent.forEach(kit => {
            missingKits = missingKits.filter(missingKit =>
                kit.name !== missingKit.name || kit.toolchainFile !== missingKit.toolchainFile
            );
        });
        if (missingKits.length > 0) {
            dirty = true;
            kitsContent = kitsContent.concat(missingKits);
        }
        if (dirty) {
            await vscode.workspace.fs.writeFile(vscode.Uri.file(cmakeKitsPath), new TextEncoder().encode(JSON.stringify(kitsContent, null, 2)));
        }
    }
}