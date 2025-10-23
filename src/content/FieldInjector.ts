import { DetectedFormField, GeneratedAnswer } from '../types/language-model';
import { Logger } from '../utils/logger';

export class FieldInjector {
    private injectedFields: Map<HTMLElement, string> = new Map();

    /**
     * Inject AI-generated answers into detected form fields
     */
    async injectAnswers(answers: GeneratedAnswer[], formFields: DetectedFormField[]): Promise<boolean> {
        try {
            Logger.info('Starting form field injection', { answersCount: answers.length, fieldsCount: formFields.length });

            let successCount = 0;
            let totalAttempts = 0;

            for (const answer of answers) {
                const matchingField = this.findMatchingField(answer.fieldLabel, formFields);
                
                if (matchingField) {
                    totalAttempts++;
                    const success = await this.injectSingleField(matchingField, answer.answer);
                    
                    if (success) {
                        successCount++;
                        this.injectedFields.set(matchingField.element, answer.answer);
                    }
                }
            }

            Logger.success(`Field injection completed: ${successCount}/${totalAttempts} successful`);
            
            // Show visual feedback
            this.showInjectionFeedback(successCount, totalAttempts);
            
            return successCount > 0;

        } catch (error) {
            Logger.error('Error during field injection:', error);
            return false;
        }
    }

    /**
     * Find the best matching form field for an answer
     */
    private findMatchingField(answerLabel: string, formFields: DetectedFormField[]): DetectedFormField | null {
        const normalizedAnswerLabel = this.normalizeLabel(answerLabel);

        // First, try exact match
        for (const field of formFields) {
            const normalizedFieldLabel = this.normalizeLabel(field.label);
            if (normalizedFieldLabel === normalizedAnswerLabel) {
                return field;
            }
        }

        // Then try partial matches
        for (const field of formFields) {
            const normalizedFieldLabel = this.normalizeLabel(field.label);
            
            if (normalizedFieldLabel.includes(normalizedAnswerLabel) || 
                normalizedAnswerLabel.includes(normalizedFieldLabel)) {
                return field;
            }
        }

        // Finally, try fuzzy matching based on keywords
        const answerKeywords = this.extractKeywords(normalizedAnswerLabel);
        let bestMatch: DetectedFormField | null = null;
        let bestScore = 0;

        for (const field of formFields) {
            const fieldKeywords = this.extractKeywords(this.normalizeLabel(field.label));
            const score = this.calculateMatchScore(answerKeywords, fieldKeywords);
            
            if (score > bestScore && score > 0.5) {
                bestScore = score;
                bestMatch = field;
            }
        }

        return bestMatch;
    }

    /**
     * Normalize label text for comparison
     */
    private normalizeLabel(label: string): string {
        return label
            .toLowerCase()
            .replace(/[^a-z0-9\s]/g, '')
            .replace(/\s+/g, ' ')
            .trim();
    }

    /**
     * Extract keywords from label text
     */
    private extractKeywords(text: string): string[] {
        const stopWords = ['the', 'a', 'an', 'and', 'or', 'but', 'in', 'on', 'at', 'to', 'for', 'of', 'with', 'by', 'your', 'you', 'enter', 'please'];
        
        return text
            .split(' ')
            .filter(word => word.length > 2 && !stopWords.includes(word));
    }

    /**
     * Calculate match score between two sets of keywords
     */
    private calculateMatchScore(keywords1: string[], keywords2: string[]): number {
        if (keywords1.length === 0 || keywords2.length === 0) return 0;

        let matches = 0;
        for (const keyword1 of keywords1) {
            for (const keyword2 of keywords2) {
                if (keyword1 === keyword2 || keyword1.includes(keyword2) || keyword2.includes(keyword1)) {
                    matches++;
                    break;
                }
            }
        }

        return matches / Math.max(keywords1.length, keywords2.length);
    }

