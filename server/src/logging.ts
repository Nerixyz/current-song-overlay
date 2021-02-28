import * as log from "https://deno.land/std@0.88.0/log/mod.ts";

export default async function setup(name: string) {
    const fileHandler = new log.handlers.RotatingFileHandler("INFO", {
        filename: `log.${name}.txt`,
        maxBackupCount: 10,
        maxBytes: 1048576,
        formatter: `{datetime}: ${name}::{levelName} {msg}`
    });
    await log.setup({
        handlers: {
            console: new log.handlers.ConsoleHandler("DEBUG", {
                formatter: `${name}::{levelName} {msg}`
            }),
            logFile: fileHandler,
        },
        loggers: {
            default: {
                level: 'DEBUG',
                handlers: Deno.env.get('NON_BUILD_ENV') ? ['console'] : ['console', 'logFile'],
            }
        }
    });
    const intervalId = setInterval(() => fileHandler.flush(), 1000 * 30);
    return (() => {
        clearInterval(intervalId);
        fileHandler.flush();
    });
}
