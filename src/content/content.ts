/// <reference types="chrome"/>
import { FloatingToolbar } from './components/FloatingToolbar';
import { ViewModeScanner } from './components/ViewModeScanner';
import { ChatPanel } from './components/ChatPanel';
import { FormFieldDetector } from './FormFieldDetector';
import { AIServiceFactory } from '../ai/AIServiceFactory';
import { Logger } from '../utils/logger';
import { Constants } from '../utils/constants';

/**
 * Main content script for Netherite Chrome Extension
 * Handles initialization and coordination of UI components
 */
class NetheriteContentScript {
    private floatingToolbar: FloatingToolbar | null = null;
    private viewModeScanner: ViewModeScanner | null = null;
    private chatPanel: ChatPanel | null = null;
    private formFieldDetector: FormFieldDetector | null = null;
    private isInitialized = false;

    constructor() {
        this.initialize();
    }

    /**
     * Initialize the extension on the current page
     */
    private async initialize(): Promise<void> {
        try {
            Logger.info('Netherite content script initializing...');

            // Check if AI is available before proceeding
            const isAIAvailable = await AIServiceFactory.isAvailable();
            if (!isAIAvailable) {
                Logger.warn('AI services not available - extension functionality limited');
            }

            // Wait for DOM to be ready
            if (document.readyState === 'loading') {
                document.addEventListener('DOMContentLoaded', () => {
                    this.setupComponents();
                });
            } else {
                this.setupComponents();
            }

            // Set up global event listeners
            this.setupGlobalEventListeners();

            // Listen for Chrome Extension commands
            this.setupExtensionCommands();

            this.isInitialized = true;
            Logger.success('Netherite content script initialized successfully');

        } catch (error) {
            Logger.error('Failed to initialize Netherite content script:', error);
        }
    }

    /**
     * Set up UI components
     */
    private setupComponents(): void {
        try {
            // Create floating toolbar
            this.floatingToolbar = new FloatingToolbar();

            // Create form field detector
            this.formFieldDetector = new FormFieldDetector();

            // Create view mode scanner (lazy initialization)
            // Will be created when needed

            // Create chat panel (lazy initialization)  
            // Will be created when needed

            Logger.debug('UI components set up');

        } catch (error) {
            Logger.error('Failed to set up UI components:', error);
        }
    }

    /**
     * Set up global event listeners for component communication
     */
    private setupGlobalEventListeners(): void {
        // Listen for toolbar events
        document.addEventListener('netherite:view-mode', this.handleViewModeActivation.bind(this) as EventListener);
        document.addEventListener('netherite:chat-mode', this.handleChatModeActivation.bind(this) as EventListener);
        document.addEventListener('netherite:voice-mode', this.handleVoiceModeActivation.bind(this) as EventListener);

        // Listen for view mode completion
        document.addEventListener('netherite:view-complete', this.handleViewModeComplete.bind(this) as EventListener);

        // Listen for chat events
        document.addEventListener('netherite:chat-close', this.handleChatClose.bind(this) as EventListener);

        // Handle page visibility changes
        document.addEventListener('visibilitychange', () => {
            if (document.hidden) {
                Logger.debug('Page became hidden');
            } else {
                Logger.debug('Page became visible');
            }
        });

        Logger.debug('Global event listeners set up');
    }

    /**
     * Set up Chrome Extension command listeners
     */
    private setupExtensionCommands(): void {
        // Listen for keyboard shortcut activation
        if (chrome?.commands) {
            chrome.commands.onCommand.addListener((command: string) => {
                Logger.chromeAPI('commands', 'onCommand', command);
                
                if (command === 'toggle-toolbar') {
                    this.floatingToolbar?.toggle();
                }
            });
        }

        // Listen for messages from background script or popup
        if (chrome?.runtime) {
            chrome.runtime.onMessage.addListener((request: any, sender: chrome.runtime.MessageSender, sendResponse: (response?: any) => void) => {
                Logger.chromeAPI('runtime', 'onMessage', request);
                
                this.handleRuntimeMessage(request, sender, sendResponse);
                return true; // Keep message channel open for async response
            });
        }
    }

    /**
     * Handle messages from other parts of the extension
     */
    private handleRuntimeMessage(request: any, sender: chrome.runtime.MessageSender, sendResponse: (response?: any) => void): void {
        switch (request.type) {
            case 'toggle-toolbar':
                this.floatingToolbar?.show();
                sendResponse({ success: true });
                break;

            case 'deactivate-toolbar':
                this.floatingToolbar?.hide();
                sendResponse({ success: true });
                break;

            case 'get-page-info':
                const pageInfo = {
                    title: document.title,
                    url: window.location.href,
                    formFields: this.formFieldDetector?.getDetectedFields() || []
                };
                sendResponse(pageInfo);
                break;

            case 'check-ai-status':
                AIServiceFactory.isAvailable().then(isAvailable => {
                    sendResponse({ aiAvailable: isAvailable });
                });
                break;

            default:
                Logger.warn('Unknown runtime message type:', request.type);
                sendResponse({ error: 'Unknown message type' });
        }
    }

