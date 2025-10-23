import { DetectedFormField } from '../types/language-model';
import { Constants } from '../utils/constants';
import { Logger } from '../utils/logger';

export class FormFieldDetector {
    private detectedFields: DetectedFormField[] = [];

    constructor() {
        this.detectFields();
    }

    /**
     * Detect all form fields on the current page
     */
    detectFields(): DetectedFormField[] {
        this.detectedFields = [];
        
        Logger.info('Starting form field detection...');

        // Get all form elements
        const forms = document.querySelectorAll('form');
        const allInputs = document.querySelectorAll('input, textarea, select');

        // Process form-contained fields first
        forms.forEach(form => {
            this.processFormElements(form);
        });

        // Process standalone fields (not in forms)
        allInputs.forEach(input => {
            if (!input.closest('form')) {
                this.processFieldElement(input as HTMLElement);
            }
        });

        // Remove duplicates and filter out irrelevant fields
        this.detectedFields = this.filterAndDeduplicateFields(this.detectedFields);

        Logger.success(`Form field detection complete: ${this.detectedFields.length} fields found`);
        
        return this.detectedFields;
    }

    /**
     * Process all elements within a form
     */
    private processFormElements(form: HTMLFormElement): void {
        const formInputs = form.querySelectorAll('input, textarea, select');
        
        formInputs.forEach(input => {
            this.processFieldElement(input as HTMLElement);
        });

        Logger.field('detect', `form with ${formInputs.length} inputs`);
    }

    /**
     * Process a single form field element
     */
    private processFieldElement(element: HTMLElement): void {
        const inputElement = element as HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement;
        
        // Skip hidden, disabled, or system fields
        if (this.shouldSkipField(inputElement)) {
            return;
        }

        const fieldInfo = this.extractFieldInfo(inputElement);
        
        if (fieldInfo) {
            this.detectedFields.push(fieldInfo);
            Logger.field('detect', fieldInfo.label || 'unlabeled field', true);
        }
    }

    /**
     * Determine if a field should be skipped
     */
    private shouldSkipField(element: HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement): boolean {
        // Skip hidden fields
        if (element.type === 'hidden') return true;
        
        // Skip disabled fields
        if (element.disabled) return true;
        
        // Skip readonly fields that aren't meant for user input
        if ('readOnly' in element && element.readOnly && 'type' in element && element.type !== 'text') return true;
        
        // Skip system/technical fields
        const skipNames = [
            'csrf', 'token', '_token', 'authenticity_token',
            'utf8', '_method', 'commit', 'submit',
            'captcha', 'recaptcha', 'g-recaptcha-response'
        ];
        
        const name = (element.name || '').toLowerCase();
        const id = (element.id || '').toLowerCase();
        
        if (skipNames.some(skip => name.includes(skip) || id.includes(skip))) {
            return true;
        }
        
        // Skip if not visible (basic check)
        const style = window.getComputedStyle(element);
        if (style.display === 'none' || style.visibility === 'hidden') {
            return true;
        }
        
        return false;
    }

    /**
     * Extract information about a form field
     */
    private extractFieldInfo(element: HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement): DetectedFormField | null {
        try {
            const label = this.findFieldLabel(element);
            const type = this.getFieldType(element);
            const required = this.isFieldRequired(element);
            const placeholder = ('placeholder' in element) ? element.placeholder || undefined : undefined;
            const maxLength = this.getMaxLength(element);

            return {
                element,
                label,
                type,
                required,
                placeholder,
                maxLength
            };
        } catch (error) {
            Logger.warn('Error extracting field info:', error);
            return null;
        }
    }

    /**
     * Find the label for a form field
     */
    private findFieldLabel(element: HTMLElement): string {
        // Method 1: Explicit label element
        if (element.id) {
            const label = document.querySelector(`label[for="${element.id}"]`);
            if (label && label.textContent) {
                return this.cleanLabelText(label.textContent);
            }
        }

        // Method 2: Parent label element
        const parentLabel = element.closest('label');
        if (parentLabel && parentLabel.textContent) {
            return this.cleanLabelText(parentLabel.textContent);
        }

        // Method 3: aria-label attribute
        if (element.getAttribute('aria-label')) {
            return this.cleanLabelText(element.getAttribute('aria-label')!);
        }

        // Method 4: aria-labelledby
        const labelledBy = element.getAttribute('aria-labelledby');
        if (labelledBy) {
            const labelElement = document.getElementById(labelledBy);
            if (labelElement && labelElement.textContent) {
                return this.cleanLabelText(labelElement.textContent);
            }
        }

        // Method 5: title attribute
        if (element.title) {
            return this.cleanLabelText(element.title);
        }

        // Method 6: placeholder as fallback
        const placeholder = (element as HTMLInputElement).placeholder;
        if (placeholder) {
            return this.cleanLabelText(placeholder);
        }

        // Method 7: name attribute as last resort
        const name = (element as HTMLInputElement).name;
        if (name) {
            return this.formatNameAsLabel(name);
        }

        // Method 8: Look for nearby text content
        const nearbyLabel = this.findNearbyText(element);
        if (nearbyLabel) {
            return this.cleanLabelText(nearbyLabel);
        }

        return 'Unlabeled field';
    }