    /**
     * Inject content into a single form field
     */
    private async injectSingleField(field: DetectedFormField, content: string): Promise<boolean> {
        try {
            const element = field.element;
            
            // Ensure element is visible and interactable
            if (!this.isElementInteractable(element)) {
                Logger.warn('Element not interactable', field.label);
                return false;
            }

            // Focus the element first
            this.focusElement(element);

            // Wait a bit for focus events to complete
            await new Promise(resolve => setTimeout(resolve, 100));

            // Inject based on field type
            let success = false;

            switch (field.type) {
                case 'text':
                case 'email':
                case 'password':
                case 'phone':
                case 'url':
                case 'search':
                    success = this.injectTextInput(element as HTMLInputElement, content);
                    break;
                
                case 'textarea':
                    success = this.injectTextarea(element as HTMLTextAreaElement, content);
                    break;
                
                case 'select-one':
                case 'select-multiple':
                    success = this.injectSelect(element as HTMLSelectElement, content);
                    break;
                
                case 'checkbox':
                    success = this.injectCheckbox(element as HTMLInputElement, content);
                    break;
                
                case 'radio':
                    success = this.injectRadio(element as HTMLInputElement, content);
                    break;
                
                case 'date':
                case 'datetime':
                    success = this.injectDate(element as HTMLInputElement, content);
                    break;
                
                case 'number':
                    success = this.injectNumber(element as HTMLInputElement, content);
                    break;
                
                default:
                    Logger.warn('Unsupported field type for injection', field.type);
                    return false;
            }

            if (success) {
                // Trigger events to ensure the change is recognized
                this.triggerChangeEvents(element);
                
                // Add visual feedback
                this.addSuccessHighlight(element);
                
                Logger.field('inject', field.label, true);
                return true;
            } else {
                Logger.field('inject', field.label, false);
                return false;
            }

        } catch (error) {
            Logger.error('Error injecting field:', error);
            return false;
        }
    }

    /**
     * Check if element is interactable
     */
    private isElementInteractable(element: HTMLElement): boolean {
        const style = window.getComputedStyle(element);
        
        return (
            style.display !== 'none' &&
            style.visibility !== 'hidden' &&
            !element.hasAttribute('disabled') &&
            !element.hasAttribute('readonly')
        );
    }

    /**
     * Focus element safely
     */
    private focusElement(element: HTMLElement): void {
        try {
            element.focus();
        } catch (error) {
            Logger.debug('Could not focus element:', error);
        }
    }

    /**
     * Inject content into text input
     */
    private injectTextInput(input: HTMLInputElement, content: string): boolean {
        try {
            // Respect max length
            const maxLength = input.maxLength;
            const finalContent = (maxLength > 0 && content.length > maxLength) 
                ? content.substring(0, maxLength) 
                : content;

            input.value = finalContent;
            return true;
        } catch (error) {
            Logger.debug('Error injecting text input:', error);
            return false;
        }
    }

    /**
     * Inject content into textarea
     */
    private injectTextarea(textarea: HTMLTextAreaElement, content: string): boolean {
        try {
            // Respect max length
            const maxLength = textarea.maxLength;
            const finalContent = (maxLength > 0 && content.length > maxLength) 
                ? content.substring(0, maxLength) 
                : content;

            textarea.value = finalContent;
            return true;
        } catch (error) {
            Logger.debug('Error injecting textarea:', error);
            return false;
        }
    }

    /**
     * Inject content into select element
     */
    private injectSelect(select: HTMLSelectElement, content: string): boolean {
        try {
            const normalizedContent = content.toLowerCase().trim();

            // First try exact matches
            for (const option of Array.from(select.options)) {
                const optionText = option.textContent?.toLowerCase().trim() || '';
                const optionValue = option.value.toLowerCase().trim();

                if (optionText === normalizedContent || optionValue === normalizedContent) {
                    option.selected = true;
                    return true;
                }
            }

            // Then try partial matches
            for (const option of Array.from(select.options)) {
                const optionText = option.textContent?.toLowerCase().trim() || '';
                const optionValue = option.value.toLowerCase().trim();

                if (optionText.includes(normalizedContent) || 
                    normalizedContent.includes(optionText) ||
                    this.isSemanticMatch(normalizedContent, optionText)) {
                    
                    option.selected = true;
                    return true;
                }
            }

            // Special handling for common cases
            const specialMappings = this.getSpecialSelectMappings();
            for (const [key, values] of Object.entries(specialMappings)) {
                if (values.includes(normalizedContent)) {
                    for (const option of Array.from(select.options)) {
                        const optionText = option.textContent?.toLowerCase().trim() || '';
                        if (optionText.includes(key)) {
                            option.selected = true;
                            return true;
                        }
                    }
                }
            }

            Logger.debug('No matching option found for select:', content);
            return false;
        } catch (error) {
            Logger.debug('Error injecting select:', error);
            return false;
        }
    }

    /**
     * Check if two strings are semantically similar
     */
    private isSemanticMatch(str1: string, str2: string): boolean {
        // Handle common synonyms and abbreviations
        const synonyms: Record<string, string[]> = {
            'usa': ['united states', 'america', 'us'],
            'united states': ['usa', 'america', 'us'],
            'mr': ['mister'],
            'mrs': ['missus'],
            'dr': ['doctor'],
            'prof': ['professor'],
            'male': ['m', 'man'],
            'female': ['f', 'woman'],
            'yes': ['y', 'true', '1'],
            'no': ['n', 'false', '0']
        };

        for (const [key, values] of Object.entries(synonyms)) {
            if ((key === str1 && values.includes(str2)) || 
                (key === str2 && values.includes(str1))) {
                return true;
            }
        }

        return false;
    }