    /**
     * Handle View mode activation from floating toolbar
     */
    private async handleViewModeActivation(event: Event): Promise<void> {
        try {
            Logger.ui('View mode activated', 'ContentScript');

            // Create view mode scanner if not exists
            if (!this.viewModeScanner) {
                this.viewModeScanner = new ViewModeScanner();
            }

            // Update toolbar button states
            this.floatingToolbar?.updateButtonStates('scanner');

            // Start page analysis
            await this.viewModeScanner.scanPage();

        } catch (error) {
            Logger.error('Error activating view mode:', error);
        }
    }

    /**
     * Handle Chat mode activation from floating toolbar
     */
    private async handleChatModeActivation(event: Event): Promise<void> {
        try {
            Logger.ui('Chat mode activated', 'ContentScript');

            // Create chat panel if not exists
            if (!this.chatPanel) {
                this.chatPanel = new ChatPanel();
            }

            // Update toolbar button states
            this.floatingToolbar?.updateButtonStates('chat');

            // Show chat panel
            this.chatPanel.show();

        } catch (error) {
            Logger.error('Error activating chat mode:', error);
        }
    }

    /**
     * Handle Voice mode activation with speech-to-text
     */
    private handleVoiceModeActivation(event: Event): void {
        Logger.ui('Voice mode activated - Starting speech recognition', 'ContentScript');
        this.startSpeechRecognition();
    }

    /**
     * Start speech recognition and send results to chat
     */
    private startSpeechRecognition(): void {
        // Check if browser supports speech recognition
        const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
        
        if (!SpeechRecognition) {
            Logger.error('Speech recognition not supported in this browser');
            this.showToast('❌ Speech recognition not supported in this browser');
            return;
        }

        const recognition = new SpeechRecognition();
        recognition.continuous = false;
        recognition.interimResults = false;
        recognition.lang = 'en-US';

        // Show chat panel if not visible
        if (!this.chatPanel?.isOpen()) {
            this.handleChatModeActivation(new CustomEvent('netherite:chat-mode'));
        }

        // Update toolbar state to show voice is active
        this.floatingToolbar?.updateButtonStates('voice');

        // Show toast indicating recording
        this.showToast('🎤 Listening... Speak now!');

        recognition.onstart = () => {
            Logger.ui('Speech recognition started', 'ContentScript');
        };

        recognition.onresult = (event: any) => {
            const transcript = event.results[0][0].transcript;
            Logger.ui('Speech recognized:', transcript);
            
            // Send the recognized text to chat
            if (this.chatPanel) {
                this.chatPanel.handleVoiceInput(transcript);
            }
            
            // Reset toolbar state
            this.floatingToolbar?.updateButtonStates('chat');
            this.showToast('✅ Voice input processed!');
        };

        recognition.onerror = (event: any) => {
            Logger.error('Speech recognition error:', event.error);
            this.floatingToolbar?.updateButtonStates(null);
            
            let errorMessage = '❌ Speech recognition failed';
            switch (event.error) {
                case 'no-speech':
                    errorMessage = '❌ No speech detected. Please try again.';
                    break;
                case 'audio-capture':
                    errorMessage = '❌ Microphone not accessible. Please check permissions.';
                    break;
                case 'not-allowed':
                    errorMessage = '❌ Microphone permission denied. Please allow microphone access.';
                    break;
            }
            this.showToast(errorMessage);
        };

        recognition.onend = () => {
            Logger.ui('Speech recognition ended', 'ContentScript');
            // Reset toolbar state if not already done
            if (this.floatingToolbar) {
                setTimeout(() => {
                    this.floatingToolbar?.updateButtonStates('chat');
                }, 1000);
            }
        };

        // Start recognition
        try {
            recognition.start();
        } catch (error) {
            Logger.error('Failed to start speech recognition:', error);
            this.showToast('❌ Failed to start speech recognition');
        }
    }

    /**
     * Show a toast notification
     */
    private showToast(message: string): void {
        const toast = document.createElement('div');
        toast.style.cssText = `
            position: fixed;
            top: 20px;
            right: 20px;
            background: rgba(0, 0, 0, 0.8);
            color: white;
            padding: 12px 20px;
            border-radius: 8px;
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
            font-size: 14px;
            z-index: 10000;
            box-shadow: 0 4px 12px rgba(0, 0, 0, 0.3);
            transition: opacity 0.3s ease;
            max-width: 300px;
        `;
        toast.textContent = message;
        
        document.body.appendChild(toast);
        
        // Auto-remove after 3 seconds
        setTimeout(() => {
            toast.style.opacity = '0';
            setTimeout(() => {
                if (toast.parentNode) {
                    toast.parentNode.removeChild(toast);
                }
            }, 300);
        }, 3000);
    }

