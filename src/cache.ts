import * as vscode from 'vscode';

async function assumeDirAndConfigPath(context: vscode.ExtensionContext): Promise<{ dir: vscode.Uri, config: vscode.Uri }> {
    var dir = context.globalStorageUri;
    try {
        await vscode.workspace.fs.createDirectory(dir);
    } catch { };
    let config = vscode.Uri.joinPath(dir, "cache.toml");
    dir = vscode.Uri.joinPath(dir, "compilation_cache");
    try {
        await vscode.workspace.fs.createDirectory(dir);
    } catch { };
    return {
        dir: dir,
        config: config
    };
}

export async function clean(context: vscode.ExtensionContext) {
    let dir = (await assumeDirAndConfigPath(context)).dir;
    for (const entry of (await vscode.workspace.fs.readDirectory(dir))) {
        await vscode.workspace.fs.delete(
            vscode.Uri.joinPath(dir, entry[0]),
            { recursive: true, useTrash: false }
        );
    }
}

export async function getConfig(context: vscode.ExtensionContext): Promise<vscode.Uri> {
    let { dir, config } = await assumeDirAndConfigPath(context);
    let oldConfigFileContent: string | undefined;
    try {
        oldConfigFileContent = new TextDecoder().decode(await vscode.workspace.fs.readFile(config));
    } catch { };
    let newConfigFileContent = `[cache]
enabled = true
directory = '${dir.fsPath}'
cleanup-interval = "30m"
files-total-size-soft-limit = "1Gi"`;
    if (oldConfigFileContent !== newConfigFileContent) {
        await vscode.workspace.fs.writeFile(config, new TextEncoder().encode(newConfigFileContent));
    }
    return config;
}

export async function getBuildDir(context: vscode.ExtensionContext, domain: string): Promise<vscode.Uri> {
    var dir = context.globalStorageUri;
    try {
        await vscode.workspace.fs.createDirectory(dir);
    } catch { };
    dir = vscode.Uri.joinPath(dir, "build");
    try {
        await vscode.workspace.fs.createDirectory(dir);
    } catch { };
    dir = vscode.Uri.joinPath(dir, domain);
    try {
        await vscode.workspace.fs.createDirectory(dir);
    } catch { };
    return dir;
}