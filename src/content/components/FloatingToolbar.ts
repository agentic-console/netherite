import { Constants } from '../../utils/constants';
import { ThemeManager } from '../../utils/ThemeManager';
import { StorageManager } from '../../utils/storage';
import { Logger } from '../../utils/logger';

interface DockItem {
    id: string;
    name: string;
    iconSvg: string;
    color: string;
    eventType: string;
}

export class FloatingToolbar {
    private element: HTMLElement | null = null;
    private shadowRoot: ShadowRoot | null = null;
    private isDragging = false;
    private dragOffset = { x: 0, y: 0 };
    private isVisible = false;
    private mouseX = 0;
    private dockItems: DockItem[] = [
        { 
            id: "scanner", 
            name: "Scanner", 
            iconSvg: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M2 3h6a4 4 0 0 1 4 4v14a3 3 0 0 0-3-3H2z"/><path d="M22 3h-6a4 4 0 0 0-4 4v14a3 3 0 0 1 3-3h7z"/></svg>`, 
            color: "bg-blue-500",
            eventType: "netherite:view-mode"
        },
        { 
            id: "chat", 
            name: "Chat", 
            iconSvg: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/></svg>`, 
            color: "bg-green-500",
            eventType: "netherite:chat-mode"
        },
        { 
            id: "voice", 
            name: "Voice", 
            iconSvg: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 1a3 3 0 0 0-3 3v8a3 3 0 0 0 6 0V4a3 3 0 0 0-3-3z"/><path d="M19 10v2a7 7 0 0 1-14 0v-2"/><line x1="12" y1="19" x2="12" y2="23"/><line x1="8" y1="23" x2="16" y2="23"/></svg>`, 
            color: "bg-gradient-to-br from-pink-500 to-purple-600",
            eventType: "netherite:voice-mode"
        },
        { 
            id: "finder", 
            name: "Documents", 
            iconSvg: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z"/></svg>`, 
            color: "bg-yellow-500",
            eventType: "netherite:view-mode"
        }
    ];

    constructor() {
        this.createElement();
        this.setupEventListeners();
        this.loadSavedPosition();
    }

