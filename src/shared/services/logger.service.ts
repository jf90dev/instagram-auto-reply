import { injectable } from "tsyringe";

import { createLogger, Logger, format, transports } from "winston";
import { ErrorBase } from "../models/error-handling/error-base.model";

@injectable()
export class LoggerService {
    private logger: Logger;
    private logLevel: string = process.env.LOG_LEVEL || "info";
    private correlationId?: string | null;
    private taskName?: string;

    constructor() {
        const logLevels = {
            fatal: 0,
            error: 1,
            warn: 2,
            info: 3,
            debug: 4,
            trace: 5
        };

        this.logger = createLogger({
            levels: logLevels,
            level: this.logLevel,
            format: format.combine(
                format.errors({ stack: true }),
                format.timestamp({
                    format: "YYYY-MM-DD hh:mm:ss.SSS"
                }),
                format.printf(info => `${info.level.toUpperCase()} ${info.message}`)
            ),
            // format.json()),
            transports: [new transports.Console()]
        });
    }

    public info(message: string) {
        this.logger.info(this.addTaskName(this.addCorrelationId(message)));
    }

    public error<T extends string>(error: ErrorBase<T>) {
        const message = `${error.stack ? error.stack : error.message}`;
        this.logger.error(this.addTaskName(this.addCorrelationId(message)));
    }

    public errorMessage(message: string) {
        this.logger.error(this.addTaskName(this.addCorrelationId(message)));
    }

    public warn(message: string) {
        this.logger.warn(this.addTaskName(this.addCorrelationId(message)));
    }

    public debug(message: string) {
        this.logger.debug(this.addTaskName(this.addCorrelationId(message)));
    }

    public verbose(message: string) {
        this.logger.verbose(this.addTaskName(this.addCorrelationId(message)));
    }

    public silly(message: string) {
        this.logger.silly(this.addCorrelationId(message));
    }

    public setCorrelationId(correlationId?: string) {
        this.correlationId = correlationId;
    }

    public unsetCorrelationId() {
        this.correlationId = null;
    }

    public setTaskName(taskName?: string) {
        this.taskName = taskName;
    }

    private addCorrelationId(message: string): string {
        return this.correlationId ? `{${this.correlationId}} ${message}` : message;
    }

    private addTaskName(message: string): string {
        return this.taskName ? `[${this.taskName}] ${message}` : message;
    }
}
