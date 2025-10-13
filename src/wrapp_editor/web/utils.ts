import { CommandID, CommandMap, CommandRequest, CommandResponse } from "../common";


interface WebviewApi<StateType> {
    postMessage(message: unknown): void;
    getState(): StateType | undefined;
    setState<T extends StateType | undefined>(newState: T): T;
}

declare global {
    function acquireVsCodeApi<StateType = unknown>(): WebviewApi<StateType>;
}

const vscode = acquireVsCodeApi();

const handleMap: Map<number, (response: CommandResponse<CommandID>) => void> = new Map()
let totalRequestNumber = 0;

export function sendCommand<Command extends CommandID>(command: Command, data: CommandMap[Command]["request"]): Promise<CommandMap[Command]["response"]> {
    return new Promise((resolve) => {
        totalRequestNumber++;
        const currentRequestId = totalRequestNumber
        const request: CommandRequest<Command> = {
            requestId: currentRequestId,
            data: data,
            command: command
        };
        handleMap.set(currentRequestId, (rawResponse) => {
            const response = rawResponse as CommandResponse<Command>
            resolve(response.data)
            handleMap.delete(currentRequestId)
        });
        vscode.postMessage(request)
    })
}



function onMessage(data: unknown) {
    const response = data as CommandResponse<CommandID>
    const handler = handleMap.get(response.requestId)
    if (handler)
        handler(response)
}

export function init() {
    window.addEventListener('message', async e => {
        onMessage(e.data);
    });
}