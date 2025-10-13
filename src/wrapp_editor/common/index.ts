type Entry<Request, Response> = {
    request: Request,
    response: Response
}

export interface CommandMap {
    setState: Entry<string, number>,
    debug: Entry<number, string>,
}

export type CommandID = keyof (CommandMap);

export interface CommandRequest<Command extends CommandID> {
    command: Command,
    requestId: number,
    data: CommandMap[Command]["request"]
}

export interface CommandResponse<Command extends CommandID> {
    requestId: number,
    data: CommandMap[Command]["response"]
}
