import { Constants } from '../../utils/constants';
import { ThemeManager } from '../../utils/ThemeManager';
import { Logger } from '../../utils/logger';
import { AIServiceFactory } from '../../ai/AIServiceFactory';
import { FormFieldDetector } from '../FormFieldDetector';

export class ViewModeScanner {
    private scannerElement: HTMLElement | null = null;
    private resultPanel: HTMLElement | null = null;
    private shadowRoot: ShadowRoot | null = null;
    private isScanning = false;

    constructor() {
        this.createScannerElement();
    }

    /**
     * Create the scanner overlay element
     */
    private createScannerElement(): void {
        this.scannerElement = document.createElement('div');
        this.scannerElement.id = Constants.IDS.SCANNER_OVERLAY;
        this.scannerElement.style.cssText = `
            position: fixed;
            left: 0;
            top: 0;
            width: 100%;
            height: 4px;
            z-index: ${Constants.Z_INDEX.SCANNER_OVERLAY};
            display: none;
            pointer-events: none;
        `;

        // Apply scanner styling
        this.scannerElement.className = Constants.CLASSES.SCANNER;

        document.body.appendChild(this.scannerElement);

        Logger.ui('Scanner overlay created', 'ViewModeScanner');
    }

    /**
     * Start page scanning animation and analysis
     */
    async scanPage(): Promise<void> {
        if (this.isScanning) {
            Logger.warn('Scan already in progress');
            return;
        }

        try {
            this.isScanning = true;
            Logger.ui('Starting page scan', 'ViewModeScanner');

            // Start visual scanning animation
            this.startScanAnimation();

            // Perform page analysis
            const analysisResults = await this.analyzePageContent();

            // Show results after animation completes
            setTimeout(() => {
                this.showAnalysisResults(analysisResults);
            }, Constants.ANIMATIONS.SCANNER_DURATION);

        } catch (error) {
            Logger.error('Error during page scan:', error);
            this.showError('Failed to analyze page. Please try again.');
        } finally {
            this.isScanning = false;
        }
    }

    /**
     * Start the scanning animation
     */
    private startScanAnimation(): void {
        if (!this.scannerElement) return;

        this.scannerElement.style.display = 'block';
        this.scannerElement.style.animation = `netherite-scan-effect ${Constants.ANIMATIONS.SCANNER_DURATION}ms ease-in-out`;

        // Hide scanner after animation
        setTimeout(() => {
            if (this.scannerElement) {
                this.scannerElement.style.display = 'none';
                this.scannerElement.style.animation = '';
            }
        }, Constants.ANIMATIONS.SCANNER_DURATION);

        Logger.debug('Scan animation started');
    }

    /**
     * Analyze page content using AI
     */
    private async analyzePageContent(): Promise<any> {
        const formDetector = new FormFieldDetector();

        // Get page content
        const pageContent = this.getPageContent();
        
        // Detect form fields
        const formFields = formDetector.detectFields();
        
        Logger.debug('Page analysis started', {
            htmlLength: pageContent.html.length,
            formFieldsCount: formFields.length
        });

        let analysisResult = '';

        try {
            // Check if AI is available
            const isAIAvailable = await AIServiceFactory.isAvailable();
            
            if (isAIAvailable) {
                const aiService = AIServiceFactory.getInstance();
                
                // Generate AI analysis
                analysisResult = await aiService.analyzeWebpage(
                    pageContent.html,
                    pageContent.title,
                    pageContent.url
                );
                
                Logger.info('AI analysis completed successfully');
            } else {
                analysisResult = this.generateFallbackAnalysis(pageContent, formFields);
                Logger.warn('AI not available, using fallback analysis');
            }
        } catch (error) {
            Logger.error('AI analysis failed, using fallback:', error);
            analysisResult = this.generateFallbackAnalysis(pageContent, formFields);
        }

        return {
            aiAnalysis: analysisResult,
            formFields: formFields,
            pageInfo: pageContent,
            timestamp: Date.now()
        };
    }

