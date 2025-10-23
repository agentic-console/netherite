export class Logger {
    private static readonly PREFIX = '[Netherite]';
    private static isDevelopment = true; // Set to false for production builds

    static info(message: string, ...args: any[]): void {
        if (this.isDevelopment || this.shouldLog('info')) {
            console.info(`${this.PREFIX} ℹ️`, message, ...args);
        }
    }

    static warn(message: string, ...args: any[]): void {
        if (this.isDevelopment || this.shouldLog('warn')) {
            console.warn(`${this.PREFIX} ⚠️`, message, ...args);
        }
    }

    static error(message: string, ...args: any[]): void {
        console.error(`${this.PREFIX} ❌`, message, ...args);
    }

    static debug(message: string, ...args: any[]): void {
        if (this.isDevelopment) {
            console.debug(`${this.PREFIX} 🐛`, message, ...args);
        }
    }

    static success(message: string, ...args: any[]): void {
        if (this.isDevelopment || this.shouldLog('info')) {
            console.log(`${this.PREFIX} ✅`, message, ...args);
        }
    }

    static trace(operation: string, duration?: number): void {
        if (this.isDevelopment) {
            const durationText = duration ? ` (${duration}ms)` : '';
            console.log(`${this.PREFIX} 📊 ${operation}${durationText}`);
        }
    }

    /**
     * Log AI session lifecycle events
     */
    static aiSession(event: 'create' | 'prompt' | 'destroy', details?: any): void {
        const emoji = {
            create: '🚀',
            prompt: '💭',
            destroy: '🗑️'
        };
        
        if (this.isDevelopment) {
            console.log(`${this.PREFIX} ${emoji[event]} AI Session ${event}`, details || '');
        }
    }

    /**
     * Log UI events with specific styling
     */
    static ui(event: string, component: string, details?: any): void {
        if (this.isDevelopment) {
            console.log(`${this.PREFIX} 🎨 UI [${component}] ${event}`, details || '');
        }
    }

    /**
     * Log Chrome Extension API calls
     */
    static chromeAPI(api: string, action: string, result?: any): void {
        if (this.isDevelopment) {
            console.log(`${this.PREFIX} 🔌 Chrome.${api} ${action}`, result || '');
        }
    }

    private static shouldLog(level: 'info' | 'warn'): boolean {
        // In production, only log warnings and errors
        // Can be configured based on extension settings
        return level === 'warn';
    }

    /**
     * Create a performance timer for measuring operation duration
     */
    static startTimer(operation: string): () => void {
        const start = performance.now();
        
        return () => {
            const duration = Math.round(performance.now() - start);
            this.trace(operation, duration);
        };
    }

    /**
     * Log form field operations
     */
    static field(action: 'detect' | 'inject' | 'analyze', field: string, success: boolean = true): void {
        const emoji = success ? '✅' : '❌';
        if (this.isDevelopment) {
            console.log(`${this.PREFIX} 📝 Field ${action}: ${field} ${emoji}`);
        }
    }
}