    /**
     * Get special mappings for select options
     */
    private getSpecialSelectMappings(): Record<string, string[]> {
        return {
            'male': ['male', 'm', 'man', 'mr'],
            'female': ['female', 'f', 'woman', 'mrs', 'ms'],
            'married': ['married', 'spouse', 'wed'],
            'single': ['single', 'unmarried', 'bachelor'],
            'bachelor': ['bachelor', 'bachelors', 'undergraduate'],
            'master': ['master', 'masters', 'graduate'],
            'doctorate': ['doctorate', 'phd', 'doctoral'],
            'full-time': ['full-time', 'fulltime', 'full time'],
            'part-time': ['part-time', 'parttime', 'part time']
        };
    }

    /**
     * Inject content into checkbox
     */
    private injectCheckbox(checkbox: HTMLInputElement, content: string): boolean {
        try {
            const normalizedContent = content.toLowerCase().trim();
            const shouldCheck = ['yes', 'true', '1', 'checked', 'on', 'agree'].includes(normalizedContent);
            
            checkbox.checked = shouldCheck;
            return true;
        } catch (error) {
            Logger.debug('Error injecting checkbox:', error);
            return false;
        }
    }

    /**
     * Inject content into radio button
     */
    private injectRadio(radio: HTMLInputElement, content: string): boolean {
        try {
            // For radio buttons, we need to find the right one in the group
            const name = radio.name;
            const form = radio.form || document;
            const radioGroup = form.querySelectorAll(`input[type="radio"][name="${name}"]`) as NodeListOf<HTMLInputElement>;

            const normalizedContent = content.toLowerCase().trim();

            for (const radioButton of Array.from(radioGroup)) {
                const label = this.findRadioLabel(radioButton);
                const normalizedLabel = label.toLowerCase().trim();

                if (normalizedLabel.includes(normalizedContent) || 
                    normalizedContent.includes(normalizedLabel) ||
                    radioButton.value.toLowerCase() === normalizedContent) {
                    
                    radioButton.checked = true;
                    return true;
                }
            }

            return false;
        } catch (error) {
            Logger.debug('Error injecting radio:', error);
            return false;
        }
    }

    /**
     * Find label for radio button
     */
    private findRadioLabel(radio: HTMLInputElement): string {
        // Try associated label
        if (radio.id) {
            const label = document.querySelector(`label[for="${radio.id}"]`);
            if (label?.textContent) {
                return label.textContent.trim();
            }
        }

        // Try parent label
        const parentLabel = radio.closest('label');
        if (parentLabel?.textContent) {
            return parentLabel.textContent.trim();
        }

        // Try next sibling text
        const nextSibling = radio.nextSibling;
        if (nextSibling?.nodeType === Node.TEXT_NODE && nextSibling.textContent) {
            return nextSibling.textContent.trim();
        }

        return radio.value || '';
    }

    /**
     * Inject content into date input
     */
    private injectDate(input: HTMLInputElement, content: string): boolean {
        try {
            // Try to parse various date formats
            const dateString = this.parseDate(content);
            if (dateString) {
                input.value = dateString;
                return true;
            }
            return false;
        } catch (error) {
            Logger.debug('Error injecting date:', error);
            return false;
        }
    }

    /**
     * Parse date from various formats
     */
    private parseDate(dateStr: string): string | null {
        try {
            // Remove common words
            const cleaned = dateStr.replace(/\b(on|at|in|the|of|by)\b/gi, '').trim();

            // Try parsing as date
            const date = new Date(cleaned);
            
            if (!isNaN(date.getTime())) {
                // Return in YYYY-MM-DD format for HTML date input
                return date.toISOString().split('T')[0];
            }

            return null;
        } catch (error) {
            return null;
        }
    }

    /**
     * Inject content into number input
     */
    private injectNumber(input: HTMLInputElement, content: string): boolean {
        try {
            // Extract number from content
            const numberMatch = content.match(/\d+(\.\d+)?/);
            if (numberMatch) {
                const number = parseFloat(numberMatch[0]);
                
                // Check min/max constraints
                if (input.min && number < parseFloat(input.min)) return false;
                if (input.max && number > parseFloat(input.max)) return false;

                input.value = number.toString();
                return true;
            }
            return false;
        } catch (error) {
            Logger.debug('Error injecting number:', error);
            return false;
        }
    }