    /**
     * Generate fallback analysis when AI is not available
     */
    private generateFallbackAnalysis(pageContent: any, formFields: any[]): string {
        const { title, url } = pageContent;
        
        let analysis = `**Page Summary**\n\n`;
        analysis += `Title: ${title}\n`;
        analysis += `URL: ${url}\n\n`;
        
        if (formFields.length > 0) {
            analysis += `**Form Analysis**\n\n`;
            analysis += `This page contains ${formFields.length} form field(s) that could be filled:\n\n`;
            
            formFields.forEach((field, index) => {
                analysis += `${index + 1}. ${field.label || 'Unlabeled field'} (${field.type})`;
                if (field.required) analysis += ` - Required`;
                analysis += `\n`;
            });
            
            analysis += `\n*Note: AI analysis is currently unavailable. Please ensure Chrome flags are enabled for Gemini Nano.*`;
        } else {
            analysis += `**Content Overview**\n\n`;
            analysis += `This page appears to be informational content without detectable form fields.\n\n`;
            analysis += `*Note: AI analysis is currently unavailable. Please ensure Chrome flags are enabled for Gemini Nano to get detailed page insights.*`;
        }
        
        return analysis;
    }

    /**
     * Get meaningful page content for AI analysis
     */
    private getPageContent(): { html: string; title: string; url: string } {
        // Find main content areas
        const contentSelectors = [
            'main',
            'article', 
            '[role="main"]',
            '.content',
            '#content',
            '.main-content',
            'section'
        ];

        let contentHTML = '';
        
        for (const selector of contentSelectors) {
            const elements = document.querySelectorAll(selector);
            if (elements.length > 0) {
                elements.forEach(el => {
                    contentHTML += el.outerHTML;
                });
                break; // Use the first matching content area
            }
        }

        // Fallback to body if no semantic content found
        if (!contentHTML) {
            const body = document.body.cloneNode(true) as HTMLElement;
            
            // Remove scripts, styles, and extension elements
            const elementsToRemove = body.querySelectorAll(
                'script, style, noscript, [id^="netherite"], [class*="netherite"], iframe, .ads, .advertisement'
            );
            elementsToRemove.forEach(el => el.remove());
            
            contentHTML = body.innerHTML;
        }

        // Limit content size for AI processing
        const maxLength = 8000; // Reasonable limit for AI analysis
        if (contentHTML.length > maxLength) {
            contentHTML = contentHTML.substring(0, maxLength) + '\n... [content truncated for analysis]';
        }

        return {
            html: contentHTML,
            title: document.title,
            url: window.location.href
        };
    }

    /**
     * Show analysis results in chat instead of overlay
     */
    private showAnalysisResults(results: any): void {
        // Instead of creating an overlay panel, dispatch event to open chat with results
        const event = new CustomEvent('netherite:view-complete', {
            detail: {
                ...results,
                showInChat: true
            }
        });
        document.dispatchEvent(event);

        Logger.ui('Analysis results sent to chat', 'ViewModeScanner');
    }

