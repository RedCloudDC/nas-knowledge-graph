/**
 * Loading Spinner Component
 * Reusable spinner with customizable size and message
 */

export class LoadingSpinner {
    constructor(container, options = {}) {
        this.container = typeof container === 'string' ? document.getElementById(container) : container;
        this.options = {
            size: options.size || 'medium',
            message: options.message || 'Loading...',
            overlay: options.overlay !== false, // default true
            className: options.className || '',
            ...options
        };

        this.spinnerElement = null;
        this.isVisible = false;
    }

    /**
     * Show the spinner
     */
    show(message) {
        if (message) {
            this.options.message = message;
        }

        if (this.spinnerElement) {
            this.hide();
        }

        this.spinnerElement = this.createSpinnerElement();

        if (this.container) {
            this.container.appendChild(this.spinnerElement);
        } else {
            document.body.appendChild(this.spinnerElement);
        }

        // Trigger animation
        requestAnimationFrame(() => {
            if (this.spinnerElement) {
                this.spinnerElement.style.opacity = '1';
            }
        });

        this.isVisible = true;

        // Accessibility
        this.announceToScreenReader(this.options.message);
    }

    /**
     * Hide the spinner
     */
    hide() {
        if (!this.spinnerElement || !this.isVisible) {return;}

        this.spinnerElement.style.opacity = '0';

        setTimeout(() => {
            if (this.spinnerElement && this.spinnerElement.parentNode) {
                this.spinnerElement.parentNode.removeChild(this.spinnerElement);
            }
            this.spinnerElement = null;
        }, 300);

        this.isVisible = false;
    }

    /**
     * Update spinner message
     */
    updateMessage(message) {
        this.options.message = message;
        if (this.spinnerElement) {
            const messageElement = this.spinnerElement.querySelector('.spinner-message');
            if (messageElement) {
                messageElement.textContent = message;
                this.announceToScreenReader(message);
            }
        }
    }

    /**
     * Create spinner DOM element
     */
    createSpinnerElement() {
        const spinner = document.createElement('div');
        spinner.className = `loading-spinner-container ${this.options.className}`;

        const sizeClass = this.getSizeClass();
        const overlayClass = this.options.overlay ? 'with-overlay' : '';

        spinner.innerHTML = `
            <div class="loading-spinner-backdrop ${overlayClass}">
                <div class="loading-spinner-content">
                    <div class="loading-spinner ${sizeClass}" aria-hidden="true">
                        <div class="spinner-ring"></div>
                        <div class="spinner-ring"></div>
                        <div class="spinner-ring"></div>
                        <div class="spinner-ring"></div>
                    </div>
                    <div class="spinner-message" aria-live="polite" aria-atomic="true">
                        ${this.options.message}
                    </div>
                </div>
            </div>
        `;

        this.applyStyles(spinner);
        return spinner;
    }

    /**
     * Get size class based on size option
     */
    getSizeClass() {
        const sizes = {
            small: 'spinner-small',
            medium: 'spinner-medium',
            large: 'spinner-large',
            xlarge: 'spinner-xlarge'
        };
        return sizes[this.options.size] || sizes.medium;
    }

    /**
     * Apply inline styles for better performance and flexibility
     */
    applyStyles(element) {
        element.style.cssText = `
            position: ${this.container ? 'absolute' : 'fixed'};
            top: 0;
            left: 0;
            right: 0;
            bottom: 0;
            z-index: 10000;
            opacity: 0;
            transition: opacity 0.3s ease;
            pointer-events: none;
        `;

        const backdrop = element.querySelector('.loading-spinner-backdrop');
        if (backdrop) {
            backdrop.style.cssText = `
                width: 100%;
                height: 100%;
                display: flex;
                align-items: center;
                justify-content: center;
                background-color: ${this.options.overlay ? 'rgba(255, 255, 255, 0.9)' : 'transparent'};
                backdrop-filter: ${this.options.overlay ? 'blur(2px)' : 'none'};
            `;
        }

        const content = element.querySelector('.loading-spinner-content');
        if (content) {
            content.style.cssText = `
                display: flex;
                flex-direction: column;
                align-items: center;
                gap: 1rem;
                padding: 2rem;
                background: ${this.options.overlay ? 'rgba(255, 255, 255, 0.95)' : 'transparent'};
                border-radius: 0.5rem;
                box-shadow: ${this.options.overlay ? '0 4px 12px rgba(0, 0, 0, 0.1)' : 'none'};
            `;
        }

        const spinner = element.querySelector('.loading-spinner');
        if (spinner) {
            this.applySpinnerStyles(spinner);
        }

        const message = element.querySelector('.spinner-message');
        if (message) {
            message.style.cssText = `
                font-family: system-ui, sans-serif;
                font-size: 0.875rem;
                color: #374151;
                text-align: center;
                margin: 0;
            `;
        }
    }

    /**
     * Apply spinner animation styles
     */
    applySpinnerStyles(spinner) {
        const sizes = {
            'spinner-small': '24px',
            'spinner-medium': '40px',
            'spinner-large': '56px',
            'spinner-xlarge': '72px'
        };

        const size = sizes[spinner.classList[1]] || sizes['spinner-medium'];

        spinner.style.cssText = `
            display: inline-block;
            position: relative;
            width: ${size};
            height: ${size};
        `;

        const rings = spinner.querySelectorAll('.spinner-ring');
        rings.forEach((ring, index) => {
            ring.style.cssText = `
                box-sizing: border-box;
                display: block;
                position: absolute;
                width: 100%;
                height: 100%;
                border: 3px solid transparent;
                border-top-color: #3B82F6;
                border-radius: 50%;
                animation: spinner-rotate ${1.2 + (index * 0.1)}s cubic-bezier(0.5, 0, 0.5, 1) infinite;
                animation-delay: ${index * -0.15}s;
            `;
        });

        // Add keyframes if not already added
        this.addKeyframes();
    }

    /**
     * Add CSS keyframes for spinner animation
     */
    addKeyframes() {
        const styleId = 'spinner-keyframes';
        if (document.getElementById(styleId)) {return;}

        const style = document.createElement('style');
        style.id = styleId;
        style.textContent = `
            @keyframes spinner-rotate {
                0% { transform: rotate(0deg); }
                100% { transform: rotate(360deg); }
            }
        `;
        document.head.appendChild(style);
    }

    /**
     * Announce to screen reader
     */
    announceToScreenReader(message) {
        const announcement = document.createElement('div');
        announcement.setAttribute('aria-live', 'polite');
        announcement.setAttribute('aria-atomic', 'true');
        announcement.style.cssText = `
            position: absolute;
            left: -10000px;
            width: 1px;
            height: 1px;
            overflow: hidden;
        `;
        announcement.textContent = message;

        document.body.appendChild(announcement);

        setTimeout(() => {
            if (announcement.parentNode) {
                announcement.parentNode.removeChild(announcement);
            }
        }, 1000);
    }

    /**
     * Check if spinner is currently visible
     */
    isSpinnerVisible() {
        return this.isVisible;
    }

    /**
     * Destroy spinner and clean up
     */
    destroy() {
        this.hide();
        this.container = null;
        this.options = null;
    }
}

// Export convenience functions
export const showSpinner = (container, options) => {
    const spinner = new LoadingSpinner(container, options);
    spinner.show();
    return spinner;
};

export const createSpinner = (container, options) => {
    return new LoadingSpinner(container, options);
};

export default LoadingSpinner;
