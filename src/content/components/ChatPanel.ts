import { Constants } from '../../utils/constants';
import { ThemeManager } from '../../utils/ThemeManager';
import { Logger } from '../../utils/logger';
import { StorageManager } from '../../utils/storage';
import { AIServiceFactory } from '../../ai/AIServiceFactory';
import { ChatMessage, GeneratedAnswer } from '../../types/language-model';
import { FieldInjector } from '../FieldInjector';

export class ChatPanel {
    private element: HTMLElement | null = null;
    private shadowRoot: ShadowRoot | null = null;
    private chatHistory: ChatMessage[] = [];
    private isVisible = false;
    private viewModeContext: any = null;
    private isAtBottom = true;
    private autoScrollEnabled = true;
    private messagesContainer: HTMLElement | null = null;
    private scrollToBottomBtn: HTMLElement | null = null;
    private generatedAnswers: GeneratedAnswer[] = [];
    private fieldInjector: FieldInjector;

    constructor() {
        this.fieldInjector = new FieldInjector();
        this.createElement();
        this.loadChatHistory();
    }

    /**
     * Create the modern chat panel with enhanced UX
     */
    private createElement(): void {
        this.element = document.createElement('div');
        this.element.id = Constants.IDS.CHAT_PANEL;
        this.element.style.cssText = `
            position: fixed;
            top: 50%;
            left: 50%;
            transform: translate(-50%, -50%);
            width: min(90vw, ${Constants.UI_DIMENSIONS.CHAT_PANEL.WIDTH}px);
            height: min(85vh, ${Constants.UI_DIMENSIONS.CHAT_PANEL.HEIGHT}px);
            z-index: ${Constants.Z_INDEX.CHAT_PANEL};
            display: none;
            pointer-events: auto;
        `;

        // Create shadow DOM
        this.shadowRoot = this.element.attachShadow({ mode: 'open' });

        // Create modern chat interface
        this.shadowRoot.innerHTML = `
            <div class="chat-panel">
                <div class="chat-header">
                    <div class="header-content">
                        <div class="header-title">
                            <div class="title-icon">
                                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                                    <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/>
                                </svg>
                            </div>
                            <div class="title-text">
                                <h2>Netherite Assistant</h2>
                                <span class="subtitle">AI-Powered Chat</span>
                            </div>
                        </div>
                        <div class="header-actions">
                            <button id="newChatBtn" class="header-btn" title="Start New Chat">
                                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                                    <path d="M21 12a9 9 0 0 0-9-9 9.75 9.75 0 0 0-6.74 2.74L3 8"/>
                                    <path d="M3 3v5h5"/>
                                    <path d="M3 12a9 9 0 0 0 9 9 9.75 9.75 0 0 0 6.74-2.74L21 16"/>
                                    <path d="M16 16h5v5"/>
                                </svg>
                            </button>
                            <button id="closeBtn" class="header-btn close" title="Close Chat">
                                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                                    <line x1="18" y1="6" x2="6" y2="18"/>
                                    <line x1="6" y1="6" x2="18" y2="18"/>
                                </svg>
                            </button>
                        </div>
                    </div>
                </div>

                <div class="chat-messages-wrapper">
                    <div class="chat-messages" id="chatMessages">
                        <div class="welcome-message">
                            <div class="welcome-icon">
                                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                                    <path d="M7 9a2 2 0 1 1 4 0v5a2 2 0 0 1-4 0V9z"/>
                                    <path d="M17 9a2 2 0 1 1 4 0v5a2 2 0 0 1-4 0V9z"/>
                                    <path d="M7 9V6a7 7 0 0 1 14 0v4.5"/>
                                    <path d="M7 13.5v3a7 7 0 0 0 14 0v-4"/>
                                </svg>
                            </div>
                            <h3>Welcome to Netherite AI Assistant!</h3>
                            <p>I can help you analyze this page and fill forms intelligently.</p>
                            <div class="features-list">
                                <div class="feature">
                                    <span class="feature-icon">🔍</span>
                                    <span>Type your message to start a conversation</span>
                                </div>
                                <div class="feature">
                                    <span class="feature-icon">📄</span>
                                    <span>Use <strong>@doc</strong> to reference your uploaded document</span>
                                </div>
                                <div class="feature">
                                    <span class="feature-icon">⚡</span>
                                    <span>Get instant AI-powered assistance</span>
                                </div>
                            </div>
                        </div>
                    </div>
                    
                    <button id="scrollToBottomBtn" class="scroll-to-bottom" style="display: none;" title="Scroll to bottom">
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                            <polyline points="7,13 12,18 17,13"/>
                            <polyline points="7,6 12,11 17,6"/>
                        </svg>
                    </button>
                </div>

                <div class="chat-input-area">
                    <div class="input-status">
                        <div class="document-status" id="documentStatus"></div>
                        <div class="typing-indicator" id="typingIndicator" style="display: none;">
                            <div class="typing-dots">
                                <span class="dot"></span>
                                <span class="dot"></span>
                                <span class="dot"></span>
                            </div>
                            <span class="typing-text">AI is thinking...</span>
                        </div>
                    </div>
                    
                    <!-- Apply Form Answers Section -->
                    <div class="apply-section" id="applySection" style="display: none;">
                        <div class="apply-header">
                            <div class="apply-icon">
                                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                                    <polyline points="20,6 9,17 4,12"/>
                                </svg>
                            </div>
                            <div class="apply-text">
                                <h4>Form Filling Ready</h4>
                                <span id="applyDescription">AI has generated form answers</span>
                            </div>
                        </div>
                        <div class="apply-actions">
                            <button id="previewBtn" class="preview-btn" title="Preview Answers">
                                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                                    <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/>
                                    <circle cx="12" cy="12" r="3"/>
                                </svg>
                                Preview
                            </button>
                            <button id="applyBtn" class="apply-btn" title="Apply to Form">
                                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                                    <polyline points="20,6 9,17 4,12"/>
                                </svg>
                                Apply Now
                            </button>
                        </div>
                    </div>
                    
                    <div class="input-container">
                        <textarea id="chatInput" placeholder="Ask me anything about this page or type @doc to reference your document..." rows="1"></textarea>
                        <button id="sendBtn" class="send-btn" title="Send Message">
                            <svg class="send-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                                <line x1="22" y1="2" x2="11" y2="13"/>
                                <polygon points="22,2 15,22 11,13 2,9 22,2"/>
                            </svg>
                        </button>
                    </div>
                </div>
            </div>

            <style>
                :host {
                    /* Brand Colors */
                    --rich-black: #0C0B13;
                    --russian-violet: #1A0554;
                    --plump-purple: #664EAE;
                    --pale-violet: #C4A8FF;
                    --white: #FFFFFF;
                    --light-gray: #F8F9FA;
                }

                * {
                    box-sizing: border-box;
                    font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif;
                }

                .chat-panel {
                    width: 100%;
                    height: 100%;
                    display: flex;
                    flex-direction: column;
                    background: #ffffff;
                    border-radius: 16px;
                    box-shadow: 0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04);
                    border: 1px solid rgba(0, 0, 0, 0.05);
                    overflow: hidden;
                    animation: slideUp 0.3s cubic-bezier(0.16, 1, 0.3, 1);
                }

                @keyframes slideUp {
                    from {
                        opacity: 0;
                        transform: translateY(20px) scale(0.95);
                    }
                    to {
                        opacity: 1;
                        transform: translateY(0) scale(1);
                    }
                }

                /* Header Styling */
                .chat-header {
                    background: linear-gradient(135deg, var(--russian-violet) 0%, var(--plump-purple) 100%);
                    color: var(--white);
                    padding: 20px 24px;
                    flex-shrink: 0;
                }

                .header-content {
                    display: flex;
                    justify-content: space-between;
                    align-items: center;
                }

                .header-title {
                    display: flex;
                    align-items: center;
                    gap: 12px;
                }

                .title-icon svg {
                    width: 24px;
                    height: 24px;
                }

                .title-text h2 {
                    margin: 0;
                    font-size: 18px;
                    font-weight: 600;
                    line-height: 1.2;
                }

                .subtitle {
                    font-size: 12px;
                    opacity: 0.8;
                    font-weight: 400;
                }

                .header-actions {
                    display: flex;
                    gap: 8px;
                }

                .header-btn {
                    width: 36px;
                    height: 36px;
                    border: none;
                    border-radius: 8px;
                    background: rgba(196, 168, 255, 0.2);
                    color: var(--white);
                    cursor: pointer;
                    transition: all 0.2s cubic-bezier(0.4, 0, 0.2, 1);
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    backdrop-filter: blur(10px);
                }

                .header-btn svg {
                    width: 16px;
                    height: 16px;
                }

                .header-btn:hover {
                    background: var(--pale-violet);
                    transform: scale(1.05);
                }

                .header-btn:active {
                    transform: scale(0.95);
                }

                /* Messages Area */
                .chat-messages-wrapper {
                    flex: 1;
                    position: relative;
                    overflow: hidden;
                }

                .chat-messages {
                    height: 100%;
                    overflow-y: auto;
                    padding: 24px;
                    display: flex;
                    flex-direction: column;
                    gap: 16px;
                    scroll-behavior: smooth;
                }

                .chat-messages::-webkit-scrollbar {
                    width: 6px;
                }

                .chat-messages::-webkit-scrollbar-track {
                    background: var(--light-gray);
                }

                .chat-messages::-webkit-scrollbar-thumb {
                    background: var(--pale-violet);
                    border-radius: 3px;
                }

                .chat-messages::-webkit-scrollbar-thumb:hover {
                    background: var(--plump-purple);
                }

                /* Welcome Message */
                .welcome-message {
                    text-align: center;
                    padding: 32px 24px;
                    background: linear-gradient(135deg, rgba(196, 168, 255, 0.1) 0%, rgba(102, 78, 174, 0.05) 100%);
                    border-radius: 16px;
                    border: 1px solid var(--pale-violet);
                }

                .welcome-icon svg {
                    width: 48px;
                    height: 48px;
                    color: var(--plump-purple);
                    margin-bottom: 16px;
                }

                .welcome-message h3 {
                    margin: 0 0 8px 0;
                    font-size: 18px;
                    font-weight: 600;
                    color: var(--rich-black);
                }

                .welcome-message p {
                    margin: 0 0 20px 0;
                    color: var(--russian-violet);
                    font-size: 14px;
                    line-height: 1.5;
                }

                .features-list {
                    display: flex;
                    flex-direction: column;
                    gap: 12px;
                    text-align: left;
                    max-width: 320px;
                    margin: 0 auto;
                }

                .feature {
                    display: flex;
                    align-items: center;
                    gap: 12px;
                    padding: 12px;
                    background: white;
                    border-radius: 12px;
                    border: 1px solid #e2e8f0;
                }

                .feature-icon {
                    font-size: 16px;
                    flex-shrink: 0;
                }

                .feature span:last-child {
                    font-size: 13px;
                    color: #475569;
                    line-height: 1.4;
                }

                /* Chat Messages */
                .message {
                    max-width: 75%;
                    padding: 16px 20px;
                    border-radius: 20px;
                    font-size: 14px;
                    line-height: 1.5;
                    word-wrap: break-word;
                    position: relative;
                    animation: messageSlideIn 0.3s cubic-bezier(0.16, 1, 0.3, 1);
                }

                @keyframes messageSlideIn {
                    from {
                        opacity: 0;
                        transform: translateY(10px) scale(0.95);
                    }
                    to {
                        opacity: 1;
                        transform: translateY(0) scale(1);
                    }
                }

                .message.user {
                    align-self: flex-end;
                    background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
                    color: white;
                    border-bottom-right-radius: 8px;
                    box-shadow: 0 4px 12px rgba(102, 126, 234, 0.3);
                }

                .message.assistant {
                    align-self: flex-start;
                    background: #f8fafc;
                    border: 1px solid #e2e8f0;
                    color: #1e293b;
                    border-bottom-left-radius: 8px;
                    box-shadow: 0 2px 8px rgba(0, 0, 0, 0.05);
                }

                .message .content {
                    margin-bottom: 4px;
                }

                .message .timestamp {
                    font-size: 11px;
                    opacity: 0.7;
                    font-weight: 500;
                }

                /* Scroll to Bottom Button */
                .scroll-to-bottom {
                    position: absolute;
                    bottom: 16px;
                    left: 50%;
                    transform: translateX(-50%);
                    width: 40px;
                    height: 40px;
                    border: none;
                    border-radius: 50%;
                    background: #667eea;
                    color: white;
                    cursor: pointer;
                    box-shadow: 0 4px 12px rgba(102, 126, 234, 0.3);
                    transition: all 0.2s cubic-bezier(0.4, 0, 0.2, 1);
                    display: flex;
                    align-items: center;
                    justify-content: center;
                }

                .scroll-to-bottom svg {
                    width: 16px;
                    height: 16px;
                }

                .scroll-to-bottom:hover {
                    transform: translateX(-50%) scale(1.1);
                    box-shadow: 0 6px 16px rgba(102, 126, 234, 0.4);
                }

                /* Input Area */
                .chat-input-area {
                    padding: 16px 24px 24px;
                    border-top: 1px solid #e2e8f0;
                    background: #fafbfc;
                    flex-shrink: 0;
                }

                .input-status {
                    display: flex;
                    justify-content: space-between;
                    align-items: center;
                    margin-bottom: 12px;
                    min-height: 20px;
                }

                .document-status {
                    font-size: 12px;
                    color: #64748b;
                    font-weight: 500;
                }

                .typing-indicator {
                    display: flex;
                    align-items: center;
                    gap: 8px;
                    color: #667eea;
                    font-size: 12px;
                    font-weight: 500;
                }

                .typing-dots {
                    display: flex;
                    gap: 4px;
                }

                .typing-indicator .dot {
                    width: 4px;
                    height: 4px;
                    border-radius: 50%;
                    background: #667eea;
                    animation: typingPulse 1.4s infinite ease-in-out;
                }

                .typing-indicator .dot:nth-child(2) {
                    animation-delay: 0.2s;
                }

                .typing-indicator .dot:nth-child(3) {
                    animation-delay: 0.4s;
                }

                @keyframes typingPulse {
                    0%, 60%, 100% {
                        opacity: 0.3;
                        transform: scale(0.8);
                    }
                    30% {
                        opacity: 1;
                        transform: scale(1);
                    }
                }

                /* Apply Section */
                .apply-section {
                    background: linear-gradient(135deg, #f0f9ff 0%, #e0f2fe 100%);
                    border: 2px solid #0ea5e9;
                    border-radius: 16px;
                    padding: 16px;
                    margin-bottom: 16px;
                    animation: slideUp 0.3s cubic-bezier(0.16, 1, 0.3, 1);
                }

                .apply-header {
                    display: flex;
                    align-items: center;
                    gap: 12px;
                    margin-bottom: 16px;
                }

                .apply-icon {
                    width: 32px;
                    height: 32px;
                    background: #0ea5e9;
                    border-radius: 8px;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    flex-shrink: 0;
                }

                .apply-icon svg {
                    width: 16px;
                    height: 16px;
                    color: white;
                }

                .apply-text h4 {
                    margin: 0 0 4px 0;
                    font-size: 14px;
                    font-weight: 600;
                    color: #0c4a6e;
                }

                .apply-text span {
                    font-size: 12px;
                    color: #0369a1;
                    font-weight: 500;
                }

                .apply-actions {
                    display: flex;
                    gap: 12px;
                }

                .preview-btn, .apply-btn {
                    flex: 1;
                    height: 40px;
                    border: none;
                    border-radius: 12px;
                    font-size: 13px;
                    font-weight: 600;
                    cursor: pointer;
                    transition: all 0.2s cubic-bezier(0.4, 0, 0.2, 1);
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    gap: 8px;
                }

                .preview-btn {
                    background: white;
                    color: #0369a1;
                    border: 2px solid #e0f2fe;
                }

                .preview-btn:hover {
                    background: #f0f9ff;
                    border-color: #0ea5e9;
                    transform: translateY(-1px);
                }

                .apply-btn {
                    background: linear-gradient(135deg, #0ea5e9 0%, #0369a1 100%);
                    color: white;
                    box-shadow: 0 4px 12px rgba(14, 165, 233, 0.3);
                }

                .apply-btn:hover {
                    transform: translateY(-2px);
                    box-shadow: 0 6px 16px rgba(14, 165, 233, 0.4);
                }

                .apply-btn:active, .preview-btn:active {
                    transform: translateY(0);
                }

                .preview-btn svg, .apply-btn svg {
                    width: 14px;
                    height: 14px;
                }

                .input-container {
                    display: flex;
                    gap: 8px;
                    align-items: center;
                    background: white;
                    border: 2px solid #e2e8f0;
                    border-radius: 16px;
                    padding: 8px 8px 8px 16px;
                    transition: border-color 0.2s ease;
                    min-height: 48px;
                }

                .input-container:focus-within {
                    border-color: #667eea;
                    box-shadow: 0 0 0 3px rgba(102, 126, 234, 0.1);
                }

                #chatInput {
                    flex: 1;
                    min-height: 32px;
                    max-height: 120px;
                    padding: 8px 0;
                    border: none;
                    background: transparent;
                    color: #1e293b;
                    font-family: inherit;
                    font-size: 14px;
                    line-height: 1.5;
                    resize: none;
                    outline: none;
                    overflow: hidden;
                }

                #chatInput::placeholder {
                    color: #94a3b8;
                }

                .send-btn {
                    width: 40px;
                    height: 40px;
                    border: none;
                    border-radius: 12px;
                    background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
                    color: white;
                    cursor: pointer;
                    transition: all 0.2s cubic-bezier(0.4, 0, 0.2, 1);
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    flex-shrink: 0;
                }

                .send-btn svg {
                    width: 18px;
                    height: 18px;
                }

                .send-btn:hover {
                    transform: scale(1.05);
                    box-shadow: 0 4px 12px rgba(102, 126, 234, 0.3);
                }

                .send-btn:active {
                    transform: scale(0.95);
                }

                .send-btn:disabled {
                    opacity: 0.5;
                    cursor: not-allowed;
                    transform: none;
                }

                /* Dark mode support */
                @media (prefers-color-scheme: dark) {
                    .chat-panel {
                        background: #1e293b;
                        border: 1px solid #334155;
                    }

                    .welcome-message {
                        background: linear-gradient(135deg, #334155 0%, #475569 100%);
                        border: 1px solid #475569;
                    }

                    .welcome-message h3 {
                        color: #f1f5f9;
                    }

                    .welcome-message p {
                        color: #cbd5e1;
                    }

                    .feature {
                        background: #475569;
                        border: 1px solid #64748b;
                        color: #f1f5f9;
                    }

                    .message.assistant {
                        background: #334155;
                        border: 1px solid #475569;
                        color: #f1f5f9;
                    }

                    .chat-input-area {
                        background: #334155;
                        border-top: 1px solid #475569;
                    }

                    .input-container {
                        background: #475569;
                        border: 2px solid #64748b;
                    }

                    #chatInput {
                        color: #f1f5f9;
                    }

                    #chatInput::placeholder {
                        color: #94a3b8;
                    }
                }

                /* Responsive design */
                @media (max-width: 768px) {
                    .chat-messages {
                        padding: 16px;
                    }

                    .message {
                        max-width: 85%;
                        padding: 12px 16px;
                    }

                    .welcome-message {
                        padding: 24px 20px;
                    }

                    .features-list {
                        max-width: 100%;
                    }
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
        const applyBtn = this.shadowRoot.getElementById('applyBtn');
        const previewBtn = this.shadowRoot.getElementById('previewBtn');

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

        // Apply form answers
        applyBtn?.addEventListener('click', () => {
            this.handleApplyFormAnswers();
        });

        // Preview form answers
        previewBtn?.addEventListener('click', () => {
            this.handlePreviewFormAnswers();
        });

        // Auto-resize textarea
        chatInput?.addEventListener('input', () => {
            this.autoResizeTextarea(chatInput);
            this.handleAutocomplete(chatInput);
        });

        // Setup auto-scroll functionality
        this.setupAutoScroll();

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

            // Check if this was a form-filling request and we have detected fields
            await this.checkForFormFillingResponse(processedMessage, response);

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
     * Check if the response contains form filling answers and show apply section
     */
    private async checkForFormFillingResponse(userMessage: string, aiResponse: string): Promise<void> {
        // Check if user asked for form filling help
        const formFillingKeywords = ['fill', 'form', 'complete', 'apply', 'submit', 'answer'];
        const isFormFillingRequest = formFillingKeywords.some(keyword => 
            userMessage.toLowerCase().includes(keyword)
        );

        // Check if we have form fields detected and AI provided structured answers
        if (isFormFillingRequest && this.viewModeContext?.formFields?.length > 0) {
            try {
                // Parse AI response for field answers (look for field → answer patterns)
                const answers = this.parseFormAnswersFromResponse(aiResponse);

                if (answers && answers.length > 0) {
                    this.showApplySection(answers);
                }
            } catch (error) {
                Logger.debug('Could not parse form answers from response:', error);
            }
        }
    }

    /**
     * Parse structured form answers from AI response
     */
    private parseFormAnswersFromResponse(response: string): GeneratedAnswer[] {
        const answers: GeneratedAnswer[] = [];

        // Look for patterns like "📝 Field Name → Answer" or "Field Name: Answer"
        const patterns = [
            /📝\s*([^→]+)\s*→\s*([^\n]+)/g,
            /\*\*([^:]+):\*\*\s*([^\n]+)/g,
            /(\w+[\w\s]*?):\s*([^\n]+)/g
        ];

        for (const pattern of patterns) {
            let match;
            while ((match = pattern.exec(response)) !== null) {
                const fieldLabel = match[1].trim();
                const answer = match[2].trim();

                // Skip if already found this field
                if (answers.some(a => a.fieldLabel.toLowerCase() === fieldLabel.toLowerCase())) {
                    continue;
                }

                // Try to match with detected form fields
                const matchingField = this.viewModeContext?.formFields?.find((field: any) => 
                    field.label.toLowerCase().includes(fieldLabel.toLowerCase()) ||
                    fieldLabel.toLowerCase().includes(field.label.toLowerCase())
                );

                if (matchingField) {
                    answers.push({
                        fieldLabel: fieldLabel,
                        fieldType: matchingField.type,
                        answer: answer,
                        confidence: 0.8 // Default confidence
                    });
                }
            }

            // If we found answers with this pattern, break
            if (answers.length > 0) break;
        }

        // If no structured answers found, try to generate simple answers for all fields
        if (answers.length === 0 && this.viewModeContext?.formFields) {
            for (const field of this.viewModeContext.formFields) {
                // Generate simple answers based on field type and label
                const answer = this.generateSimpleAnswer(field);
                if (answer) {
                    answers.push({
                        fieldLabel: field.label,
                        fieldType: field.type,
                        answer: answer,
                        confidence: 0.6
                    });
                }
            }
        }

        Logger.debug('Parsed form answers:', answers);
        return answers;
    }

    /**
     * Generate a simple answer for a form field
     */
    private generateSimpleAnswer(field: any): string | null {
        const label = field.label.toLowerCase();
        
        // Common field patterns and default answers
        if (label.includes('name')) {
            return 'John Doe';
        } else if (label.includes('email')) {
            return 'john.doe@example.com';
        } else if (label.includes('phone')) {
            return '(555) 123-4567';
        } else if (label.includes('company') || label.includes('organization')) {
            return 'Tech Corp';
        } else if (label.includes('title') || label.includes('position')) {
            return 'Software Developer';
        } else if (label.includes('address')) {
            return '123 Main Street';
        } else if (label.includes('city')) {
            return 'San Francisco';
        } else if (label.includes('state') || label.includes('province')) {
            return 'CA';
        } else if (label.includes('zip') || label.includes('postal')) {
            return '94102';
        } else if (label.includes('country')) {
            return 'United States';
        } else if (field.type === 'textarea') {
            return 'This is a sample response for the form field.';
        } else if (field.type === 'select') {
            return 'Option 1'; // Would need to inspect actual options
        }
        
        return null;
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

        // Auto scroll to bottom if enabled
        if (this.autoScrollEnabled) {
            setTimeout(() => {
                this.scrollToBottom(true);
            }, 100);
        }

        Logger.ui(`Message added: ${role}`, 'ChatPanel');
    }

    /**
     * Add an analysis message to the chat with structured format
     */
    public addAnalysisMessage(results: any): void {
        let content = '🔍 **Page Analysis Results**\n\n';
        
        if (results.summary) {
            content += `**Summary:** ${results.summary}\n\n`;
        }
        
        if (results.formFields && results.formFields.length > 0) {
            content += '**Form Fields Detected:**\n';
            results.formFields.forEach((field: any, index: number) => {
                content += `${index + 1}. ${field.label || field.name || 'Unnamed field'} (${field.type})\n`;
            });
            content += '\n';
        }
        
        if (results.suggestions && results.suggestions.length > 0) {
            content += '**Suggested Actions:**\n';
            results.suggestions.forEach((suggestion: string, index: number) => {
                content += `• ${suggestion}\n`;
            });
            content += '\n';
        }
        
        content += '*Would you like me to help you fill out any forms or take specific actions?*';
        
        this.addMessage('assistant', content);
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
     * Handle autocomplete suggestions for @doc
     */
    private async handleAutocomplete(textarea: HTMLTextAreaElement): Promise<void> {
        const value = textarea.value;
        const cursorPosition = textarea.selectionStart;
        
        // Check if user typed @ at current position
        if (value.charAt(cursorPosition - 1) === '@') {
            // Check if there's a stored document
            const storedDoc = await StorageManager.getCurrentDocument();
            if (storedDoc) {
                this.showAutocompleteDropdown(textarea, [{
                    text: 'doc',
                    description: storedDoc.name,
                    fullText: '@doc'
                }]);
            }
        } else if (value.substring(0, cursorPosition).endsWith('@d')) {
            // Show doc suggestion when typing @d
            const storedDoc = await StorageManager.getCurrentDocument();
            if (storedDoc) {
                this.showAutocompleteDropdown(textarea, [{
                    text: 'doc',
                    description: storedDoc.name,
                    fullText: '@doc'
                }]);
            }
        } else {
            // Hide autocomplete if not typing @
            this.hideAutocompleteDropdown();
        }
    }

    /**
     * Show autocomplete dropdown with suggestions
     */
    private showAutocompleteDropdown(textarea: HTMLTextAreaElement, suggestions: Array<{text: string, description: string, fullText: string}>): void {
        // Remove existing dropdown
        this.hideAutocompleteDropdown();
        
        const dropdown = document.createElement('div');
        dropdown.id = 'autocomplete-dropdown';
        dropdown.style.cssText = `
            position: absolute;
            bottom: 100%;
            left: 0;
            right: 0;
            background: var(--bg-color);
            border: 1px solid var(--border-color);
            border-radius: 8px;
            box-shadow: 0 4px 12px rgba(0, 0, 0, 0.2);
            z-index: 1000;
            max-height: 200px;
            overflow-y: auto;
        `;
        
        suggestions.forEach((suggestion, index) => {
            const item = document.createElement('div');
            item.style.cssText = `
                padding: 12px 16px;
                cursor: pointer;
                border-bottom: 1px solid var(--border-color);
                transition: background-color 0.2s ease;
            `;
            item.innerHTML = `
                <div style="font-weight: 500; color: var(--text-color);">${suggestion.fullText}</div>
                <div style="font-size: 12px; color: var(--text-secondary); margin-top: 4px;">${suggestion.description}</div>
            `;
            
            item.addEventListener('mouseenter', () => {
                item.style.backgroundColor = 'var(--hover-color)';
            });
            
            item.addEventListener('mouseleave', () => {
                item.style.backgroundColor = 'transparent';
            });
            
            item.addEventListener('click', () => {
                this.insertAutocomplete(textarea, suggestion.fullText);
            });
            
            dropdown.appendChild(item);
        });
        
        // Add dropdown to input container
        const inputContainer = textarea.closest('.input-container') as HTMLElement;
        if (inputContainer) {
            inputContainer.style.position = 'relative';
            inputContainer.appendChild(dropdown);
        }
    }

    /**
     * Hide autocomplete dropdown
     */
    private hideAutocompleteDropdown(): void {
        const dropdown = this.shadowRoot?.getElementById('autocomplete-dropdown');
        if (dropdown) {
            dropdown.remove();
        }
    }

    /**
     * Insert autocomplete suggestion into textarea
     */
    private insertAutocomplete(textarea: HTMLTextAreaElement, fullText: string): void {
        const value = textarea.value;
        const cursorPosition = textarea.selectionStart;
        
        // Find the start of the @ mention
        let startPos = cursorPosition - 1;
        while (startPos >= 0 && value.charAt(startPos) !== '@') {
            startPos--;
        }
        
        if (startPos >= 0) {
            // Replace from @ to cursor position with full text
            const newValue = value.substring(0, startPos) + fullText + value.substring(cursorPosition);
            textarea.value = newValue;
            
            // Set cursor position after the inserted text
            const newCursorPosition = startPos + fullText.length;
            textarea.setSelectionRange(newCursorPosition, newCursorPosition);
            
            // Trigger input event to resize textarea
            textarea.dispatchEvent(new Event('input'));
        }
        
        this.hideAutocompleteDropdown();
        textarea.focus();
    }

    /**
     * Setup auto-scroll functionality
     */
    private setupAutoScroll(): void {
        if (!this.shadowRoot) return;

        this.messagesContainer = this.shadowRoot.getElementById('chatMessages');
        this.scrollToBottomBtn = this.shadowRoot.getElementById('scrollToBottomBtn');

        if (this.messagesContainer) {
            // Monitor scroll position
            this.messagesContainer.addEventListener('scroll', () => {
                this.updateScrollState();
            });

            // Disable auto scroll on user scroll
            this.messagesContainer.addEventListener('wheel', () => {
                this.autoScrollEnabled = false;
            });

            this.messagesContainer.addEventListener('touchmove', () => {
                this.autoScrollEnabled = false;
            });
        }

        // Scroll to bottom button click
        this.scrollToBottomBtn?.addEventListener('click', () => {
            this.scrollToBottom(true);
            this.autoScrollEnabled = true;
        });
    }

    /**
     * Update scroll state and button visibility
     */
    private updateScrollState(): void {
        if (!this.messagesContainer || !this.scrollToBottomBtn) return;

        const { scrollTop, scrollHeight, clientHeight } = this.messagesContainer;
        const threshold = 100; // Show button when 100px from bottom
        
        this.isAtBottom = scrollHeight - scrollTop - clientHeight < threshold;

        // Show/hide scroll to bottom button
        if (this.isAtBottom) {
            this.scrollToBottomBtn.style.display = 'none';
            this.autoScrollEnabled = true;
        } else {
            this.scrollToBottomBtn.style.display = 'flex';
        }
    }

    /**
     * Scroll to bottom with optional smooth behavior
     */
    private scrollToBottom(smooth: boolean = false): void {
        if (!this.messagesContainer) return;

        if (smooth) {
            this.messagesContainer.scrollTo({
                top: this.messagesContainer.scrollHeight,
                behavior: 'smooth'
            });
        } else {
            this.messagesContainer.scrollTop = this.messagesContainer.scrollHeight;
        }
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
     * Show apply section with form answers
     */
    private showApplySection(answers: GeneratedAnswer[]): void {
        this.generatedAnswers = answers;
        const applySection = this.shadowRoot?.getElementById('applySection');
        const applyDescription = this.shadowRoot?.getElementById('applyDescription');
        
        if (applySection && applyDescription) {
            applyDescription.textContent = `Ready to fill ${answers.length} form fields`;
            applySection.style.display = 'block';
            
            // Auto-hide after 30 seconds unless user interacts
            setTimeout(() => {
                if (applySection.style.display === 'block') {
                    applySection.style.display = 'none';
                }
            }, 30000);
        }
    }

    /**
     * Hide apply section
     */
    private hideApplySection(): void {
        const applySection = this.shadowRoot?.getElementById('applySection');
        if (applySection) {
            applySection.style.display = 'none';
        }
        this.generatedAnswers = [];
    }

    /**
     * Handle applying form answers
     */
    private async handleApplyFormAnswers(): Promise<void> {
        if (!this.generatedAnswers.length || !this.viewModeContext?.formFields) {
            this.addMessage('assistant', '❌ No form answers available to apply. Please ask for form filling help first.');
            return;
        }

        try {
            // Show loading state
            const applyBtn = this.shadowRoot?.getElementById('applyBtn') as HTMLButtonElement;
            if (applyBtn) {
                applyBtn.disabled = true;
                applyBtn.innerHTML = `
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                        <path d="M21 12a9 9 0 0 0-9-9 9.75 9.75 0 0 0-6.74 2.74L3 8"/>
                        <path d="M3 3v5h5"/>
                        <path d="M3 12a9 9 0 0 0 9 9 9.75 9.75 0 0 0 6.74-2.74L21 16"/>
                        <path d="M16 16h5v5"/>
                    </svg>
                    Applying...
                `;
            }

            // Apply the answers to form fields
            const success = await this.fieldInjector.injectAnswers(
                this.generatedAnswers,
                this.viewModeContext.formFields
            );

            // Restore button state
            if (applyBtn) {
                applyBtn.disabled = false;
                applyBtn.innerHTML = `
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                        <polyline points="20,6 9,17 4,12"/>
                    </svg>
                    Apply Now
                `;
            }

            if (success) {
                this.addMessage('assistant', '✅ Form fields have been successfully filled with AI-generated answers!');
                this.hideApplySection();
            } else {
                this.addMessage('assistant', '⚠️ Some form fields could not be filled. Please check the form and try again.');
            }

        } catch (error) {
            Logger.error('Error applying form answers:', error);
            this.addMessage('assistant', '❌ Failed to apply form answers. Please try again.');
        }
    }

    /**
     * Handle previewing form answers
     */
    private handlePreviewFormAnswers(): void {
        if (!this.generatedAnswers.length) {
            this.addMessage('assistant', '❌ No form answers available to preview.');
            return;
        }

        // Create preview message
        let previewText = '📋 **Form Answer Preview:**\n\n';
        this.generatedAnswers.forEach((answer, index) => {
            previewText += `**${index + 1}. ${answer.fieldLabel}**\n`;
            previewText += `${answer.answer}\n`;
            previewText += `*Confidence: ${Math.round(answer.confidence * 100)}%*\n\n`;
        });

        previewText += `Ready to apply ${this.generatedAnswers.length} answers to the form.`;

        this.addMessage('assistant', previewText);
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
     * Handle voice input from speech recognition
     */
    handleVoiceInput(transcript: string): void {
        const chatInput = this.shadowRoot?.getElementById('chatInput') as HTMLTextAreaElement;
        if (chatInput) {
            // Set the transcript as input value
            chatInput.value = transcript;
            
            // Trigger input event to resize textarea and handle autocomplete
            chatInput.dispatchEvent(new Event('input'));
            
            // Focus the input
            chatInput.focus();
            
            // Optionally auto-send the message
            // Uncomment the line below if you want to auto-send voice messages
            // this.handleSendMessage();
            
            Logger.ui('Voice input processed:', transcript);
        }
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