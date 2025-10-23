import { Constants } from '../../utils/constants';
import { ThemeManager } from '../../utils/ThemeManager';
import { Logger } from '../../utils/logger';
import { StorageManager } from '../../utils/storage';
import { AIServiceFactory } from '../../ai/AIServiceFactory';
import { ChatMessage } from '../../types/language-model';

export class ChatPanel {
    private element: HTMLElement | null = null;
    private shadowRoot: ShadowRoot | null = null;
    private chatHistory: ChatMessage[] = [];
    private isVisible = false;
    private viewModeContext: any = null;

    constructor() {
        this.createElement();
        this.loadChatHistory();
    }

    /**
     * Create the chat panel with glassmorphic design
     */
    private createElement(): void {
        this.element = document.createElement('div');
        this.element.id = Constants.IDS.CHAT_PANEL;
        this.element.style.cssText = `
            position: fixed;
            top: 50%;
            left: 50%;
            transform: translate(-50%, -50%);
            width: ${Constants.UI_DIMENSIONS.CHAT_PANEL.WIDTH}px;
            height: ${Constants.UI_DIMENSIONS.CHAT_PANEL.HEIGHT}px;
            z-index: ${Constants.Z_INDEX.CHAT_PANEL};
            display: none;
            pointer-events: auto;
        `;

        // Create shadow DOM
        this.shadowRoot = this.element.attachShadow({ mode: 'open' });
        
        // Inject theme CSS
        ThemeManager.injectThemeCSS(this.shadowRoot);
        ThemeManager.watchThemeChanges(this.shadowRoot);

        // Create chat interface
        this.shadowRoot.innerHTML = `
            <div class="chat-panel netherite-glass netherite-animate-slide-up">
                <div class="chat-header">
                    <div class="header-content">
                        <h2>💬 Netherite Assistant</h2>
                        <div class="header-actions">
                            <button id="newChatBtn" class="header-btn" title="Start New Chat">
                                🔄
                            </button>
                            <button id="closeBtn" class="header-btn close" title="Close Chat">
                                ×
                            </button>
                        </div>
                    </div>
                </div>

                <div class="chat-messages" id="chatMessages">
                    <div class="welcome-message">
                        <p>👋 Welcome to Netherite AI Assistant!</p>
                        <p>I can help you analyze this page and fill forms intelligently.</p>
                        <p>Type your message or use <strong>@doc</strong> to reference your uploaded document.</p>
                    </div>
                </div>

                <div class="chat-input-area">
                    <div class="input-container">
                        <textarea id="chatInput" placeholder="Ask me anything about this page or type @doc to reference your document..."></textarea>
                        <button id="sendBtn" class="send-btn" title="Send Message">
                            <span class="send-icon">➤</span>
                        </button>
                    </div>
                    <div class="input-footer">
                        <div class="document-status" id="documentStatus"></div>
                        <div class="typing-indicator" id="typingIndicator" style="display: none;">
                            <span class="dot"></span>
                            <span class="dot"></span>
                            <span class="dot"></span>
                            AI is thinking...
                        </div>
                    </div>
                </div>
            </div>

            <style>
                .chat-panel {
                    width: 100%;
                    height: 100%;
                    display: flex;
                    flex-direction: column;
                    overflow: hidden;
                }

                .chat-header {
                    padding: 20px 24px 16px;
                    border-bottom: 1px solid var(--netherite-border);
                    flex-shrink: 0;
                }

                .header-content {
                    display: flex;
                    justify-content: space-between;
                    align-items: center;
                }

                .header-content h2 {
                    margin: 0;
                    font-size: 18px;
                    font-weight: 600;
                    color: var(--netherite-text-primary);
                }

                .header-actions {
                    display: flex;
                    gap: 8px;
                }

                .header-btn {
                    width: 32px;
                    height: 32px;
                    border: none;
                    border-radius: 50%;
                    background: var(--netherite-hover-bg);
                    color: var(--netherite-text-secondary);
                    font-size: 16px;
                    cursor: pointer;
                    transition: all 0.2s ease;
                }

                .header-btn:hover {
                    background: var(--netherite-active-bg);
                    color: var(--netherite-text-primary);
                    transform: scale(1.05);
                }

                .chat-messages {
                    flex: 1;
                    overflow-y: auto;
                    padding: 16px 24px;
                    display: flex;
                    flex-direction: column;
                    gap: 16px;
                }

                .welcome-message {
                    text-align: center;
                    color: var(--netherite-text-secondary);
                    padding: 20px;
                    background: var(--netherite-bg-secondary);
                    border-radius: 12px;
                    font-size: 14px;
                    line-height: 1.5;
                }

                .welcome-message p {
                    margin: 8px 0;
                }

                .message {
                    max-width: 80%;
                    padding: 12px 16px;
                    border-radius: 16px;
                    font-size: 14px;
                    line-height: 1.5;
                    word-wrap: break-word;
                }

                .message.user {
                    align-self: flex-end;
                    background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
                    color: white;
                    border-bottom-right-radius: 6px;
                }

                .message.assistant {
                    align-self: flex-start;
                    background: var(--netherite-glass-bg);
                    border: 1px solid var(--netherite-glass-border);
                    color: var(--netherite-text-primary);
                    border-bottom-left-radius: 6px;
                }

                .message .timestamp {
                    font-size: 11px;
                    opacity: 0.7;
                    margin-top: 4px;
                }

                .chat-input-area {
                    padding: 16px 24px 20px;
                    border-top: 1px solid var(--netherite-border);
                    flex-shrink: 0;
                }

                .input-container {
                    display: flex;
                    gap: 8px;
                    align-items: flex-end;
                }

                #chatInput {
                    flex: 1;
                    min-height: 40px;
                    max-height: 120px;
                    padding: 12px 16px;
                    border: 1px solid var(--netherite-border);
                    border-radius: 20px;
                    background: var(--netherite-bg-secondary);
                    color: var(--netherite-text-primary);
                    font-family: inherit;
                    font-size: 14px;
                    resize: none;
                    outline: none;
                    transition: all 0.2s ease;
                }

                #chatInput:focus {
                    border-color: var(--netherite-text-accent);
                    box-shadow: 0 0 0 2px rgba(59, 130, 246, 0.2);
                }

                .send-btn {
                    width: 40px;
                    height: 40px;
                    border: none;
                    border-radius: 50%;
                    background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
                    color: white;
                    cursor: pointer;
                    transition: all 0.2s ease;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                }

                .send-btn:hover {
                    transform: scale(1.05);
                    box-shadow: 0 4px 12px rgba(102, 126, 234, 0.3);
                }

                .send-btn:disabled {
                    opacity: 0.5;
                    cursor: not-allowed;
                    transform: none;
                }

                .input-footer {
                    display: flex;
                    justify-content: space-between;
                    align-items: center;
                    margin-top: 8px;
                    min-height: 20px;
                }

                .document-status {
                    font-size: 12px;
                    color: var(--netherite-text-secondary);
                }

                .document-chip {
                    display: inline-flex;
                    align-items: center;
                    background: var(--netherite-text-accent);
                    color: white;
                    padding: 4px 8px;
                    border-radius: 12px;
                    font-size: 11px;
                    gap: 4px;
                }

                .typing-indicator {
                    display: flex;
                    align-items: center;
                    gap: 4px;
                    color: var(--netherite-text-secondary);
                    font-size: 12px;
                }

                .typing-indicator .dot {
                    width: 4px;
                    height: 4px;
                    border-radius: 50%;
                    background: var(--netherite-text-accent);
                    animation: typing-pulse 1.4s infinite ease-in-out;
                }

                .typing-indicator .dot:nth-child(2) {
                    animation-delay: 0.2s;
                }

                .typing-indicator .dot:nth-child(3) {
                    animation-delay: 0.4s;
                }

                @keyframes typing-pulse {
                    0%, 60%, 100% {
                        opacity: 0.3;
                        transform: scale(0.8);
                    }
                    30% {
                        opacity: 1;
                        transform: scale(1);
                    }
                }

                /* Scrollbar styling */
                .chat-messages::-webkit-scrollbar {
                    width: 6px;
                }

                .chat-messages::-webkit-scrollbar-track {
                    background: var(--netherite-bg-secondary);
                    border-radius: 3px;
                }

                .chat-messages::-webkit-scrollbar-thumb {
                    background: var(--netherite-text-secondary);
                    border-radius: 3px;
                }

                .chat-messages::-webkit-scrollbar-thumb:hover {
                    background: var(--netherite-text-primary);
                }
            </style>
        `;

        // Set up event listeners
        this.setupEventListeners();

        // Add to document
        document.body.appendChild(this.element);

        Logger.ui('Chat panel created', 'ChatPanel');
    }