    /**
     * Create the floating toolbar element with dock-style design
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
            width: auto;
            height: auto;
            display: none;
            pointer-events: auto;
            user-select: none;
        `;

        // Create shadow DOM for style isolation
        this.shadowRoot = this.element.attachShadow({ mode: 'open' });

        // Create dock-style content
        this.shadowRoot.innerHTML = `
            <div class="dock-container">
                <div class="dock-toolbar" onmousemove="this.handleMouseMove(event)" onmouseleave="this.handleMouseLeave()">
                    ${this.dockItems.map(item => this.createDockIcon(item)).join('')}
                </div>
            </div>

            <style>
                * {
                    box-sizing: border-box;
                    font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
                }

                .dock-container {
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    padding: 8px;
                }

                .dock-toolbar {
                    display: flex;
                    align-items: end;
                    gap: 16px;
                    padding: 16px 16px 14px;
                    background: rgba(255, 255, 255, 0.1);
                    backdrop-filter: blur(20px);
                    border-radius: 24px;
                    border: 1px solid rgba(255, 255, 255, 0.2);
                    box-shadow: 0 8px 32px rgba(0, 0, 0, 0.1);
                    cursor: move;
                    transition: all 0.3s ease;
                }

                .dock-toolbar.dragging {
                    transform: scale(1.05);
                    box-shadow: 0 12px 40px rgba(0, 0, 0, 0.2);
                }

                .dock-icon {
                    aspect-ratio: 1;
                    cursor: pointer;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    position: relative;
                    border-radius: 16px;
                    transition: all 0.2s cubic-bezier(0.34, 1.56, 0.64, 1);
                    width: 50px;
                    height: 50px;
                    overflow: hidden;
                }

                .dock-icon.bg-blue-500 {
                    background: #3b82f6;
                }

                .dock-icon.bg-green-500 {
                    background: #10b981;
                }

                .dock-icon.bg-yellow-500 {
                    background: #f59e0b;
                }

                .dock-icon.bg-gradient-to-br {
                    background: linear-gradient(to bottom right, #ec4899, #8b5cf6);
                }

                .dock-icon .icon {
                    width: 24px;
                    height: 24px;
                    color: white;
                    transition: all 0.2s ease;
                }

                .dock-icon:hover {
                    transform: translateY(-8px);
                }

                .dock-icon:hover .icon {
                    transform: scale(1.1);
                }

                .dock-icon:active {
                    transform: translateY(-6px) scale(0.95);
                }

                .dock-icon .tooltip {
                    position: absolute;
                    bottom: 100%;
                    left: 50%;
                    transform: translateX(-50%) translateY(-8px);
                    background: rgba(0, 0, 0, 0.8);
                    color: white;
                    padding: 6px 12px;
                    border-radius: 6px;
                    font-size: 12px;
                    font-weight: 600;
                    white-space: nowrap;
                    opacity: 0;
                    pointer-events: none;
                    transition: all 0.2s ease;
                    z-index: 1000;
                }

                .dock-icon:hover .tooltip {
                    opacity: 1;
                    transform: translateX(-50%) translateY(-16px);
                }

                .dock-icon .shine {
                    position: absolute;
                    inset: 0;
                    background: linear-gradient(to bottom right, rgba(255, 255, 255, 0.2), transparent);
                    border-radius: 16px;
                    transition: opacity 0.2s ease;
                }

                .dock-icon:hover .shine {
                    opacity: 0.4;
                }

                .dock-icon .active-dot {
                    position: absolute;
                    bottom: -2px;
                    left: 50%;
                    transform: translateX(-50%);
                    width: 4px;
                    height: 4px;
                    background: rgba(255, 255, 255, 0.8);
                    border-radius: 50%;
                    opacity: 0.7;
                }

                /* Animation for dock appearance */
                .dock-toolbar {
                    animation: dockFadeIn 0.3s ease-out;
                }

                @keyframes dockFadeIn {
                    from {
                        opacity: 0;
                        transform: translateY(20px);
                    }
                    to {
                        opacity: 1;
                        transform: translateY(0);
                    }
                }

