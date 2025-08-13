/**
 * Debounce Utility
 * Provides debouncing functionality for performance optimization
 */

/**
 * Creates a debounced function that delays invoking func until after wait milliseconds
 * have elapsed since the last time the debounced function was invoked
 */
export function debounce(func, wait, immediate = false) {
    let timeout;

    return function executedFunction(...args) {
        const later = () => {
            timeout = null;
            if (!immediate) {func.apply(this, args);}
        };

        const callNow = immediate && !timeout;

        clearTimeout(timeout);
        timeout = setTimeout(later, wait);

        if (callNow) {func.apply(this, args);}
    };
}

/**
 * Creates a throttled function that only invokes func at most once per every wait milliseconds
 */
export function throttle(func, wait) {
    let inThrottle;

    return function(...args) {
        if (!inThrottle) {
            func.apply(this, args);
            inThrottle = true;

            setTimeout(() => {
                inThrottle = false;
            }, wait);
        }
    };
}

/**
 * Cancellable debounce that returns both the debounced function and a cancel method
 */
export function cancellableDebounce(func, wait, immediate = false) {
    let timeout;

    const debounced = function executedFunction(...args) {
        const later = () => {
            timeout = null;
            if (!immediate) {func.apply(this, args);}
        };

        const callNow = immediate && !timeout;

        clearTimeout(timeout);
        timeout = setTimeout(later, wait);

        if (callNow) {func.apply(this, args);}
    };

    debounced.cancel = () => {
        clearTimeout(timeout);
        timeout = null;
    };

    return debounced;
}

/**
 * Advanced debounce with leading and trailing options
 */
export function advancedDebounce(func, wait, options = {}) {
    const { leading = false, trailing = true, maxWait } = options;
    let timeout;
    let maxTimeout;
    let result;
    let lastCallTime;
    let lastInvokeTime = 0;

    function invokeFunc(time) {
        const args = lastArgs;
        const thisArg = lastThis;

        lastArgs = lastThis = undefined;
        lastInvokeTime = time;
        result = func.apply(thisArg, args);
        return result;
    }

    function leadingEdge(time) {
        // Reset any maxWait timer
        lastInvokeTime = time;
        // Start the timer for the trailing edge
        timeout = setTimeout(timerExpired, wait);
        // Invoke the leading edge
        return leading ? invokeFunc(time) : result;
    }

    function remainingWait(time) {
        const timeSinceLastCall = time - lastCallTime;
        const timeSinceLastInvoke = time - lastInvokeTime;
        const timeWaiting = wait - timeSinceLastCall;

        return maxWait !== undefined
            ? Math.min(timeWaiting, maxWait - timeSinceLastInvoke)
            : timeWaiting;
    }

    function shouldInvoke(time) {
        const timeSinceLastCall = time - lastCallTime;
        const timeSinceLastInvoke = time - lastInvokeTime;

        // Either this is the first call, activity has stopped and we're at the trailing edge,
        // the system time has gone backwards and we're treating it as the trailing edge,
        // or we've hit the maxWait limit.
        return (lastCallTime === undefined ||
                (timeSinceLastCall >= wait) ||
                (timeSinceLastCall < 0) ||
                (maxWait !== undefined && timeSinceLastInvoke >= maxWait));
    }

    function timerExpired() {
        const time = Date.now();
        if (shouldInvoke(time)) {
            return trailingEdge(time);
        }
        // Restart the timer
        timeout = setTimeout(timerExpired, remainingWait(time));
    }

    function trailingEdge(time) {
        timeout = undefined;

        // Only invoke if we have lastArgs which means func has been debounced at least once
        if (trailing && lastArgs) {
            return invokeFunc(time);
        }
        lastArgs = lastThis = undefined;
        return result;
    }

    function cancel() {
        if (timeout !== undefined) {
            clearTimeout(timeout);
        }
        if (maxTimeout !== undefined) {
            clearTimeout(maxTimeout);
        }
        lastInvokeTime = 0;
        lastArgs = lastCallTime = lastThis = timeout = maxTimeout = undefined;
    }

    function flush() {
        return timeout === undefined ? result : trailingEdge(Date.now());
    }

    let lastArgs, lastThis;

    function debounced(...args) {
        const time = Date.now();
        const isInvoking = shouldInvoke(time);

        lastArgs = args;
        lastThis = this;
        lastCallTime = time;

        if (isInvoking) {
            if (timeout === undefined) {
                return leadingEdge(lastCallTime);
            }
            if (maxWait) {
                // Handle invocations in a tight loop
                timeout = setTimeout(timerExpired, wait);
                return invokeFunc(lastCallTime);
            }
        }
        if (timeout === undefined) {
            timeout = setTimeout(timerExpired, wait);
        }
        return result;
    }

    debounced.cancel = cancel;
    debounced.flush = flush;

    return debounced;
}