    /**
     * Set up event listeners for chat interactions
     */
    private setupEventListeners(): void {
        if (!this.shadowRoot) return;

        const chatInput = this.shadowRoot.getElementById('chatInput') as HTMLTextAreaElement;
        const sendBtn = this.shadowRoot.getElementById('sendBtn');
        const closeBtn = this.shadowRoot.getElementById('closeBtn');
        const newChatBtn = this.shadowRoot.getElementById('newChatBtn');

        // Send message on button click
        sendBtn?.addEventListener('click', () => {
            this.handleSendMessage();
        });

        // Send message on Enter (Shift+Enter for new line)
        chatInput?.addEventListener('keydown', (e) => {
            if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                this.handleSendMessage();
            }
        });

        // Close chat panel
        closeBtn?.addEventListener('click', () => {
            this.hide();
        });

        // Start new chat
        newChatBtn?.addEventListener('click', () => {
            this.startNewChat();
        });

        // Auto-resize textarea
        chatInput?.addEventListener('input', () => {
            this.autoResizeTextarea(chatInput);
        });

        // Close on escape key
        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape' && this.isVisible) {
                this.hide();
            }
        });
    }

    /**
     * Handle sending a message
     */
    private async handleSendMessage(): Promise<void> {
        const chatInput = this.shadowRoot?.getElementById('chatInput') as HTMLTextAreaElement;
        const message = chatInput?.value.trim();

        if (!message) return;

        try {
            // Clear input and disable send button
            chatInput.value = '';
            this.setSendButtonState(false);
            
            // Add user message to chat
            this.addMessage('user', message);

            // Show typing indicator
            this.showTypingIndicator(true);

            // Process @doc replacement
            const processedMessage = await this.processDocumentReference(message);

            // Generate AI response
            const aiService = AIServiceFactory.getInstance();
            const response = await aiService.generateChatResponse(
                processedMessage,
                this.chatHistory.slice(-10), // Last 10 messages for context
                {
                    purpose: this.viewModeContext?.pageInfo?.title,
                    fields: this.viewModeContext?.formFields ? 
                        this.viewModeContext.formFields.map((f: any) => f.label).join(', ') : undefined
                }
            );

            // Add AI response to chat
            this.addMessage('assistant', response);

        } catch (error) {
            Logger.error('Error generating chat response:', error);
            this.addMessage('assistant', '❌ Sorry, I encountered an error. Please try again.');
        } finally {
            // Re-enable send button and hide typing indicator
            this.setSendButtonState(true);
            this.showTypingIndicator(false);
            
            // Save chat history
            this.saveChatHistory();
        }
    }

    /**
     * Process @doc references in user message
     */
    private async processDocumentReference(message: string): Promise<string> {
        if (!message.includes('@doc')) {
            return message;
        }

        const document = await StorageManager.getCurrentDocument();
        
        if (!document) {
            // Show error in UI
            this.updateDocumentStatus('No document uploaded. Please upload a document first.');
            return message.replace(/@doc/g, '[No document available]');
        }

        // Replace @doc with document content
        const docContext = `
[Document: ${document.name}]
${document.content}
[End of Document]
        `;

        // Update UI to show document is being referenced
        this.updateDocumentStatus(`📄 Referencing: ${document.name}`);

        return message.replace(/@doc/g, docContext);
    }

    /**
     * Add a message to the chat
     */
    private addMessage(role: 'user' | 'assistant', content: string): void {
        const chatMessages = this.shadowRoot?.getElementById('chatMessages');
        if (!chatMessages) return;

        // Remove welcome message if this is the first real message
        const welcomeMessage = chatMessages.querySelector('.welcome-message');
        if (welcomeMessage && this.chatHistory.length === 0) {
            welcomeMessage.remove();
        }

        // Create message element
        const messageElement = document.createElement('div');
        messageElement.className = `message ${role}`;
        
        const timestamp = new Date().toLocaleTimeString();
        messageElement.innerHTML = `
            <div class="content">${this.formatMessageContent(content)}</div>
            <div class="timestamp">${timestamp}</div>
        `;

        chatMessages.appendChild(messageElement);

        // Add to history
        const message: ChatMessage = {
            role,
            content,
            timestamp: Date.now()
        };
        this.chatHistory.push(message);

        // Scroll to bottom
        this.scrollToBottom();

        Logger.ui(`Message added: ${role}`, 'ChatPanel');
    }

    /**
     * Format message content with basic markdown-like formatting
     */
    private formatMessageContent(content: string): string {
        return content
            .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
            .replace(/\*(.*?)\*/g, '<em>$1</em>')
            .replace(/`(.*?)`/g, '<code>$1</code>')
            .replace(/\n/g, '<br>');
    }

    /**
     * Auto-resize textarea based on content
     */
    private autoResizeTextarea(textarea: HTMLTextAreaElement): void {
        textarea.style.height = 'auto';
        textarea.style.height = Math.min(textarea.scrollHeight, 120) + 'px';
    }

    /**
     * Set send button enabled/disabled state
     */
    private setSendButtonState(enabled: boolean): void {
        const sendBtn = this.shadowRoot?.getElementById('sendBtn') as HTMLButtonElement;
        if (sendBtn) {
            sendBtn.disabled = !enabled;
        }
    }

    /**
     * Show/hide typing indicator
     */
    private showTypingIndicator(show: boolean): void {
        const indicator = this.shadowRoot?.getElementById('typingIndicator');
        if (indicator) {
            indicator.style.display = show ? 'flex' : 'none';
        }
    }

    /**
     * Update document status display
     */
    private updateDocumentStatus(status: string): void {
        const statusElement = this.shadowRoot?.getElementById('documentStatus');
        if (statusElement) {
            statusElement.innerHTML = status;
        }
    }

    /**
     * Scroll chat to bottom
     */
    private scrollToBottom(): void {
        const chatMessages = this.shadowRoot?.getElementById('chatMessages');
        if (chatMessages) {
            chatMessages.scrollTop = chatMessages.scrollHeight;
        }
    }

    /**
     * Start a new chat conversation
     */
    private startNewChat(): void {
        this.chatHistory = [];
        const chatMessages = this.shadowRoot?.getElementById('chatMessages');
        
        if (chatMessages) {
            chatMessages.innerHTML = `
                <div class="welcome-message">
                    <p>👋 Welcome to Netherite AI Assistant!</p>
                    <p>I can help you analyze this page and fill forms intelligently.</p>
                    <p>Type your message or use <strong>@doc</strong> to reference your uploaded document.</p>
                </div>
            `;
        }

        this.updateDocumentStatus('');
        Logger.ui('New chat started', 'ChatPanel');
    }

    /**
     * Set view mode context for enhanced AI responses
     */
    setViewModeContext(context: any): void {
        this.viewModeContext = context;
        Logger.debug('View mode context set', context);
    }

    /**
     * Load chat history from storage
     */
    private async loadChatHistory(): Promise<void> {
        try {
            this.chatHistory = await StorageManager.getChatHistory();
            
            // Restore messages in UI if any
            if (this.chatHistory.length > 0) {
                const chatMessages = this.shadowRoot?.getElementById('chatMessages');
                if (chatMessages) {
                    chatMessages.innerHTML = ''; // Clear welcome message
                    
                    this.chatHistory.forEach(message => {
                        this.addMessageToUI(message);
                    });
                }
            }
        } catch (error) {
            Logger.error('Failed to load chat history:', error);
        }
    }

    /**
     * Add message to UI without modifying history
     */
    private addMessageToUI(message: ChatMessage): void {
        const chatMessages = this.shadowRoot?.getElementById('chatMessages');
        if (!chatMessages) return;

        const messageElement = document.createElement('div');
        messageElement.className = `message ${message.role}`;
        
        const timestamp = new Date(message.timestamp).toLocaleTimeString();
        messageElement.innerHTML = `
            <div class="content">${this.formatMessageContent(message.content)}</div>
            <div class="timestamp">${timestamp}</div>
        `;

        chatMessages.appendChild(messageElement);
    }

    /**
     * Save chat history to storage
     */
    private async saveChatHistory(): Promise<void> {
        try {
            await StorageManager.saveChatHistory(this.chatHistory);
        } catch (error) {
            Logger.error('Failed to save chat history:', error);
        }
    }

    /**
     * Show the chat panel
     */
    show(): void {
        if (!this.element || this.isVisible) return;

        this.element.style.display = 'block';
        this.isVisible = true;

        // Focus on input
        setTimeout(() => {
            const chatInput = this.shadowRoot?.getElementById('chatInput') as HTMLTextAreaElement;
            chatInput?.focus();
        }, 100);

        Logger.ui('Chat panel shown', 'ChatPanel');
    }

    /**
     * Hide the chat panel
     */
    hide(): void {
        if (!this.element || !this.isVisible) return;

        this.element.style.display = 'none';
        this.isVisible = false;

        // Dispatch close event
        const event = new CustomEvent('netherite:chat-close');
        document.dispatchEvent(event);

        Logger.ui('Chat panel hidden', 'ChatPanel');
    }

    /**
     * Check if chat panel is visible
     */
    isOpen(): boolean {
        return this.isVisible;
    }

    /**
     * Destroy chat panel and clean up
     */
    destroy(): void {
        if (this.element) {
            ThemeManager.removeObserver(this.shadowRoot!);
            document.body.removeChild(this.element);
            this.element = null;
            this.shadowRoot = null;
        }

        Logger.ui('Chat panel destroyed', 'ChatPanel');
    }
}