    /**
     * Handle view mode completion and show results in chat
     */
    private handleViewModeComplete(event: Event): void {
        Logger.ui('View mode analysis complete', 'ContentScript');

        // Reset toolbar button states
        this.floatingToolbar?.updateButtonStates(null);

        // Get analysis results from event
        const analysisResults = (event as CustomEvent).detail;

        // If showInChat flag is set, open chat and display results
        if (analysisResults?.showInChat) {
            // Ensure chat panel exists
            if (!this.chatPanel) {
                this.chatPanel = new ChatPanel();
            }

            // Set view mode context
            this.chatPanel.setViewModeContext(analysisResults);

            // Show chat panel
            this.chatPanel.show();

            // Add analysis summary to chat
            this.addAnalysisToChat(analysisResults);
        } else {
            // Fallback to original behavior
            if (analysisResults && this.chatPanel) {
                this.chatPanel.setViewModeContext(analysisResults);
            }
        }
    }

    /**
     * Add analysis results as a message in chat
     */
    private addAnalysisToChat(results: any): void {
        if (!this.chatPanel) return;

        // Format analysis results as a chat message
        let analysisMessage = '📊 **Page Analysis Complete**\n\n';

        // Add form fields summary
        if (results.formFields && results.formFields.length > 0) {
            analysisMessage += `🎯 **Detected ${results.formFields.length} Form Fields:**\n`;
            results.formFields.forEach((field: any, index: number) => {
                analysisMessage += `${index + 1}. **${field.label}** (${field.type})`;
                if (field.required) analysisMessage += ' *Required*';
                analysisMessage += '\n';
            });
            analysisMessage += '\n';
        }

        // Add AI analysis summary
        if (results.aiAnalysis) {
            analysisMessage += '🤖 **AI Analysis:**\n';
            analysisMessage += results.aiAnalysis.substring(0, 500);
            if (results.aiAnalysis.length > 500) {
                analysisMessage += '... [view full analysis above]';
            }
            analysisMessage += '\n\n';
        }

        // Add todo suggestions
        analysisMessage += '📝 **What can I help you with?**\n';
        analysisMessage += '• Type "@doc help me fill this form" to use your uploaded document\n';
        analysisMessage += '• Ask "Generate answers for this form"\n';
        analysisMessage += '• Request "Help me complete the required fields"\n';
        analysisMessage += '• Upload a document using the extension popup for personalized answers';

        // Add the message to chat using a custom method
        this.chatPanel.addAnalysisMessage(analysisMessage);
    }

    /**
     * Handle chat panel close
     */
    private handleChatClose(event: Event): void {
        Logger.ui('Chat panel closed', 'ContentScript');

        // Reset toolbar button states
        this.floatingToolbar?.updateButtonStates(null);
    }

    /**
     * Get current page content for AI analysis
     */
    getPageContent(): { html: string; title: string; url: string } {
        // Get meaningful page content (excluding scripts, styles, etc.)
        const contentElements = document.querySelectorAll('main, article, section, .content, #content, [role="main"]');
        
        let html = '';
        if (contentElements.length > 0) {
            // Use semantic content areas if available
            contentElements.forEach(el => {
                html += el.outerHTML;
            });
        } else {
            // Fallback to body content, but filter out non-content elements
            const body = document.body.cloneNode(true) as HTMLElement;
            
            // Remove scripts, styles, and Netherite elements
            const elementsToRemove = body.querySelectorAll(
                'script, style, noscript, [id^="netherite"], [class*="netherite"]'
            );
            elementsToRemove.forEach(el => el.remove());
            
            html = body.innerHTML;
        }

        // Limit HTML size for AI processing
        if (html.length > 10000) {
            html = html.substring(0, 10000) + '... [content truncated]';
        }

        return {
            html,
            title: document.title,
            url: window.location.href
        };
    }

    /**
     * Check if extension is initialized
     */
    isReady(): boolean {
        return this.isInitialized;
    }

    /**
     * Clean up resources when page is unloaded
     */
    private cleanup(): void {
        Logger.info('Cleaning up Netherite content script...');

        try {
            this.floatingToolbar?.destroy();
            this.viewModeScanner?.destroy();
            this.chatPanel?.destroy();
            AIServiceFactory.cleanup();

            Logger.success('Netherite content script cleaned up');

        } catch (error) {
            Logger.error('Error during cleanup:', error);
        }
    }
}

// Initialize the content script when the script loads
const netheriteContentScript = new NetheriteContentScript();

// Clean up on page unload
window.addEventListener('beforeunload', () => {
    (netheriteContentScript as any).cleanup();
});

// Export for debugging
(window as any).NetheriteContentScript = netheriteContentScript;