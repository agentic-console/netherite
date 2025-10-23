/// <reference types="chrome"/>
import { Logger } from '../utils/logger';

/**
 * Netherite Background Service Worker
 * Handles extension lifecycle, commands, and communication between components
 */

// Initialize background script
chrome.runtime.onInstalled.addListener((details: chrome.runtime.InstalledDetails) => {
    Logger.info('Netherite extension installed', details.reason);
    
    if (details.reason === 'install') {
        // First-time installation
        Logger.success('Welcome to Netherite! Press Alt+N on any webpage to get started.');
    } else if (details.reason === 'update') {
        // Extension updated
        Logger.info('Netherite extension updated to version', chrome.runtime.getManifest().version);
    }
});

// Handle keyboard commands
chrome.commands.onCommand.addListener((command: string, tab?: chrome.tabs.Tab) => {
    Logger.chromeAPI('commands', 'onCommand', { command, tabId: tab?.id });
    
    if (command === 'toggle-toolbar' && tab?.id) {
        // Send message to content script to activate toolbar
        chrome.tabs.sendMessage(tab.id, {
            type: 'toggle-toolbar',
            timestamp: Date.now()
        }).catch((error: unknown) => {
            Logger.warn('Failed to send toggle message to tab:', error);
        });
    }
});

// Handle extension icon click (popup)
chrome.action.onClicked.addListener((tab: chrome.tabs.Tab) => {
    Logger.chromeAPI('action', 'onClicked', { tabId: tab.id });
    
    // Open popup or send activation message
    if (tab.id) {
        chrome.tabs.sendMessage(tab.id, {
            type: 'activate-toolbar',
            source: 'popup',
            timestamp: Date.now()
        }).catch((error: unknown) => {
            Logger.warn('Failed to send message from popup click:', error);
        });
    }
});

// Handle messages from content scripts and popup
chrome.runtime.onMessage.addListener((request: any, sender: chrome.runtime.MessageSender, sendResponse: (response?: any) => void) => {
    Logger.chromeAPI('runtime', 'onMessage', { 
        type: request.type, 
        tabId: sender.tab?.id,
        source: sender.url 
    });
    
    handleMessage(request, sender, sendResponse);
    return true; // Keep message channel open for async response
});

/**
 * Handle different types of messages
 */
async function handleMessage(
    request: any, 
    sender: chrome.runtime.MessageSender, 
    sendResponse: (response?: any) => void
): Promise<void> {
    try {
        switch (request.type) {
            case 'check-ai-availability':
                // This will be checked in content script, but we can provide fallback
                sendResponse({ 
                    available: false, 
                    message: 'AI availability must be checked in content script context' 
                });
                break;

            case 'get-extension-info':
                const manifest = chrome.runtime.getManifest();
                sendResponse({
                    name: manifest.name,
                    version: manifest.version,
                    permissions: manifest.permissions
                });
                break;

            case 'log-error':
                Logger.error('Error from content script:', request.error);
                sendResponse({ acknowledged: true });
                break;

            case 'log-info':
                Logger.info('Info from content script:', request.message);
                sendResponse({ acknowledged: true });
                break;

            case 'storage-backup':
                // Future: Handle storage backup/sync
                sendResponse({ 
                    status: 'not-implemented',
                    message: 'Storage backup not yet implemented' 
                });
                break;

            default:
                Logger.warn('Unknown message type received:', request.type);
                sendResponse({ 
                    error: 'Unknown message type',
                    type: request.type 
                });
        }
    } catch (error) {
        Logger.error('Error handling message:', error);
        sendResponse({ 
            error: 'Internal error processing message',
            details: error instanceof Error ? error.message : 'Unknown error'
        });
    }
}

// Handle tab updates to reinject content script if needed
chrome.tabs.onUpdated.addListener((tabId: number, changeInfo: chrome.tabs.TabChangeInfo, tab: chrome.tabs.Tab) => {
    if (changeInfo.status === 'complete' && tab.url) {
        Logger.debug('Tab updated', { tabId, url: tab.url });
        
        // Don't inject on extension pages or chrome:// URLs
        if (tab.url.startsWith('chrome://') || 
            tab.url.startsWith('chrome-extension://') ||
            tab.url.startsWith('moz-extension://') ||
            tab.url.startsWith('edge://')) {
            return;
        }

        // Future: Could reinject content script here if needed
        // This might be useful for single-page applications
    }
});

// Handle extension startup
chrome.runtime.onStartup.addListener(() => {
    Logger.info('Netherite extension started');
});

// Handle extension suspend
chrome.runtime.onSuspend.addListener(() => {
    Logger.info('Netherite extension suspended');
});

// Keep service worker alive (if needed)
// This is sometimes necessary for long-running operations
let keepAliveInterval: ReturnType<typeof setInterval> | null = null;

function keepServiceWorkerAlive(): void {
    if (keepAliveInterval) {
        clearInterval(keepAliveInterval);
    }
    
    keepAliveInterval = setInterval(() => {
        // Simple ping to keep service worker alive
        chrome.runtime.getPlatformInfo().then(() => {
            // Service worker is still active
        }).catch(() => {
            // Service worker might have been suspended
            Logger.debug('Service worker ping failed');
        });
    }, 25000); // Every 25 seconds (Chrome suspends after 30s of inactivity)
}

// Start keep-alive mechanism
keepServiceWorkerAlive();

Logger.success('Netherite background service worker initialized');

export {}; // Make this a module