import { StoredDocument, ChatMessage } from '../types/language-model';
/// <reference types="chrome"/>
import { Constants } from './constants';
import { Logger } from './logger';

export class StorageManager {
    /**
     * Store document in Chrome storage
     */
    static async saveDocument(document: StoredDocument): Promise<void> {
        try {
            await chrome.storage.local.set({
                [Constants.STORAGE_KEYS.CURRENT_DOCUMENT]: document
            });
            Logger.success('Document saved to storage', document.name);
        } catch (error) {
            Logger.error('Failed to save document:', error);
            throw error;
        }
    }

    /**
     * Get current document from storage
     */
    static async getCurrentDocument(): Promise<StoredDocument | null> {
        try {
            const result = await chrome.storage.local.get([Constants.STORAGE_KEYS.CURRENT_DOCUMENT]);
            const document = result[Constants.STORAGE_KEYS.CURRENT_DOCUMENT];
            
            if (document) {
                Logger.info('Document retrieved from storage', document.name);
                return document;
            }
            
            Logger.debug('No document found in storage');
            return null;
        } catch (error) {
            Logger.error('Failed to retrieve document:', error);
            return null;
        }
    }

    /**
     * Remove current document from storage
     */
    static async removeDocument(): Promise<void> {
        try {
            await chrome.storage.local.remove([Constants.STORAGE_KEYS.CURRENT_DOCUMENT]);
            Logger.success('Document removed from storage');
        } catch (error) {
            Logger.error('Failed to remove document:', error);
            throw error;
        }
    }

    /**
     * Save chat history
     */
    static async saveChatHistory(messages: ChatMessage[]): Promise<void> {
        try {
            // Limit chat history size
            const limitedMessages = messages.slice(-Constants.AI_LIMITS.MAX_CHAT_HISTORY);
            
            await chrome.storage.local.set({
                [Constants.STORAGE_KEYS.CHAT_HISTORY]: limitedMessages
            });
            
            Logger.debug('Chat history saved', `${limitedMessages.length} messages`);
        } catch (error) {
            Logger.error('Failed to save chat history:', error);
            throw error;
        }
    }

    /**
     * Get chat history from storage
     */
    static async getChatHistory(): Promise<ChatMessage[]> {
        try {
            const result = await chrome.storage.local.get([Constants.STORAGE_KEYS.CHAT_HISTORY]);
            const history = result[Constants.STORAGE_KEYS.CHAT_HISTORY] || [];
            
            Logger.debug('Chat history retrieved', `${history.length} messages`);
            return history;
        } catch (error) {
            Logger.error('Failed to retrieve chat history:', error);
            return [];
        }
    }

    /**
     * Clear chat history
     */
    static async clearChatHistory(): Promise<void> {
        try {
            await chrome.storage.local.remove([Constants.STORAGE_KEYS.CHAT_HISTORY]);
            Logger.success('Chat history cleared');
        } catch (error) {
            Logger.error('Failed to clear chat history:', error);
            throw error;
        }
    }

    /**
     * Save toolbar position
     */
    static async saveToolbarPosition(x: number, y: number): Promise<void> {
        try {
            await chrome.storage.local.set({
                [Constants.STORAGE_KEYS.TOOLBAR_POSITION]: { x, y }
            });
            Logger.debug('Toolbar position saved', `x: ${x}, y: ${y}`);
        } catch (error) {
            Logger.warn('Failed to save toolbar position:', error);
        }
    }

    /**
     * Get saved toolbar position
     */
    static async getToolbarPosition(): Promise<{ x: number; y: number } | null> {
        try {
            const result = await chrome.storage.local.get([Constants.STORAGE_KEYS.TOOLBAR_POSITION]);
            const position = result[Constants.STORAGE_KEYS.TOOLBAR_POSITION];
            
            if (position && typeof position.x === 'number' && typeof position.y === 'number') {
                Logger.debug('Toolbar position retrieved', position);
                return position;
            }
            
            return null;
        } catch (error) {
            Logger.warn('Failed to retrieve toolbar position:', error);
            return null;
        }
    }

    /**
     * Save user preferences
     */
    static async savePreferences(preferences: Record<string, any>): Promise<void> {
        try {
            await chrome.storage.local.set({
                [Constants.STORAGE_KEYS.USER_PREFERENCES]: preferences
            });
            Logger.debug('User preferences saved');
        } catch (error) {
            Logger.error('Failed to save user preferences:', error);
            throw error;
        }
    }

    /**
     * Get user preferences
     */
    static async getPreferences(): Promise<Record<string, any>> {
        try {
            const result = await chrome.storage.local.get([Constants.STORAGE_KEYS.USER_PREFERENCES]);
            return result[Constants.STORAGE_KEYS.USER_PREFERENCES] || {};
        } catch (error) {
            Logger.error('Failed to retrieve user preferences:', error);
            return {};
        }
    }

    /**
     * Export chat history as downloadable text file
     */
    static async exportChatHistory(): Promise<string> {
        const history = await this.getChatHistory();
        
        const exportData = {
            timestamp: new Date().toISOString(),
            messages: history,
            version: '1.0.0'
        };

        const content = history
            .map(msg => `[${new Date(msg.timestamp).toLocaleString()}] ${msg.role.toUpperCase()}: ${msg.content}`)
            .join('\n\n');

        const header = `Netherite Chat History Export\nExported: ${new Date().toLocaleString()}\n\n${'='.repeat(50)}\n\n`;
        
        return header + content;
    }

    /**
     * Get storage usage statistics
     */
    static async getStorageStats(): Promise<{
        documentsSize: number;
        chatHistorySize: number;
        totalSize: number;
    }> {
        try {
            const result = await chrome.storage.local.get(null);
            const encoder = new TextEncoder();
            
            let documentsSize = 0;
            let chatHistorySize = 0;
            
            if (result[Constants.STORAGE_KEYS.CURRENT_DOCUMENT]) {
                documentsSize = encoder.encode(JSON.stringify(result[Constants.STORAGE_KEYS.CURRENT_DOCUMENT])).length;
            }
            
            if (result[Constants.STORAGE_KEYS.CHAT_HISTORY]) {
                chatHistorySize = encoder.encode(JSON.stringify(result[Constants.STORAGE_KEYS.CHAT_HISTORY])).length;
            }
            
            const totalSize = documentsSize + chatHistorySize;
            
            return { documentsSize, chatHistorySize, totalSize };
        } catch (error) {
            Logger.error('Failed to get storage stats:', error);
            return { documentsSize: 0, chatHistorySize: 0, totalSize: 0 };
        }
    }
}