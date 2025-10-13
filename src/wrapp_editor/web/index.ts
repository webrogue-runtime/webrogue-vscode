import { init } from "./utils";

init()

declare global {
    var WebroguePlatform: object;
}
globalThis.WebroguePlatform = {
    vscode: true,
};