    /**
     * Create and show the results panel
     */
    private createResultPanel(results: any): void {
        // Remove existing panel if any
        this.removeResultPanel();

        // Create panel element
        this.resultPanel = document.createElement('div');
        this.resultPanel.id = Constants.IDS.VIEW_PANEL;
        this.resultPanel.style.cssText = `
            position: fixed;
            top: 50%;
            left: 50%;
            transform: translate(-50%, -50%);
            width: ${Constants.UI_DIMENSIONS.VIEW_PANEL.WIDTH}px;
            max-height: ${Constants.UI_DIMENSIONS.VIEW_PANEL.HEIGHT}px;
            z-index: ${Constants.Z_INDEX.VIEW_PANEL};
            pointer-events: auto;
        `;

        // Create shadow DOM
        this.shadowRoot = this.resultPanel.attachShadow({ mode: 'open' });
        
        // Inject theme CSS
        ThemeManager.injectThemeCSS(this.shadowRoot);
        ThemeManager.watchThemeChanges(this.shadowRoot);

        // Create panel content
        this.shadowRoot.innerHTML = `
            <div class="view-panel netherite-glass netherite-animate-fade-in">
                <div class="panel-header">
                    <h2>📄 Page Analysis</h2>
                    <div class="panel-actions">
                        <button id="openChatBtn" class="action-btn primary">
                            💬 Open Chat
                        </button>
                        <button id="closeBtn" class="close-btn">×</button>
                    </div>
                </div>
                
                <div class="panel-content">
                    <div class="analysis-section">
                        ${this.formatAnalysisResults(results)}
                    </div>
                </div>
            </div>

            <style>
                .view-panel {
                    width: 100%;
                    max-height: 100%;
                    display: flex;
                    flex-direction: column;
                    overflow: hidden;
                }

                .panel-header {
                    display: flex;
                    justify-content: space-between;
                    align-items: center;
                    padding: 20px 24px 16px;
                    border-bottom: 1px solid var(--netherite-border);
                }

                .panel-header h2 {
                    margin: 0;
                    font-size: 18px;
                    font-weight: 600;
                    color: var(--netherite-text-primary);
                }

                .panel-actions {
                    display: flex;
                    align-items: center;
                    gap: 8px;
                }

                .action-btn {
                    padding: 8px 16px;
                    border: none;
                    border-radius: 8px;
                    font-size: 14px;
                    font-weight: 500;
                    cursor: pointer;
                    transition: all 0.2s ease;
                }

                .action-btn.primary {
                    background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
                    color: white;
                }

                .action-btn.primary:hover {
                    transform: translateY(-1px);
                    box-shadow: 0 4px 12px rgba(102, 126, 234, 0.3);
                }

                .close-btn {
                    width: 32px;
                    height: 32px;
                    border: none;
                    border-radius: 50%;
                    background: var(--netherite-hover-bg);
                    color: var(--netherite-text-secondary);
                    font-size: 18px;
                    font-weight: bold;
                    cursor: pointer;
                    transition: all 0.2s ease;
                }

                .close-btn:hover {
                    background: var(--netherite-active-bg);
                    color: var(--netherite-text-primary);
                }

                .panel-content {
                    flex: 1;
                    overflow-y: auto;
                    padding: 0 24px 24px;
                }

                .analysis-section {
                    color: var(--netherite-text-primary);
                    line-height: 1.6;
                }

                .analysis-section h3 {
                    color: var(--netherite-text-accent);
                    font-size: 16px;
                    margin: 20px 0 12px 0;
                }

                .analysis-section p {
                    margin: 8px 0;
                }

                .field-list {
                    list-style: none;
                    padding: 0;
                    margin: 12px 0;
                }

                .field-item {
                    display: flex;
                    align-items: center;
                    padding: 8px 12px;
                    margin: 4px 0;
                    background: var(--netherite-bg-secondary);
                    border-radius: 6px;
                    font-size: 14px;
                }

                .field-type {
                    background: var(--netherite-text-accent);
                    color: white;
                    padding: 2px 8px;
                    border-radius: 12px;
                    font-size: 12px;
                    margin-left: 8px;
                }

                .required {
                    color: #ef4444;
                    font-weight: 600;
                }

                /* Scrollbar styling */
                .panel-content::-webkit-scrollbar {
                    width: 6px;
                }

                .panel-content::-webkit-scrollbar-track {
                    background: var(--netherite-bg-secondary);
                    border-radius: 3px;
                }

                .panel-content::-webkit-scrollbar-thumb {
                    background: var(--netherite-text-secondary);
                    border-radius: 3px;
                }

                .panel-content::-webkit-scrollbar-thumb:hover {
                    background: var(--netherite-text-primary);
                }
            </style>
        `;

        // Set up event listeners
        this.setupResultPanelEvents();

        // Add to document
        document.body.appendChild(this.resultPanel);

        Logger.ui('Results panel created and displayed', 'ViewModeScanner');
    }