    /**
     * Trigger change events for the element
     */
    private triggerChangeEvents(element: HTMLElement): void {
        try {
            // Common events that web apps listen to
            const events = ['input', 'change', 'blur'];

            for (const eventType of events) {
                const event = new Event(eventType, { bubbles: true, cancelable: true });
                element.dispatchEvent(event);
            }

            // For React and other frameworks
            const reactEvent = new Event('input', { bubbles: true, cancelable: true });
            Object.defineProperty(reactEvent, 'target', {
                writable: false,
                value: element
            });
            element.dispatchEvent(reactEvent);

        } catch (error) {
            Logger.debug('Error triggering change events:', error);
        }
    }

    /**
     * Add visual success highlight to injected field
     */
    private addSuccessHighlight(element: HTMLElement): void {
        try {
            const originalBorder = element.style.border;
            const originalBoxShadow = element.style.boxShadow;

            // Add success styling
            element.style.border = '2px solid #10b981';
            element.style.boxShadow = '0 0 0 3px rgba(16, 185, 129, 0.1)';

            // Remove after 2 seconds
            setTimeout(() => {
                element.style.border = originalBorder;
                element.style.boxShadow = originalBoxShadow;
            }, 2000);

        } catch (error) {
            Logger.debug('Error adding success highlight:', error);
        }
    }

    /**
     * Show overall injection feedback
     */
    private showInjectionFeedback(successCount: number, totalAttempts: number): void {
        try {
            const notification = document.createElement('div');
            notification.style.cssText = `
                position: fixed;
                top: 20px;
                right: 20px;
                background: ${successCount === totalAttempts ? '#10b981' : '#f59e0b'};
                color: white;
                padding: 12px 20px;
                border-radius: 8px;
                box-shadow: 0 4px 12px rgba(0, 0, 0, 0.2);
                z-index: 2147483647;
                font-family: system-ui, sans-serif;
                font-size: 14px;
                animation: slideInRight 0.3s ease-out;
            `;

            const message = successCount === totalAttempts
                ? `✅ All ${successCount} fields filled successfully!`
                : `⚠️ ${successCount}/${totalAttempts} fields filled successfully`;

            notification.textContent = message;

            // Add animation
            const style = document.createElement('style');
            style.textContent = `
                @keyframes slideInRight {
                    from {
                        transform: translateX(100%);
                        opacity: 0;
                    }
                    to {
                        transform: translateX(0);
                        opacity: 1;
                    }
                }
            `;
            document.head.appendChild(style);

            document.body.appendChild(notification);

            // Remove after 5 seconds
            setTimeout(() => {
                if (notification.parentNode) {
                    notification.style.animation = 'slideInRight 0.3s ease-out reverse';
                    setTimeout(() => {
                        if (notification.parentNode) {
                            document.body.removeChild(notification);
                        }
                        if (style.parentNode) {
                            document.head.removeChild(style);
                        }
                    }, 300);
                }
            }, 5000);

        } catch (error) {
            Logger.debug('Error showing injection feedback:', error);
        }
    }

    /**
     * Clear all injected content
     */
    clearAllInjections(): void {
        for (const [element, _] of this.injectedFields) {
            try {
                if (element.tagName === 'INPUT') {
                    (element as HTMLInputElement).value = '';
                } else if (element.tagName === 'TEXTAREA') {
                    (element as HTMLTextAreaElement).value = '';
                } else if (element.tagName === 'SELECT') {
                    (element as HTMLSelectElement).selectedIndex = 0;
                }
                
                this.triggerChangeEvents(element);
            } catch (error) {
                Logger.debug('Error clearing injection:', error);
            }
        }

        this.injectedFields.clear();
        Logger.info('All field injections cleared');
    }

    /**
     * Get summary of injected fields
     */
    getInjectionSummary(): { fieldCount: number; fields: Array<{ label: string; value: string }> } {
        const fields: Array<{ label: string; value: string }> = [];

        for (const [element, value] of this.injectedFields) {
            // Try to get field label
            const label = this.getFieldLabel(element);
            fields.push({ label, value });
        }

        return {
            fieldCount: this.injectedFields.size,
            fields
        };
    }

    /**
     * Get label for an element
     */
    private getFieldLabel(element: HTMLElement): string {
        // Try various methods to get the label
        if (element.id) {
            const label = document.querySelector(`label[for="${element.id}"]`);
            if (label?.textContent) {
                return label.textContent.trim();
            }
        }

        const parentLabel = element.closest('label');
        if (parentLabel?.textContent) {
            return parentLabel.textContent.trim();
        }

        if (element.hasAttribute('aria-label')) {
            return element.getAttribute('aria-label')!;
        }

        if (element.hasAttribute('placeholder')) {
            return element.getAttribute('placeholder')!;
        }

        return 'Unknown field';
    }
}