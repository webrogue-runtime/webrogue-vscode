export interface State {
    windows: {
        console: boolean,
    }
    android: {
        useDebugSignature: boolean,
        keystorePath: string,
        keyAlias: string,
        storePassword: string,
        keyPassword: string,
    }
}

export function getEmptyState(): State {
    return {
        windows: {
            console: false,
        },
        android: {
            useDebugSignature: false,
            keystorePath: "",
            keyAlias: "",
            keyPassword: "",
            storePassword: "",
        }
    }
}

export interface CommandMap {
    setState: State
    buildWindows: undefined
    buildLinux: undefined
    debug: undefined,
    buildAndroid: undefined,
    pickKeystore: undefined
}

export type CommandID = keyof (CommandMap);

export const IS_WINDOWS_CONSOLE_CHECKBOX_ID = "IS_WINDOWS_CONSOLE_CHECKBOX_ID";
export const BUILD_WINDOWS_BUTTON_ID = "BUILD_WINDOWS_BUTTON_ID";
export const BUILD_LINUX_BUTTON_ID = "BUILD_LINUX_BUTTON_ID";
export const DEBUG_BUTTON_ID = "DEBUG_BUTTON_ID";
export const BUILD_ANDROID_BUTTON_ID = "BUILD_ANDROID_BUTTON_ID";
export const IS_ANDROID_DEBUG_SIGNATURE_CHECKBOX_ID = "IS_ANDROID_DEBUG_SIGNATURE_CHECKBOX_ID";
export const ANDROID_ERROR_ID = "ANDROID_ERROR_ID";
export const ANDROID_KEYSTORE_TEXTFIELD_ID = "ANDROID_KEYSTORE_TEXTFIELD_ID";
export const ANDROID_KEYSTORE_PICK_ICON_ID = "ANDROID_KEYSTORE_PICK_BUTTON_ID";
export const ANDROID_KEY_ALIAS_TEXTFIELD_ID = "ANDROID_KEY_ALIAS_TEXTFIELD_ID";
export const ANDROID_STORE_PASSWORD_TEXTFIELD_ID = "ANDROID_STORE_PASSWORD_TEXTFIELD_ID";
export const ANDROID_KEY_PASSWORD_TEXTFIELD_ID = "ANDROID_KEY_PASSWORD_TEXTFIELD_ID";
