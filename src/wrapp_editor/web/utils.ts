
import { VscodeCheckbox } from "@vscode-elements/elements/dist/vscode-checkbox/index";
import { VscodeButton } from '@vscode-elements/elements/dist/vscode-button/index';
import { VscodeTextfield } from '@vscode-elements/elements/dist/vscode-textfield/index';
import * as common from '../common';

const vscode = acquireVsCodeApi();

export function sendCommand<Command extends common.CommandID>(id: Command, data: common.CommandMap[Command]) {
    vscode.postMessage({
        command: id,
        data: data
    });
}

export var state = common.getEmptyState();

function sendState() {
    sendCommand("setState", state);
}

export function findTextField(
    elementId: string,
    callback: (value: string) => void
): VscodeTextfield {
    let textfield = <VscodeTextfield>document.getElementById(elementId)!;
    textfield.addEventListener("input", () => {
        callback(textfield.value);
        sendState();
    });
    return textfield;
}

export function findCheckbox(
    elementId: string,
    callback: (checked: boolean) => void
): VscodeCheckbox {
    let checkbox = <VscodeCheckbox>document.getElementById(elementId)!;
    checkbox.addEventListener("change", () => {
        callback(checkbox.checked);
        sendState();
    });
    return checkbox;
}

export function findButton<Command extends common.CommandID>(
    elementId: string,
    command: Command,
    data: common.CommandMap[Command] | (() => common.CommandMap[Command]),
): VscodeButton {
    let button = <VscodeButton>document.getElementById(elementId)!;
    button.addEventListener("click", () => {
        if (typeof data === "function") {
            sendCommand(command, data());
        } else {
            sendCommand(command, data);
        }
    });
    return button;
}
