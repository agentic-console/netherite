/// <reference types="chrome"/>
import { StorageManager } from '../utils/storage';
import { AIServiceFactory } from '../ai/AIServiceFactory';
import { Logger } from '../utils/logger';
import { StoredDocument } from '../types/language-model';

/**
 * Netherite Popup Script
 * Handles document upload, settings, and extension status
 */
class NetheritePopup {
    private fileInput: HTMLInputElement | null = null;
    private uploadArea: HTMLElement | null = null;
    private currentDocument: HTMLElement | null = null;
    private statusElement: HTMLElement | null = null;

    constructor() {
        this.initializePopup();
    }

    /**
     * Initialize popup UI and event listeners
     */
    private async initializePopup(): Promise<void> {
        try {
            Logger.info('Initializing Netherite popup');

            // Wait for DOM to be ready
            if (document.readyState === 'loading') {
                document.addEventListener('DOMContentLoaded', () => {
                    this.setupUI();
                });
            } else {
                this.setupUI();
            }

        } catch (error) {
            Logger.error('Failed to initialize popup:', error);
        }
    }

    /**
     * Set up UI elements and event listeners
     */
    private async setupUI(): Promise<void> {
        try {
            // Get DOM elements
            this.fileInput = document.getElementById('fileInput') as HTMLInputElement;
            this.uploadArea = document.getElementById('uploadArea');
            this.currentDocument = document.getElementById('currentDocument');
            this.statusElement = document.getElementById('ai-status');

            // Set up event listeners
            this.setupEventListeners();

            // Check AI status
            await this.updateAIStatus();

            // Load current document if any
            await this.loadCurrentDocument();

            Logger.success('Popup UI initialized');

        } catch (error) {
            Logger.error('Failed to setup popup UI:', error);
        }
    }

    /**
     * Set up event listeners for popup interactions
     */
    private setupEventListeners(): void {
        // File upload area click
        this.uploadArea?.addEventListener('click', () => {
            this.fileInput?.click();
        });

        // File input change
        this.fileInput?.addEventListener('change', (event) => {
            this.handleFileUpload(event);
        });

        // Drag and drop handlers
        this.uploadArea?.addEventListener('dragover', (event) => {
            event.preventDefault();
            this.uploadArea?.classList.add('drag-over');
        });

        this.uploadArea?.addEventListener('dragleave', () => {
            this.uploadArea?.classList.remove('drag-over');
        });

        this.uploadArea?.addEventListener('drop', (event) => {
            event.preventDefault();
            this.uploadArea?.classList.remove('drag-over');
            
            const files = event.dataTransfer?.files;
            if (files && files.length > 0) {
                this.processFile(files[0]);
            }
        });

        // Remove document button
        const removeBtn = document.getElementById('removeDoc');
        removeBtn?.addEventListener('click', () => {
            this.removeCurrentDocument();
        });

        Logger.debug('Popup event listeners set up');
    }

    /**
     * Handle file upload from input
     */
    private async handleFileUpload(event: Event): Promise<void> {
        const target = event.target as HTMLInputElement;
        const files = target.files;

        if (files && files.length > 0) {
            await this.processFile(files[0]);
        }
    }

    /**
     * Process uploaded file
     */
    private async processFile(file: File): Promise<void> {
        try {
            Logger.info('Processing uploaded file:', file.name);

            // Validate file type
            if (!this.isValidFileType(file)) {
                this.showError('Unsupported file type. Please upload .txt, .pdf, .doc, or .docx files.');
                return;
            }

            // Validate file size (10MB limit)
            if (file.size > 10 * 1024 * 1024) {
                this.showError('File too large. Please upload files smaller than 10MB.');
                return;
            }

            // Show upload progress
            this.showUploadProgress(true);

            // Read file content
            const content = await this.readFileContent(file);

            // Validate content length
            if (content.length > 50000) {
                this.showError('Document too long. Please use documents with less than 50,000 characters.');
                this.showUploadProgress(false);
                return;
            }

            // Create document object
            const document: StoredDocument = {
                name: file.name,
                content: content,
                uploadDate: Date.now(),
                size: content.length
            };

            // Save to storage
            await StorageManager.saveDocument(document);

            // Update UI
            this.displayCurrentDocument(document);
            this.showUploadProgress(false);

            Logger.success('Document uploaded successfully:', file.name);

        } catch (error) {
            Logger.error('Error processing file:', error);
            this.showError('Failed to upload document. Please try again.');
            this.showUploadProgress(false);
        }
    }

    /**
     * Check if file type is supported
     */
    private isValidFileType(file: File): boolean {
        const supportedTypes = [
            'text/plain',
            'application/pdf',
            'application/msword',
            'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
        ];

        const supportedExtensions = ['.txt', '.pdf', '.doc', '.docx'];

        return supportedTypes.includes(file.type) || 
               supportedExtensions.some(ext => file.name.toLowerCase().endsWith(ext));
    }

