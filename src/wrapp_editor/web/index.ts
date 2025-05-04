import * as common from '../common';
import '@vscode-elements/elements/dist/vscode-button/index';
import "@vscode-elements/elements/dist/vscode-tabs/index";
import "@vscode-elements/elements/dist/vscode-checkbox/index";
import "@vscode-elements/elements/dist/vscode-textfield/index";
import "@vscode-elements/elements/dist/vscode-icon/index";
import { VscodeIcon } from '@vscode-elements/elements/dist/vscode-icon';
import * as utils from './utils';


// General
utils.findButton(common.DEBUG_BUTTON_ID, "debug", undefined);

// Windows
let windowConsoleCheckbox = utils.findCheckbox(common.IS_WINDOWS_CONSOLE_CHECKBOX_ID, (checked) => {
    utils.state.windows.console = checked;
    validate();
});
utils.findButton(common.BUILD_WINDOWS_BUTTON_ID, "buildWindows", undefined);

// Linux
utils.findButton(common.BUILD_LINUX_BUTTON_ID, "buildLinux", undefined);

// Android
let androidDebugSignatureCheckbox = utils.findCheckbox(common.IS_ANDROID_DEBUG_SIGNATURE_CHECKBOX_ID, (checked) => {
    utils.state.android.useDebugSignature = checked;
    validate();
});
let androidKeystoreTextfield = utils.findTextField(common.ANDROID_KEYSTORE_TEXTFIELD_ID, (value) => {
    utils.state.android.keystorePath = value;
    validate();
});
(<VscodeIcon>document.getElementById(common.ANDROID_KEYSTORE_PICK_ICON_ID)!).addEventListener("click", () => {
    utils.sendCommand("pickKeystore", undefined);
});
let androidKeyAliasTextfield = utils.findTextField(common.ANDROID_KEY_ALIAS_TEXTFIELD_ID, (value) => {
    utils.state.android.keyAlias = value;
    validate();
});
let androidStorePasswordTextfield = utils.findTextField(common.ANDROID_STORE_PASSWORD_TEXTFIELD_ID, (value) => {
    utils.state.android.storePassword = value;
    validate();
});
let androidKeyPasswordTextfield = utils.findTextField(common.ANDROID_KEY_PASSWORD_TEXTFIELD_ID, (value) => {
    utils.state.android.keyPassword = value;
    validate();
});
let androidErrorDiv = <HTMLDivElement>document.getElementById(common.ANDROID_ERROR_ID)!;
let androidBuildButton = utils.findButton(common.BUILD_ANDROID_BUTTON_ID, "buildAndroid", undefined);

function init(newState: common.State) {
    utils.state.windows = newState.windows;
    utils.state.android = newState.android;

    windowConsoleCheckbox.checked = newState.windows.console;
    androidDebugSignatureCheckbox.checked = newState.android.useDebugSignature;
    androidKeystoreTextfield.value = newState.android.keystorePath;
    androidKeyAliasTextfield.value = newState.android.keyAlias;
    androidStorePasswordTextfield.value = newState.android.storePassword;
    androidKeyPasswordTextfield.value = newState.android.keyPassword;
    validate();
}
init(utils.state);
window.addEventListener('message', async e => {
    init(e.data);
});

function validate() {
    androidErrorDiv.textContent = null;
    androidKeystoreTextfield.disabled = utils.state.android.useDebugSignature;
    androidKeyAliasTextfield.disabled = utils.state.android.useDebugSignature;
    androidStorePasswordTextfield.disabled = utils.state.android.useDebugSignature;
    androidKeyPasswordTextfield.disabled = utils.state.android.useDebugSignature;
    {
        let androidBuildError: string | undefined;
        if (!utils.state.android.useDebugSignature) {
            if (utils.state.android.keystorePath.length == 0) {
                androidBuildError = "Unable to build because keystore file path is not specified";
            } else if (utils.state.android.keyAlias.length == 0) {
                androidBuildError = "Unable to build because key alias is not specified";
            } else if (utils.state.android.storePassword.length == 0) {
                androidBuildError = "Unable to build because store password is not specified";
            }
        }
        androidErrorDiv.textContent = androidBuildError ?? null;
        androidBuildButton.disabled = androidBuildError !== undefined;
    }
}
validate();
