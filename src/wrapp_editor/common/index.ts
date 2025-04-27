export interface State {
    isWindowsConsole: boolean
}

export interface CommandMap {
    setState: State
    buildWindows: undefined
    buildLinux: undefined
    debug: undefined
}

export type CommandID = keyof (CommandMap);

export const IS_WINDOWS_CONSOLE_CHECKBOX_ID = "IS_WINDOWS_CONSOLE_CHECKBOX_ID";
export const BUILD_WINDOWS_BUTTON_ID = "BUILD_WINDOWS_BUTTON_ID";
export const BUILD_LINUX_BUTTON_ID = "BUILD_LINUX_BUTTON_ID";
export const DEBUG_BUTTON_ID = "DEBUG_BUTTON_ID";