    /**
     * Clean and normalize label text
     */
    private cleanLabelText(text: string): string {
        return text
            .trim()
            .replace(/\s+/g, ' ')
            .replace(/[*:]+$/, '') // Remove trailing asterisks and colons
            .trim();
    }

    /**
     * Format field name as readable label
     */
    private formatNameAsLabel(name: string): string {
        return name
            .replace(/[_-]/g, ' ')
            .replace(/([a-z])([A-Z])/g, '$1 $2') // camelCase to words
            .toLowerCase()
            .replace(/^./, char => char.toUpperCase()); // Capitalize first letter
    }

    /**
     * Find nearby text that might be a label
     */
    private findNearbyText(element: HTMLElement): string | null {
        // Check previous sibling elements
        let sibling = element.previousElementSibling;
        let attempts = 0;
        
        while (sibling && attempts < 3) {
            const text = sibling.textContent?.trim();
            if (text && text.length > 0 && text.length < 100) {
                return text;
            }
            sibling = sibling.previousElementSibling;
            attempts++;
        }

        // Check parent element's text
        const parent = element.parentElement;
        if (parent) {
            const parentText = parent.textContent?.trim();
            if (parentText && parentText.length < 100) {
                // Try to extract just the relevant part
                const words = parentText.split(/\s+/);
                if (words.length <= 10) {
                    return parentText;
                }
            }
        }

        return null;
    }

    /**
     * Get the semantic type of a form field
     */
    private getFieldType(element: HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement): string {
        if (element.tagName === 'TEXTAREA') {
            return 'textarea';
        }

        if (element.tagName === 'SELECT') {
            const selectElement = element as HTMLSelectElement;
            return selectElement.multiple ? 'select-multiple' : 'select-one';
        }

        const inputElement = element as HTMLInputElement;
        const type = inputElement.type.toLowerCase();

        // Map HTML input types to semantic categories
        const typeMapping: Record<string, string> = {
            'text': 'text',
            'email': 'email',
            'password': 'password',
            'tel': 'phone',
            'url': 'url',
            'number': 'number',
            'range': 'range',
            'date': 'date',
            'datetime-local': 'datetime',
            'time': 'time',
            'month': 'month',
            'week': 'week',
            'color': 'color',
            'file': 'file',
            'checkbox': 'checkbox',
            'radio': 'radio',
            'submit': 'submit',
            'button': 'button',
            'reset': 'reset',
            'search': 'search'
        };

        return typeMapping[type] || type;
    }

    /**
     * Check if a field is required
     */
    private isFieldRequired(element: HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement): boolean {
        // Check required attribute
        if (element.required) {
            return true;
        }

        // Check aria-required
        if (element.getAttribute('aria-required') === 'true') {
            return true;
        }

        // Check for visual indicators in label
        const label = this.findFieldLabel(element);
        if (label.includes('*') || label.toLowerCase().includes('required')) {
            return true;
        }

        return false;
    }

    /**
     * Get maximum length for text fields
     */
    private getMaxLength(element: HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement): number | undefined {
        if ('maxLength' in element && element.maxLength > 0) {
            return element.maxLength;
        }

        // Check for pattern-based length hints
        const pattern = (element as HTMLInputElement).pattern;
        if (pattern) {
            // Simple pattern analysis for length constraints
            const lengthMatch = pattern.match(/\{(\d+),?(\d+)?\}/);
            if (lengthMatch) {
                return parseInt(lengthMatch[2] || lengthMatch[1]);
            }
        }

        return undefined;
    }

    /**
     * Filter out irrelevant fields and remove duplicates
     */
    private filterAndDeduplicateFields(fields: DetectedFormField[]): DetectedFormField[] {
        const seen = new Set<HTMLElement>();
        const filtered: DetectedFormField[] = [];

        for (const field of fields) {
            // Skip duplicates
            if (seen.has(field.element)) {
                continue;
            }

            // Skip submit buttons and other non-input elements
            const type = field.type.toLowerCase();
            if (['submit', 'button', 'reset', 'image'].includes(type)) {
                continue;
            }

            seen.add(field.element);
            filtered.push(field);
        }

        return filtered;
    }

    /**
     * Get all detected fields
     */
    getDetectedFields(): DetectedFormField[] {
        return this.detectedFields;
    }

    /**
     * Find fields by type
     */
    getFieldsByType(type: string): DetectedFormField[] {
        return this.detectedFields.filter(field => field.type === type);
    }

    /**
     * Find required fields
     */
    getRequiredFields(): DetectedFormField[] {
        return this.detectedFields.filter(field => field.required);
    }

    /**
     * Get form summary for AI analysis
     */
    getFormSummary(): string {
        if (this.detectedFields.length === 0) {
            return 'No form fields detected on this page.';
        }

        const summary = this.detectedFields.map(field => {
            const required = field.required ? ' (required)' : '';
            const maxLength = field.maxLength ? ` (max: ${field.maxLength})` : '';
            return `- ${field.label}: ${field.type}${required}${maxLength}`;
        });

        return `Detected ${this.detectedFields.length} form fields:\n${summary.join('\n')}`;
    }

    /**
     * Re-scan the page for new fields (useful for dynamic content)
     */
    refresh(): DetectedFormField[] {
        Logger.info('Refreshing form field detection...');
        return this.detectFields();
    }
}