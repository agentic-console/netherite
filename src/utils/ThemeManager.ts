import { Logger } from './logger';

export class ThemeManager {
    private static currentTheme: 'light' | 'dark' = 'light';
    private static observers: Set<ShadowRoot> = new Set();

    /**
     * Detect if system is in dark mode
     */
    private static isDarkMode(): boolean {
        return window.matchMedia('(prefers-color-scheme: dark)').matches;
    }

    /**
     * Apply theme to a shadow root element
     */
    static applyTheme(shadowRoot: ShadowRoot): void {
        const isDark = this.isDarkMode();
        const root = shadowRoot.host as HTMLElement;
        
        if (isDark) {
            root.classList.add('netherite-dark-mode');
            this.currentTheme = 'dark';
        } else {
            root.classList.remove('netherite-dark-mode');
            this.currentTheme = 'light';
        }

        Logger.ui(`Theme applied: ${isDark ? 'dark' : 'light'}`, 'ThemeManager');
    }

    /**
     * Watch for system theme changes and update all registered shadow roots
     */
    static watchThemeChanges(shadowRoot: ShadowRoot): void {
        // Add to observers
        this.observers.add(shadowRoot);

        // Apply initial theme
        this.applyTheme(shadowRoot);

        // Watch for system theme changes
        const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
        
        const handleThemeChange = () => {
            Logger.debug('System theme changed');
            this.updateAllObservers();
        };

        // Modern browsers
        if (mediaQuery.addEventListener) {
            mediaQuery.addEventListener('change', handleThemeChange);
        } else {
            // Fallback for older browsers
            mediaQuery.addListener(handleThemeChange);
        }
    }

    /**
     * Update all registered shadow roots with current theme
     */
    private static updateAllObservers(): void {
        for (const shadowRoot of this.observers) {
            try {
                this.applyTheme(shadowRoot);
            } catch (error) {
                Logger.warn('Failed to update theme for shadow root:', error);
                // Remove invalid observer
                this.observers.delete(shadowRoot);
            }
        }
    }

    /**
     * Get CSS variables for current theme
     */
    static getThemeVariables(): Record<string, string> {
        const isDark = this.currentTheme === 'dark';

        return {
            // Glass effect colors
            '--netherite-glass-bg': isDark 
                ? 'rgba(30, 30, 30, 0.7)' 
                : 'rgba(255, 255, 255, 0.15)',
            
            '--netherite-glass-border': isDark 
                ? 'rgba(255, 255, 255, 0.1)' 
                : 'rgba(255, 255, 255, 0.3)',
            
            '--netherite-glass-shadow': isDark 
                ? '0 8px 32px rgba(0, 0, 0, 0.4)' 
                : '0 8px 32px rgba(0, 0, 0, 0.1)',
            
            '--netherite-glass-inset': isDark 
                ? 'inset 0 1px 0 rgba(255, 255, 255, 0.1)' 
                : 'inset 0 1px 0 rgba(255, 255, 255, 0.5)',

            // Metallic gradient
            '--netherite-metallic-bg': isDark
                ? 'linear-gradient(135deg, rgba(60, 60, 60, 0.3) 0%, rgba(40, 40, 40, 0.2) 50%, rgba(60, 60, 60, 0.3) 100%)'
                : 'linear-gradient(135deg, rgba(255, 255, 255, 0.2) 0%, rgba(200, 200, 200, 0.1) 50%, rgba(255, 255, 255, 0.2) 100%)',

            // Text colors
            '--netherite-text-primary': isDark ? '#ffffff' : '#1f2937',
            '--netherite-text-secondary': isDark ? '#d1d5db' : '#6b7280',
            '--netherite-text-accent': isDark ? '#60a5fa' : '#3b82f6',

            // UI element colors
            '--netherite-bg-primary': isDark ? '#111827' : '#ffffff',
            '--netherite-bg-secondary': isDark ? '#1f2937' : '#f9fafb',
            '--netherite-border': isDark ? '#374151' : '#e5e7eb',

            // Interactive elements
            '--netherite-hover-bg': isDark ? 'rgba(255, 255, 255, 0.1)' : 'rgba(0, 0, 0, 0.05)',
            '--netherite-active-bg': isDark ? 'rgba(255, 255, 255, 0.15)' : 'rgba(0, 0, 0, 0.1)',

            // Scanner effect
            '--netherite-scanner-color': 'rgba(59, 130, 246, 0.8)',
            '--netherite-scanner-glow': '0 0 20px rgba(59, 130, 246, 0.6)'
        };
    }

