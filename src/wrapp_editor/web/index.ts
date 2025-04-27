import * as common from '../common';

const vscode = acquireVsCodeApi();

window.addEventListener('message', async e => {
    init(e.data);
});

function init(state: common.State) {
    function sendCommand<Command extends common.CommandID>(id: Command, data: common.CommandMap[Command]) {
        vscode.postMessage({
            command: id,
            data: data
        });
    }

    function sendState() {
        sendCommand("setState", state);
    }

    let debugButton = <HTMLButtonElement>document.getElementById(common.DEBUG_BUTTON_ID)!;
    debugButton.addEventListener("click", () => {
        sendCommand("debug", undefined);
    });

    let isWindowConsoleCheckbox = <HTMLInputElement>document.getElementById(common.IS_WINDOWS_CONSOLE_CHECKBOX_ID)!;
    isWindowConsoleCheckbox.checked = state.isWindowsConsole;
    isWindowConsoleCheckbox.addEventListener("input", () => {
        state.isWindowsConsole = isWindowConsoleCheckbox.checked;
        sendState();
    });

    let buildWindowsButton = <HTMLButtonElement>document.getElementById(common.BUILD_WINDOWS_BUTTON_ID)!;
    buildWindowsButton.addEventListener("click", () => {
        sendCommand("buildWindows", undefined);
    });

    let buildLinuxButton = <HTMLButtonElement>document.getElementById(common.BUILD_LINUX_BUTTON_ID)!;
    buildLinuxButton.addEventListener("click", () => {
        sendCommand("buildLinux", undefined);
    });
}