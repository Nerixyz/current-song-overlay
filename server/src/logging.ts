import * as log from "https://deno.land/std/log/mod.ts";

export default function setup() {
    return log.setup({
        handlers: {
            console: new log.handlers.ConsoleHandler("DEBUG"),
            logFile: new log.handlers.RotatingFileHandler("INFO", {
                filename: "log.txt",
                maxBackupCount: 10,
                maxBytes: 8192,
            }),
        },
        loggers: {
            default: {
                level: 'DEBUG',
                handlers: Deno.env.get('NON_BUILD_ENV') ? ['console'] : ['console', 'logFile'],
            }
        }
    });
}