                /* Responsive design */
                @media (max-width: 768px) {
                    .dock-toolbar {
                        gap: 12px;
                        padding: 12px;
                    }
                    
                    .dock-icon {
                        width: 44px;
                        height: 44px;
                    }
                    
                    .dock-icon .icon {
                        width: 20px;
                        height: 20px;
                    }
                }
            </style>
        `;

        // Add event listeners after creating the DOM
        this.setupDockEventListeners();

        // Append to document body
        document.body.appendChild(this.element);

        Logger.ui('Dock-style floating toolbar created', 'FloatingToolbar');
    }

    /**
     * Create a dock icon element
     */
    private createDockIcon(item: DockItem): string {
        return `
            <div class="dock-icon ${item.color}" data-item-id="${item.id}" data-event-type="${item.eventType}">
                <div class="icon">${item.iconSvg}</div>
                <div class="shine"></div>
                <div class="tooltip">${item.name}</div>
                <div class="active-dot"></div>
            </div>
        `;
    }

    /**
     * Set up event listeners for dock icons
     */
    private setupDockEventListeners(): void {
        if (!this.shadowRoot) return;

        const dockIcons = this.shadowRoot.querySelectorAll('.dock-icon');
        
        dockIcons.forEach(icon => {
            icon.addEventListener('click', (e) => {
                e.stopPropagation();
                const eventType = icon.getAttribute('data-event-type');
                const itemId = icon.getAttribute('data-item-id');
                
                if (eventType) {
                    this.handleIconClick(eventType, itemId || '');
                }
            });
        });

        // Add mouse tracking for hover effects
        const dockToolbar = this.shadowRoot.querySelector('.dock-toolbar');
        if (dockToolbar) {
            dockToolbar.addEventListener('mousemove', (e: Event) => {
                const mouseEvent = e as MouseEvent;
                this.mouseX = mouseEvent.clientX;
            });

            dockToolbar.addEventListener('mouseleave', () => {
                this.mouseX = 0;
            });
        }
    }

    /**
     * Handle icon click and dispatch appropriate events
     */
    private handleIconClick(eventType: string, itemId: string): void {
        Logger.ui(`Dock icon clicked: ${itemId}`, 'FloatingToolbar');
        
        // Dispatch the event to maintain backend compatibility
        const event = new CustomEvent(eventType, {
            detail: { timestamp: Date.now(), source: 'dock-toolbar' }
        });
        document.dispatchEvent(event);

        // Update visual state
        this.updateActiveState(itemId);
    }

    /**
     * Update active state for clicked icon
     */
    private updateActiveState(activeId: string): void {
        if (!this.shadowRoot) return;

        const dockIcons = this.shadowRoot.querySelectorAll('.dock-icon');
        dockIcons.forEach(icon => {
            icon.classList.remove('active');
            if (icon.getAttribute('data-item-id') === activeId) {
                icon.classList.add('active');
            }
        });
    }

    /**
     * Set up event listeners for toolbar interactions
     */
    private setupEventListeners(): void {
        if (!this.shadowRoot) return;

        // Drag functionality on the dock toolbar
        const dockToolbar = this.shadowRoot.querySelector('.dock-toolbar') as HTMLElement;
        if (dockToolbar) {
            dockToolbar.addEventListener('mousedown', this.handleDragStart.bind(this));
            document.addEventListener('mousemove', this.handleDragMove.bind(this));
            document.addEventListener('mouseup', this.handleDragEnd.bind(this));
        }

        // Keyboard shortcuts (maintain original Alt+N functionality)
        document.addEventListener('keydown', (e) => {
            if (e.altKey && e.code === 'KeyN') {
                e.preventDefault();
                this.toggle();
            }
        });

        Logger.debug('Event listeners set up for dock toolbar');
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

        const dockToolbar = this.shadowRoot?.querySelector('.dock-toolbar') as HTMLElement;
        dockToolbar?.classList.add('dragging');

        document.body.style.cursor = 'move';
        
        Logger.debug('Dock drag started');
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
        
        const dockToolbar = this.shadowRoot?.querySelector('.dock-toolbar') as HTMLElement;
        dockToolbar?.classList.remove('dragging');

        document.body.style.cursor = '';

        // Save position to storage
        const rect = this.element.getBoundingClientRect();
        StorageManager.saveToolbarPosition(rect.left, rect.top);

        Logger.debug('Dock drag ended, position saved');
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
            const dockToolbar = this.shadowRoot?.querySelector('.dock-toolbar') as HTMLElement;
            dockToolbar?.classList.add('dock-animate-fade-in');
        }, 10);

        Logger.ui('Dock toolbar shown', 'FloatingToolbar');
    }

    /**
     * Hide the floating toolbar
     */
    hide(): void {
        if (!this.element || !this.isVisible) return;

        this.element.style.display = 'none';
        this.isVisible = false;

        Logger.ui('Dock toolbar hidden', 'FloatingToolbar');
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
    updateButtonStates(activeMode: 'scanner' | 'chat' | 'voice' | 'finder' | null): void {
        this.updateActiveState(activeMode || '');
        Logger.debug('Button states updated', { activeMode });
    }

    /**
     * Destroy the toolbar and clean up resources
     */
    destroy(): void {
        if (this.element) {
            document.body.removeChild(this.element);
            this.element = null;
            this.shadowRoot = null;
        }

        Logger.ui('Dock toolbar destroyed', 'FloatingToolbar');
    }
}