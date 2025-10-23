import { Constants } from '../../utils/constants';
import { ThemeManager } from '../../utils/ThemeManager';
import { StorageManager } from '../../utils/storage';
import { Logger } from '../../utils/logger';

export class FloatingToolbar {
    private element: HTMLElement | null = null;
    private shadowRoot: ShadowRoot | null = null;
    private isDragging = false;
    private dragOffset = { x: 0, y: 0 };
    private isVisible = false;

    constructor() {
        this.createElement();
        this.setupEventListeners();
        this.loadSavedPosition();
    }

    /**
     * Create the floating toolbar element with shadow DOM
     */
    private createElement(): void {
        // Create host element
        this.element = document.createElement('div');
        this.element.id = Constants.IDS.FLOATING_TOOLBAR;
        this.element.style.cssText = `
            position: fixed;
            top: 80px;
            left: 50%;
            transform: translateX(-50%);
            z-index: ${Constants.Z_INDEX.FLOATING_TOOLBAR};
            width: ${Constants.UI_DIMENSIONS.TOOLBAR.WIDTH}px;
            height: ${Constants.UI_DIMENSIONS.TOOLBAR.HEIGHT}px;
            display: none;
            pointer-events: auto;
            user-select: none;
        `;

        // Create shadow DOM for style isolation
        this.shadowRoot = this.element.attachShadow({ mode: 'open' });

        // Inject theme CSS
        ThemeManager.injectThemeCSS(this.shadowRoot);
        ThemeManager.watchThemeChanges(this.shadowRoot);

        // Create toolbar content
        this.shadowRoot.innerHTML = `
            <div class="toolbar netherite-glass netherite-metallic netherite-animate-fade-in">
                <div class="toolbar-content">
                    <button class="toolbar-btn" id="viewBtn" title="Analyze Page (View Mode)">
                        <span class="icon">👁️</span>
                        <span class="label">View</span>
                    </button>
                    <button class="toolbar-btn" id="chatBtn" title="Open Chat Assistant">
                        <span class="icon">💬</span>
                        <span class="label">Chat</span>
                    </button>
                    <button class="toolbar-btn disabled" id="voiceBtn" title="Voice Assistant (Coming Soon)">
                        <span class="icon">🎤</span>
                        <span class="label">Voice</span>
                    </button>
                </div>
                <div class="drag-handle" title="Drag to move toolbar"></div>
            </div>

            <style>
                .toolbar {
                    width: 100%;
                    height: 100%;
                    display: flex;
                    flex-direction: column;
                    cursor: move;
                    position: relative;
                    overflow: hidden;
                }

                .toolbar-content {
                    display: flex;
                    align-items: center;
                    justify-content: space-around;
                    height: 100%;
                    padding: 8px 12px;
                }

                .toolbar-btn {
                    display: flex;
                    flex-direction: column;
                    align-items: center;
                    justify-content: center;
                    background: transparent;
                    border: none;
                    cursor: pointer;
                    padding: 6px 8px;
                    border-radius: 8px;
                    transition: all 0.2s ease;
                    color: var(--netherite-text-primary);
                    min-width: 50px;
                }

                .toolbar-btn:hover:not(.disabled) {
                    background: var(--netherite-hover-bg);
                    transform: translateY(-1px);
                }

                .toolbar-btn:active:not(.disabled) {
                    background: var(--netherite-active-bg);
                    transform: translateY(0);
                }

                .toolbar-btn.disabled {
                    opacity: 0.5;
                    cursor: not-allowed;
                }

                .toolbar-btn .icon {
                    font-size: 18px;
                    margin-bottom: 2px;
                }

                .toolbar-btn .label {
                    font-size: 10px;
                    font-weight: 600;
                    text-transform: uppercase;
                    letter-spacing: 0.5px;
                }

                .toolbar-btn#viewBtn:hover:not(.disabled) .icon {
                    filter: drop-shadow(0 0 8px rgba(59, 130, 246, 0.6));
                }

                .toolbar-btn#chatBtn:hover:not(.disabled) .icon {
                    filter: drop-shadow(0 0 8px rgba(147, 51, 234, 0.6));
                }

                .drag-handle {
                    position: absolute;
                    top: 0;
                    left: 0;
                    right: 0;
                    bottom: 0;
                    cursor: move;
                    z-index: -1;
                }

                .toolbar.dragging {
                    transform: scale(1.05);
                    box-shadow: 0 12px 40px rgba(0, 0, 0, 0.2);
                }

                /* Responsive adjustments */
                @media (max-width: 768px) {
                    .toolbar-content {
                        padding: 6px 8px;
                    }
                    
                    .toolbar-btn {
                        min-width: 40px;
                        padding: 4px 6px;
                    }
                    
                    .toolbar-btn .icon {
                        font-size: 16px;
                    }
                    
                    .toolbar-btn .label {
                        font-size: 9px;
                    }
                }
            </style>
        `;

        // Append to document body
        document.body.appendChild(this.element);

        Logger.ui('Floating toolbar created', 'FloatingToolbar');
    }