    /**
     * Inject theme CSS variables into shadow root
     */
    static injectThemeCSS(shadowRoot: ShadowRoot): void {
        const variables = this.getThemeVariables();
        
        let css = ':host {\n';
        for (const [property, value] of Object.entries(variables)) {
            css += `  ${property}: ${value};\n`;
        }
        css += '}\n';

        // Add base glassmorphic classes
        css += this.getGlassmorphicCSS();

        const style = document.createElement('style');
        style.textContent = css;
        shadowRoot.insertBefore(style, shadowRoot.firstChild);

        Logger.debug('Theme CSS injected into shadow root');
    }

    /**
     * Get glassmorphic CSS classes
     */
    private static getGlassmorphicCSS(): string {
        return `
.netherite-glass {
    background: var(--netherite-glass-bg);
    backdrop-filter: blur(20px) saturate(180%);
    -webkit-backdrop-filter: blur(20px) saturate(180%);
    border: 1px solid var(--netherite-glass-border);
    box-shadow: var(--netherite-glass-shadow), var(--netherite-glass-inset);
    border-radius: 16px;
}

.netherite-metallic {
    background: var(--netherite-metallic-bg);
}

.netherite-scanner {
    position: fixed;
    left: 0;
    width: 100%;
    height: 4px;
    background: linear-gradient(90deg, transparent, var(--netherite-scanner-color), transparent);
    box-shadow: var(--netherite-scanner-glow);
    z-index: 2147483646;
}

.netherite-hidden {
    display: none !important;
}

.netherite-dragging {
    pointer-events: none;
    user-select: none;
}

/* Smooth transitions */
.netherite-glass,
.netherite-metallic {
    transition: all 0.3s ease;
}

/* Hover effects */
.netherite-glass:hover {
    background: var(--netherite-hover-bg);
    transform: translateY(-1px);
}

/* Animation keyframes */
@keyframes netherite-scan-effect {
    0% {
        top: 0;
        opacity: 0.8;
    }
    100% {
        top: 100%;
        opacity: 0;
    }
}

@keyframes netherite-fade-in {
    from {
        opacity: 0;
        transform: translateY(10px);
    }
    to {
        opacity: 1;
        transform: translateY(0);
    }
}

@keyframes netherite-slide-up {
    from {
        opacity: 0;
        transform: translateY(20px);
    }
    to {
        opacity: 1;
        transform: translateY(0);
    }
}

.netherite-animate-scan {
    animation: netherite-scan-effect 2s ease-in-out;
}

.netherite-animate-fade-in {
    animation: netherite-fade-in 0.3s ease-out;
}

.netherite-animate-slide-up {
    animation: netherite-slide-up 0.4s ease-out;
}
        `;
    }

    /**
     * Remove a shadow root from theme observers
     */
    static removeObserver(shadowRoot: ShadowRoot): void {
        this.observers.delete(shadowRoot);
        Logger.debug('Shadow root removed from theme observers');
    }

    /**
     * Get current theme
     */
    static getCurrentTheme(): 'light' | 'dark' {
        return this.currentTheme;
    }

    /**
     * Force update all themes (useful for testing)
     */
    static forceUpdate(): void {
        this.updateAllObservers();
        Logger.debug('Forced theme update on all observers');
    }
}