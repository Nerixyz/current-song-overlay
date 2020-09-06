import * as log from "https://deno.land/std/log/mod.ts";

export default async function setup() {
    const fileHandler = new log.handlers.RotatingFileHandler("INFO", {
        filename: "log.txt",
        maxBackupCount: 10,
        maxBytes: 1048576,
        formatter: '{datetime}: {levelName} {msg}'
    });
    await log.setup({
        handlers: {
            console: new log.handlers.ConsoleHandler("DEBUG"),
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
    return () => clearInterval(intervalId);
}
