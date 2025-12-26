/**
 * Logger Utility - Development-only logging
 * 
 * In production builds (import.meta.env.PROD), logs are suppressed.
 * Errors are always logged regardless of environment.
 */

const isDev = import.meta.env.DEV;

export const logger = {
    /**
     * Log general information (dev only)
     */
    log: (...args: unknown[]): void => {
        if (isDev) console.log(...args);
    },

    /**
     * Log warnings (dev only)
     */
    warn: (...args: unknown[]): void => {
        if (isDev) console.warn(...args);
    },

    /**
     * Log errors (always, even in production)
     */
    error: (...args: unknown[]): void => {
        console.error(...args);
    },

    /**
     * Log debug info (dev only)
     */
    debug: (...args: unknown[]): void => {
        if (isDev) console.debug(...args);
    },

    /**
     * Log info (dev only)
     */
    info: (...args: unknown[]): void => {
        if (isDev) console.info(...args);
    },
};

export default logger;
