import winston from 'winston';

export const logger = winston.createLogger({
    level: 'info',
    format: winston.format.combine(
        winston.format.timestamp(),
        winston.format.json()
    ),
    transports: [
        new winston.transports.Console(),
        new winston.transports.File({ filename: 'error.log', level: 'error' }),
        new winston.transports.File({ filename: 'combined.log' }),
        new winston.transports.File({ filename: 'warn.log', level: 'warn' }),
        new winston.transports.File({ filename: 'info.log', level: 'info' }),
        new winston.transports.File({ filename: 'log.log', level: 'log' }),
    ]
}); 