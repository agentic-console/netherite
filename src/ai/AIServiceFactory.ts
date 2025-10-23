import { PromptAPIService } from './PromptAPIService';

export class AIServiceFactory {
    private static instance: PromptAPIService | null = null;

    /**
     * Get singleton instance of PromptAPIService
     * This ensures we don't create multiple AI service instances
     */
    static getInstance(): PromptAPIService {
        if (!this.instance) {
            this.instance = new PromptAPIService();
        }
        return this.instance;
    }

    /**
     * Create a new PromptAPIService instance
     * Use this when you need a fresh instance with clean state
     */
    static createNew(): PromptAPIService {
        return new PromptAPIService();
    }

    /**
     * Clean up the singleton instance
     * Call this when the extension is shutting down
     */
    static cleanup(): void {
        if (this.instance) {
            this.instance.destroy();
            this.instance = null;
        }
    }

    /**
     * Check if AI services are available in current browser
     */
    static async isAvailable(): Promise<boolean> {
        return PromptAPIService.checkAvailability();
    }
}