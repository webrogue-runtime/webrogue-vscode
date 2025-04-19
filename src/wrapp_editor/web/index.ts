import * as common from '../common';

const vscode = acquireVsCodeApi();

window.addEventListener('message', async e => {
    init(e.data);
});

function init(state: common.State) {
    function sendState() {
        vscode.postMessage({
            command: common.SET_STATE_COMMAND,
            state: state
        });
    }

    let isWindowConsoleCheckbox = <HTMLInputElement>document.getElementById(common.IS_WINDOWS_CONSOLE_CHECKBOX_ID)!;
    isWindowConsoleCheckbox.checked = state.isWindowsConsole;
    isWindowConsoleCheckbox.addEventListener("input", () => {
        state.isWindowsConsole = isWindowConsoleCheckbox.checked;
        sendState();
    });

    let buildWindowsButton = <HTMLButtonElement>document.getElementById(common.BUILD_WINDOWS_BUTTON_ID)!;
    buildWindowsButton.addEventListener("click", () => {
        vscode.postMessage({
            command: common.BUILD_WINDOWS_COMMAND

        });
    });

    let buildLinuxButton = <HTMLButtonElement>document.getElementById(common.BUILD_LINUX_BUTTON_ID)!;
    buildLinuxButton.addEventListener("click", () => {
        vscode.postMessage({
            command: common.BUILD_LINUX_COMMAND

        });
    });
}