import * as vscode from 'vscode';

async function getDir(context: vscode.ExtensionContext): Promise<vscode.Uri> {
    var dir = context.globalStorageUri;
    try {
        await vscode.workspace.fs.createDirectory(dir);
    } catch { };
    dir = vscode.Uri.joinPath(dir, "compilation_cache");
    try {
        await vscode.workspace.fs.createDirectory(dir);
    } catch { };
    return dir;
}

export async function clean(context: vscode.ExtensionContext) {
    let dir = await getDir(context);
    for (const entry of (await vscode.workspace.fs.readDirectory(dir))) {
        await vscode.workspace.fs.delete(
            vscode.Uri.joinPath(dir, entry[0]),
            { recursive: true, useTrash: false }
        );
    }
}

export async function getConfig(context: vscode.ExtensionContext): Promise<vscode.Uri> {
    let dir = await getDir(context);
    let configFile = vscode.Uri.joinPath(dir, "config.toml");
    let oldConfigFileContent: string | undefined;
    try {
        oldConfigFileContent = new TextDecoder().decode(await vscode.workspace.fs.readFile(configFile));
    } catch { };
    let newConfigFileContent = `[cache]
enabled = true
directory = '${dir.fsPath}'
cleanup-interval = "30m"
files-total-size-soft-limit = "1Gi"`;
    if (oldConfigFileContent !== newConfigFileContent) {
        await vscode.workspace.fs.writeFile(configFile, new TextEncoder().encode(newConfigFileContent));
    }
    return configFile;
}