    /**
     * Read file content as text
     */
    private async readFileContent(file: File): Promise<string> {
        return new Promise((resolve, reject) => {
            const reader = new FileReader();

            reader.onload = () => {
                const content = reader.result as string;
                resolve(content);
            };

            reader.onerror = () => {
                reject(new Error('Failed to read file'));
            };

            // For now, only handle text files
            // Future: Add PDF parsing, Word document parsing
            if (file.type === 'text/plain' || file.name.toLowerCase().endsWith('.txt')) {
                reader.readAsText(file);
            } else {
                // For other file types, show helpful message
                reject(new Error('Currently only .txt files are supported. PDF and Word support coming soon!'));
            }
        });
    }

    /**
     * Load and display current document from storage
     */
    private async loadCurrentDocument(): Promise<void> {
        try {
            const document = await StorageManager.getCurrentDocument();
            
            if (document) {
                this.displayCurrentDocument(document);
            } else {
                this.hideCurrentDocument();
            }

        } catch (error) {
            Logger.error('Failed to load current document:', error);
        }
    }

    /**
     * Display current document in UI
     */
    private displayCurrentDocument(doc: StoredDocument): void {
        const docName = document.getElementById('docName');
        
        if (docName) {
            docName.textContent = doc.name;
        }

        // Show current document section
        if (this.currentDocument) {
            this.currentDocument.style.display = 'block';
        }

        // Hide upload area
        if (this.uploadArea) {
            this.uploadArea.style.display = 'none';
        }

        Logger.ui('Current document displayed', 'Popup');
    }

    /**
     * Hide current document section
     */
    private hideCurrentDocument(): void {
        // Hide current document section
        if (this.currentDocument) {
            this.currentDocument.style.display = 'none';
        }

        // Show upload area
        if (this.uploadArea) {
            this.uploadArea.style.display = 'block';
        }
    }

    /**
     * Remove current document
     */
    private async removeCurrentDocument(): Promise<void> {
        try {
            await StorageManager.removeDocument();
            this.hideCurrentDocument();
            
            // Clear file input
            if (this.fileInput) {
                this.fileInput.value = '';
            }

            Logger.success('Document removed');

        } catch (error) {
            Logger.error('Failed to remove document:', error);
            this.showError('Failed to remove document. Please try again.');
        }
    }

    /**
     * Update AI status display
     */
    private async updateAIStatus(): Promise<void> {
        try {
            // Check AI availability through content script
            const tabs = await chrome.tabs.query({ active: true, currentWindow: true });
            
            if (tabs[0]?.id) {
                const response = await chrome.tabs.sendMessage(tabs[0].id, {
                    type: 'check-ai-status'
                });

                this.displayAIStatus(response?.aiAvailable || false);
            } else {
                this.displayAIStatus(false, 'No active tab');
            }

        } catch (error) {
            Logger.warn('Could not check AI status:', error);
            this.displayAIStatus(false, 'Unable to check');
        }
    }

    /**
     * Display AI status in UI
     */
    private displayAIStatus(available: boolean, message?: string): void {
        const statusText = document.getElementById('status-text');
        const statusIndicator = this.statusElement;

        if (statusText) {
            if (available) {
                statusText.textContent = 'AI Available (Gemini Nano Ready)';
            } else {
                statusText.textContent = message || 'AI Not Available - Check Chrome flags';
            }
        }

        if (statusIndicator) {
            if (available) {
                statusIndicator.className = 'status-indicator available';
            } else {
                statusIndicator.className = 'status-indicator unavailable';
            }
        }
    }

    /**
     * Show upload progress indicator
     */
    private showUploadProgress(show: boolean): void {
        const uploadArea = this.uploadArea;
        
        if (uploadArea) {
            if (show) {
                uploadArea.classList.add('uploading');
                uploadArea.innerHTML = '<div class="upload-spinner"></div><p>Uploading document...</p>';
            } else {
                uploadArea.classList.remove('uploading');
                uploadArea.innerHTML = `
                    <div class="upload-icon">📄</div>
                    <p>Drop files here or click to browse</p>
                `;
            }
        }
    }

    /**
     * Show error message
     */
    private showError(message: string): void {
        // Create temporary error notification
        const errorDiv = document.createElement('div');
        errorDiv.className = 'error-notification';
        errorDiv.textContent = message;
        errorDiv.style.cssText = `
            position: fixed;
            top: 10px;
            left: 10px;
            right: 10px;
            background: #ef4444;
            color: white;
            padding: 12px;
            border-radius: 6px;
            font-size: 12px;
            z-index: 1000;
        `;

        document.body.appendChild(errorDiv);

        // Remove after 5 seconds
        setTimeout(() => {
            if (errorDiv.parentNode) {
                document.body.removeChild(errorDiv);
            }
        }, 5000);

        Logger.error('Popup error shown to user:', message);
    }
}

// Initialize popup when DOM is ready
const netheritePopup = new NetheritePopup();

export {}; // Make this a module