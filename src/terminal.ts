
import * as vscode from 'vscode';
import * as sdk from './sdk';
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
            let sdkInfo = await sdk.ensureSDK(this.context);
            if (!sdkInfo) {
                throw Error("Webrogue SDK is not installed.");
            }
            await this.work(async (args) => {
                let promise = new Promise<void>((resolve, reject) => {
                    this.process = childProcess.execFile(sdkInfo.webrogueBin.fsPath, args, (error, stdout, stderr) => {
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