/**
 * Frame-based debouncing using requestAnimationFrame
 * Useful for DOM updates and animations
 */
export function frameDebounce(func) {
    let frameId;

    return function(...args) {
        if (frameId) {
            cancelAnimationFrame(frameId);
        }

        frameId = requestAnimationFrame(() => {
            func.apply(this, args);
        });
    };
}

/**
 * Idle debounce - delays execution until the browser is idle
 */
export function idleDebounce(func, timeout = 5000) {
    let idleId;

    return function(...args) {
        if (idleId) {
            cancelIdleCallback(idleId);
        }

        if (window.requestIdleCallback) {
            idleId = requestIdleCallback(() => {
                func.apply(this, args);
            }, { timeout });
        } else {
            // Fallback for browsers without requestIdleCallback
            setTimeout(() => {
                func.apply(this, args);
            }, timeout);
        }
    };
}

/**
 * Creates a debounced search function specifically for search inputs
 */
export function createDebouncedSearch(searchFunction, delay = 300) {
    const debouncedFn = debounce(searchFunction, delay);
    let lastQuery = '';

    return function(query) {
        // Immediately clear results if query becomes empty
        if (!query && lastQuery) {
            searchFunction('');
        }

        lastQuery = query;

        if (query) {
            debouncedFn(query);
        }
    };
}

/**
 * Batch debounce - collects multiple calls and processes them in batches
 */
export function batchDebounce(func, wait = 100, batchSize = 10) {
    let batch = [];
    let timeout;

    return function(item) {
        batch.push(item);

        if (batch.length >= batchSize) {
            // Process immediately if batch is full
            const items = batch.slice();
            batch = [];
            clearTimeout(timeout);
            func(items);
        } else {
            // Set up delayed processing
            clearTimeout(timeout);
            timeout = setTimeout(() => {
                if (batch.length > 0) {
                    const items = batch.slice();
                    batch = [];
                    func(items);
                }
            }, wait);
        }
    };
}

/**
 * Performance monitoring wrapper for debounced functions
 */
export function monitoredDebounce(func, wait, name = 'debounced-function') {
    const debouncedFn = debounce(func, wait);
    let callCount = 0;
    let executeCount = 0;
    let totalExecutionTime = 0;

    return function(...args) {
        callCount++;

        const wrappedFunc = (...innerArgs) => {
            const startTime = performance.now();
            executeCount++;

            const result = func.apply(this, innerArgs);

            const endTime = performance.now();
            const executionTime = endTime - startTime;
            totalExecutionTime += executionTime;

            // Log performance data periodically
            if (executeCount % 10 === 0) {
                console.log(`Debounce Stats for ${name}:`, {
                    calls: callCount,
                    executions: executeCount,
                    savings: `${((1 - executeCount / callCount) * 100).toFixed(1)}%`,
                    avgExecutionTime: `${(totalExecutionTime / executeCount).toFixed(2)}ms`
                });
            }

            return result;
        };

        return debounce(wrappedFunc, wait).apply(this, args);
    };
}

// Export convenience functions for common use cases
export const searchDebounce = (func) => debounce(func, 300);
export const resizeDebounce = (func) => debounce(func, 150);
export const scrollDebounce = (func) => throttle(func, 16); // ~60fps
export const inputDebounce = (func) => debounce(func, 250);
export const clickDebounce = (func) => debounce(func, 500, true); // immediate execution
