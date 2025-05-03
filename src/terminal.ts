
import * as vscode from 'vscode';
import * as components from './components';
import * as childProcess from 'child_process';


type Run = (args: string[]) => Promise<void>;

export class TaskTerminal implements vscode.Pseudoterminal {
    private writeEmitter = new vscode.EventEmitter<string>();
    onDidWrite: vscode.Event<string> = this.writeEmitter.event;
    private closeEmitter = new vscode.EventEmitter<number>();
    onDidClose?: vscode.Event<number> = this.closeEmitter.event;
    private process?: childProcess.ChildProcess;

    constructor(
        private context: vscode.ExtensionContext,
        private folder: vscode.WorkspaceFolder | null,
        private work: (run: Run) => Promise<void>,
    ) { }

    private print(str: string) {
        this.writeEmitter.fire(str.replaceAll("\n", "\r\n"));
    }

    open(initialDimensions: vscode.TerminalDimensions | undefined): void {
        this.doBuild();
    }


    private async doBuild(): Promise<void> {
        try {
            let cliInfo = await components.ensureCLI(this.context, this.folder);
            if (!cliInfo) {
                throw Error("Webrogue CLI utility is not installed.");
            }
            await this.work(async (args) => {
                let promise = new Promise<void>((resolve, reject) => {
                    this.process = childProcess.execFile(cliInfo.bin.fsPath, args, (error, stdout, stderr) => {
                        delete this.process;
                        if (error) {
                            reject(error);
                        } else {
                            resolve();
                        }
                    });
                    this.process.stdout?.on('data', (data) => {
                        this.print(<string>data);
                    });
                    this.process.stderr?.on('data', (data) => {
                        this.print(<string>data);
                    });
                });
                await promise;
            });
        } catch (e) {
            this.print(`${e}`);
            this.closeEmitter.fire(1);
            return;
        }
        this.closeEmitter.fire(0);
    }

    close(): void {
        if (this.process) {
            this.process.kill();
        }
    }
}