    /**
     * Set up event listeners for toolbar interactions
     */
    private setupEventListeners(): void {
        if (!this.shadowRoot) return;

        // Button click handlers
        const viewBtn = this.shadowRoot.getElementById('viewBtn');
        const chatBtn = this.shadowRoot.getElementById('chatBtn');
        const voiceBtn = this.shadowRoot.getElementById('voiceBtn');

        viewBtn?.addEventListener('click', (e) => {
            e.stopPropagation();
            this.handleViewClick();
        });

        chatBtn?.addEventListener('click', (e) => {
            e.stopPropagation();
            this.handleChatClick();
        });

        voiceBtn?.addEventListener('click', (e) => {
            e.stopPropagation();
            if (!voiceBtn.classList.contains('disabled')) {
                this.handleVoiceClick();
            }
        });

        // Drag functionality
        const toolbar = this.shadowRoot.querySelector('.toolbar') as HTMLElement;
        if (toolbar) {
            toolbar.addEventListener('mousedown', this.handleDragStart.bind(this));
            document.addEventListener('mousemove', this.handleDragMove.bind(this));
            document.addEventListener('mouseup', this.handleDragEnd.bind(this));
        }

        // Keyboard shortcuts
        document.addEventListener('keydown', (e) => {
            if (e.altKey && e.code === 'KeyN') {
                e.preventDefault();
                this.toggle();
            }
        });

        Logger.debug('Event listeners set up for floating toolbar');
    }

    /**
     * Handle View button click
     */
    private handleViewClick(): void {
        Logger.ui('View button clicked', 'FloatingToolbar');
        
        // Dispatch custom event for view mode activation
        const event = new CustomEvent('netherite:view-mode', {
            detail: { timestamp: Date.now() }
        });
        document.dispatchEvent(event);
    }

    /**
     * Handle Chat button click
     */
    private handleChatClick(): void {
        Logger.ui('Chat button clicked', 'FloatingToolbar');
        
        // Dispatch custom event for chat mode activation
        const event = new CustomEvent('netherite:chat-mode', {
            detail: { timestamp: Date.now() }
        });
        document.dispatchEvent(event);
    }

    /**
     * Handle Voice button click (future feature)
     */
    private handleVoiceClick(): void {
        Logger.ui('Voice button clicked (not implemented)', 'FloatingToolbar');
        
        // Future implementation for voice assistant
        const event = new CustomEvent('netherite:voice-mode', {
            detail: { timestamp: Date.now() }
        });
        document.dispatchEvent(event);
    }