    /**
     * Format AI analysis results for display
     */
    private formatAnalysisResults(results: any): string {
        const { aiAnalysis, formFields, pageInfo } = results;

        let formattedHTML = `
            <div class="ai-analysis">
                <h3>🤖 AI Analysis</h3>
                <div class="analysis-content">
                    ${this.formatAIAnalysisText(aiAnalysis)}
                </div>
            </div>
        `;

        if (formFields && formFields.length > 0) {
            formattedHTML += `
                <div class="detected-fields">
                    <h3>📝 Detected Form Fields (${formFields.length})</h3>
                    <ul class="field-list">
                        ${formFields.map((field: any) => `
                            <li class="field-item">
                                <span>${field.label || 'Unlabeled field'}</span>
                                <span class="field-type">${field.type}</span>
                                ${field.required ? '<span class="required">*</span>' : ''}
                            </li>
                        `).join('')}
                    </ul>
                </div>
            `;
        }

        return formattedHTML;
    }

    /**
     * Format AI analysis text with proper structure
     */
    private formatAIAnalysisText(analysis: string): string {
        // Convert the AI response to HTML with proper formatting
        return analysis
            .replace(/\n\n/g, '</p><p>')
            .replace(/\n/g, '<br>')
            .replace(/^/, '<p>')
            .replace(/$/, '</p>')
            .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
            .replace(/\*(.*?)\*/g, '<em>$1</em>');
    }

    /**
     * Set up event listeners for result panel
     */
    private setupResultPanelEvents(): void {
        if (!this.shadowRoot) return;

        const closeBtn = this.shadowRoot.getElementById('closeBtn');
        const openChatBtn = this.shadowRoot.getElementById('openChatBtn');

        closeBtn?.addEventListener('click', () => {
            this.removeResultPanel();
        });

        openChatBtn?.addEventListener('click', () => {
            // Close this panel and open chat
            this.removeResultPanel();
            
            // Trigger chat mode
            const event = new CustomEvent('netherite:chat-mode', {
                detail: { fromViewMode: true }
            });
            document.dispatchEvent(event);
        });

        // Close on escape key
        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape' && this.resultPanel) {
                this.removeResultPanel();
            }
        });
    }

    /**
     * Remove the results panel
     */
    private removeResultPanel(): void {
        if (this.resultPanel) {
            ThemeManager.removeObserver(this.shadowRoot!);
            document.body.removeChild(this.resultPanel);
            this.resultPanel = null;
            this.shadowRoot = null;
            
            Logger.ui('Results panel removed', 'ViewModeScanner');
        }
    }

    /**
     * Show error message
     */
    private showError(message: string): void {
        // Simple error notification - could be enhanced with a proper notification system
        console.error('[Netherite ViewScanner]:', message);
        
        // You could create a simple toast notification here
        const notification = document.createElement('div');
        notification.style.cssText = `
            position: fixed;
            top: 20px;
            right: 20px;
            background: #ef4444;
            color: white;
            padding: 12px 20px;
            border-radius: 8px;
            z-index: ${Constants.Z_INDEX.FLOATING_TOOLBAR + 1};
            font-family: system-ui, sans-serif;
        `;
        notification.textContent = message;
        
        document.body.appendChild(notification);
        
        setTimeout(() => {
            if (notification.parentNode) {
                document.body.removeChild(notification);
            }
        }, 5000);
    }

    /**
     * Check if currently scanning
     */
    isCurrentlyScanning(): boolean {
        return this.isScanning;
    }

    /**
     * Destroy the scanner and clean up
     */
    destroy(): void {
        this.removeResultPanel();
        
        if (this.scannerElement) {
            document.body.removeChild(this.scannerElement);
            this.scannerElement = null;
        }

        Logger.ui('ViewModeScanner destroyed', 'ViewModeScanner');
    }
}