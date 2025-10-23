export class Constants {
    // Z-index values for UI layering
    static readonly Z_INDEX = {
        FLOATING_TOOLBAR: 2147483647,
        SCANNER_OVERLAY: 2147483646,
        CHAT_PANEL: 2147483645,
        VIEW_PANEL: 2147483644
    };

    // Element IDs (prefixed to avoid conflicts)
    static readonly IDS = {
        FLOATING_TOOLBAR: 'netherite-floating-toolbar',
        CHAT_PANEL: 'netherite-chat-panel',
        VIEW_PANEL: 'netherite-view-panel',
        SCANNER_OVERLAY: 'netherite-scanner-overlay'
    };

    // CSS class names
    static readonly CLASSES = {
        GLASS: 'netherite-glass',
        GLASS_DARK: 'netherite-glass-dark',
        METALLIC: 'netherite-metallic',
        METALLIC_DARK: 'netherite-metallic-dark',
        DARK_MODE: 'netherite-dark-mode',
        SCANNER: 'netherite-scanner',
        HIDDEN: 'netherite-hidden',
        DRAGGING: 'netherite-dragging'
    };

    // Animation durations (in milliseconds)
    static readonly ANIMATIONS = {
        SCANNER_DURATION: 2000,
        FADE_DURATION: 300,
        SLIDE_DURATION: 400
    };

    // Chrome Storage keys
    static readonly STORAGE_KEYS = {
        CURRENT_DOCUMENT: 'netherite_current_document',
        CHAT_HISTORY: 'netherite_chat_history',
        USER_PREFERENCES: 'netherite_preferences',
        TOOLBAR_POSITION: 'netherite_toolbar_position'
    };

    // Keyboard shortcuts
    static readonly SHORTCUTS = {
        ACTIVATE_TOOLBAR: 'Alt+KeyN'
    };

    // Form field types for detection
    static readonly FIELD_TYPES = {
        TEXT: ['text', 'email', 'password', 'tel', 'url'],
        TEXTAREA: ['textarea'],
        SELECT: ['select-one', 'select-multiple'],
        DATE: ['date', 'datetime-local', 'time'],
        NUMBER: ['number', 'range'],
        CHECKBOX: ['checkbox'],
        RADIO: ['radio'],
        FILE: ['file']
    };

    // AI generation limits
    static readonly AI_LIMITS = {
        MAX_CHAT_HISTORY: 50,
        MAX_DOCUMENT_SIZE: 10000, // characters
        MAX_RETRY_ATTEMPTS: 5,
        BASE_RETRY_DELAY: 1000 // milliseconds
    };

    // UI dimensions
    static readonly UI_DIMENSIONS = {
        TOOLBAR: {
            WIDTH: 200,
            HEIGHT: 60
        },
        CHAT_PANEL: {
            WIDTH: 600,
            HEIGHT: 700
        },
        VIEW_PANEL: {
            WIDTH: 500,
            HEIGHT: 400
        }
    };
}