    /**
     * Handle drag start
     */
    private handleDragStart(e: MouseEvent): void {
        if (!this.element) return;

        this.isDragging = true;
        
        const rect = this.element.getBoundingClientRect();
        this.dragOffset = {
            x: e.clientX - rect.left,
            y: e.clientY - rect.top
        };

        const toolbar = this.shadowRoot?.querySelector('.toolbar') as HTMLElement;
        toolbar?.classList.add('dragging');

        document.body.style.cursor = 'move';
        
        Logger.debug('Drag started');
    }

    /**
     * Handle drag move
     */
    private handleDragMove(e: MouseEvent): void {
        if (!this.isDragging || !this.element) return;

        e.preventDefault();

        const newX = e.clientX - this.dragOffset.x;
        const newY = e.clientY - this.dragOffset.y;

        // Keep toolbar within viewport bounds
        const maxX = window.innerWidth - this.element.offsetWidth;
        const maxY = window.innerHeight - this.element.offsetHeight;

        const clampedX = Math.max(0, Math.min(newX, maxX));
        const clampedY = Math.max(0, Math.min(newY, maxY));

        this.element.style.left = `${clampedX}px`;
        this.element.style.top = `${clampedY}px`;
        this.element.style.transform = 'none';
    }

    /**
     * Handle drag end
     */
    private handleDragEnd(): void {
        if (!this.isDragging || !this.element) return;

        this.isDragging = false;
        
        const toolbar = this.shadowRoot?.querySelector('.toolbar') as HTMLElement;
        toolbar?.classList.remove('dragging');

        document.body.style.cursor = '';

        // Save position to storage
        const rect = this.element.getBoundingClientRect();
        StorageManager.saveToolbarPosition(rect.left, rect.top);

        Logger.debug('Drag ended, position saved');
    }

    /**
     * Load saved toolbar position from storage
     */
    private async loadSavedPosition(): Promise<void> {
        const position = await StorageManager.getToolbarPosition();
        
        if (position && this.element) {
            this.element.style.left = `${position.x}px`;
            this.element.style.top = `${position.y}px`;
            this.element.style.transform = 'none';
            
            Logger.debug('Loaded saved toolbar position', position);
        }
    }

    /**
     * Show the floating toolbar
     */
    show(): void {
        if (!this.element || this.isVisible) return;

        this.element.style.display = 'block';
        this.isVisible = true;

        // Trigger fade-in animation
        setTimeout(() => {
            const toolbar = this.shadowRoot?.querySelector('.toolbar') as HTMLElement;
            toolbar?.classList.add('netherite-animate-fade-in');
        }, 10);

        Logger.ui('Floating toolbar shown', 'FloatingToolbar');
    }

    /**
     * Hide the floating toolbar
     */
    hide(): void {
        if (!this.element || !this.isVisible) return;

        this.element.style.display = 'none';
        this.isVisible = false;

        Logger.ui('Floating toolbar hidden', 'FloatingToolbar');
    }

    /**
     * Toggle toolbar visibility
     */
    toggle(): void {
        if (this.isVisible) {
            this.hide();
        } else {
            this.show();
        }
    }

    /**
     * Check if toolbar is visible
     */
    isToolbarVisible(): boolean {
        return this.isVisible;
    }

    /**
     * Update button states based on current mode
     */
    updateButtonStates(activeMode: 'view' | 'chat' | 'voice' | null): void {
        if (!this.shadowRoot) return;

        const buttons = this.shadowRoot.querySelectorAll('.toolbar-btn');
        buttons.forEach(btn => btn.classList.remove('active'));

        if (activeMode) {
            const activeBtn = this.shadowRoot.getElementById(`${activeMode}Btn`);
            activeBtn?.classList.add('active');
        }

        Logger.debug('Button states updated', { activeMode });
    }

    /**
     * Destroy the toolbar and clean up resources
     */
    destroy(): void {
        if (this.element) {
            ThemeManager.removeObserver(this.shadowRoot!);
            document.body.removeChild(this.element);
            this.element = null;
            this.shadowRoot = null;
        }

        Logger.ui('Floating toolbar destroyed', 'FloatingToolbar');
    }
}