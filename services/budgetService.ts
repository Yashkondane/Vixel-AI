/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

// Service to simulate backend budget tracking and enforce spending limits.
// This tracks usage in LocalStorage to prevent the application from making
// API calls once the defined monthly threshold is reached.

export type OperationType = 'EDIT' | 'FILTER' | 'ADJUSTMENT' | 'STYLE_TRANSFER' | 'MASK_COMPOSITION';

const BUDGET_CONFIG = {
    LIMIT_INR: 200,
    EXCHANGE_RATE: 85, // Approximate 1 USD = 85 INR
    STORAGE_KEY: 'vixel_ai_budget_tracker_v1',
};

// Estimated costs per operation in USD based on Gemini 2.5 Flash pricing.
// These are conservative estimates including input (text+image) and output (image) tokens.
// Flash Image generation is approx $0.00004/img, plus token costs.
// We round up significantly to provide a safety buffer.
const COST_TABLE_USD: Record<OperationType, number> = {
    EDIT: 0.003,            // ~1 image input + prompt, 1 image output
    FILTER: 0.003,          // ~1 image input + prompt, 1 image output
    ADJUSTMENT: 0.003,      // ~1 image input + prompt, 1 image output
    STYLE_TRANSFER: 0.006,  // ~2 images input, 1 image output
    MASK_COMPOSITION: 0.008 // ~3 images input, 1 image output
};

interface BudgetState {
    month: string;      // Format: YYYY-MM
    totalSpendUSD: number;
}

// Helper to get current month string (e.g., "2024-05")
const getCurrentMonthIdentifier = (): string => {
    const now = new Date();
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
};

const getBudgetState = (): BudgetState => {
    try {
        const stored = localStorage.getItem(BUDGET_CONFIG.STORAGE_KEY);
        if (stored) {
            const parsed: BudgetState = JSON.parse(stored);
            // Auto-reset if we have entered a new month
            if (parsed.month === getCurrentMonthIdentifier()) {
                return parsed;
            }
        }
    } catch (e) {
        console.warn('Failed to parse budget tracking data', e);
    }
    
    // Default state for new user or new month
    return {
        month: getCurrentMonthIdentifier(),
        totalSpendUSD: 0
    };
};

const saveBudgetState = (state: BudgetState) => {
    localStorage.setItem(BUDGET_CONFIG.STORAGE_KEY, JSON.stringify(state));
};

/**
 * Checks if the budget allows for the requested operation.
 * Throws an error if the limit has been exceeded.
 */
export const checkBudgetAvailability = (operation: OperationType): void => {
    const state = getBudgetState();
    const costUSD = COST_TABLE_USD[operation];
    
    const currentSpendINR = state.totalSpendUSD * BUDGET_CONFIG.EXCHANGE_RATE;
    const projectedSpendINR = (state.totalSpendUSD + costUSD) * BUDGET_CONFIG.EXCHANGE_RATE;

    if (currentSpendINR >= BUDGET_CONFIG.LIMIT_INR) {
        throw new Error(
            `⛔ Monthly Budget Exceeded ⛔\n` +
            `You have reached your safety limit of ₹${BUDGET_CONFIG.LIMIT_INR}.\n` +
            `Current usage: ₹${currentSpendINR.toFixed(2)}.\n` +
            `To protect your production costs, no further API calls will be made this month.`
        );
    }
};

/**
 * Records the usage of an operation after a successful API call.
 */
export const trackUsage = (operation: OperationType): void => {
    const state = getBudgetState();
    const cost = COST_TABLE_USD[operation];
    state.totalSpendUSD += cost;
    saveBudgetState(state);
    
    const spendINR = state.totalSpendUSD * BUDGET_CONFIG.EXCHANGE_RATE;
    console.log(`[BudgetService] Recorded ${operation} (~$${cost}). Monthly Total: ₹${spendINR.toFixed(2)} / ₹${BUDGET_CONFIG.LIMIT_INR}`);
};
