"use strict";
/**
 * Error handling utilities for the voice transcriber
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.parseTranscriptionError = parseTranscriptionError;
exports.retryWithBackoff = retryWithBackoff;
function parseTranscriptionError(error) {
    // Default error
    const defaultError = {
        code: 'UNKNOWN_ERROR',
        message: error?.message || 'Unknown error occurred',
        userMessage: 'An unexpected error occurred. Please try again.',
        retryable: true,
    };
    if (!error) {
        return defaultError;
    }
    // HTTP status code errors
    if (error.status) {
        switch (error.status) {
            case 400:
                return {
                    code: 'BAD_REQUEST',
                    message: error.message || 'Bad request',
                    userMessage: 'Invalid audio format or parameters. Please check your settings.',
                    retryable: false,
                };
            case 401:
                return {
                    code: 'INVALID_API_KEY',
                    message: 'Invalid API key',
                    userMessage: 'Invalid API key. Please check your OpenAI API key in settings.',
                    retryable: false,
                };
            case 403:
                return {
                    code: 'FORBIDDEN',
                    message: 'Access forbidden',
                    userMessage: 'You do not have access to this model. Please check your API key permissions.',
                    retryable: false,
                };
            case 404:
                return {
                    code: 'NOT_FOUND',
                    message: 'Model not found',
                    userMessage: 'The selected model is not available. Please try a different model.',
                    retryable: false,
                };
            case 413:
                return {
                    code: 'FILE_TOO_LARGE',
                    message: 'File too large',
                    userMessage: 'Audio file is too large. Maximum size is 25MB. Try recording a shorter clip.',
                    retryable: false,
                };
            case 415:
                return {
                    code: 'UNSUPPORTED_FORMAT',
                    message: 'Unsupported audio format',
                    userMessage: 'Unsupported audio format. Please try recording again.',
                    retryable: true,
                };
            case 429:
                return {
                    code: 'RATE_LIMIT',
                    message: 'Rate limit exceeded',
                    userMessage: 'Rate limit exceeded. Please wait a moment and try again.',
                    retryable: true,
                };
            case 500:
            case 502:
            case 503:
            case 504:
                return {
                    code: 'SERVER_ERROR',
                    message: 'Server error',
                    userMessage: 'OpenAI service is temporarily unavailable. Please try again in a few moments.',
                    retryable: true,
                };
        }
    }
    // Network errors
    if (error.message?.includes('fetch') ||
        error.message?.includes('network') ||
        error.message?.includes('ENOTFOUND') ||
        error.message?.includes('ECONNREFUSED') ||
        error.code === 'ENOTFOUND' ||
        error.code === 'ECONNREFUSED') {
        return {
            code: 'NETWORK_ERROR',
            message: error.message || 'Network error',
            userMessage: 'Network error. Please check your internet connection.',
            retryable: true,
        };
    }
    // Timeout errors
    if (error.message?.includes('timeout') || error.code === 'ETIMEDOUT') {
        return {
            code: 'TIMEOUT',
            message: 'Request timeout',
            userMessage: 'Request timed out. The audio may be too long. Please try a shorter recording.',
            retryable: true,
        };
    }
    // Audio recording errors
    if (error.name === 'NotAllowedError') {
        return {
            code: 'MIC_PERMISSION_DENIED',
            message: 'Microphone permission denied',
            userMessage: 'Microphone access denied. Please allow microphone access in your system settings.',
            retryable: false,
        };
    }
    if (error.name === 'NotFoundError') {
        return {
            code: 'NO_MICROPHONE',
            message: 'No microphone found',
            userMessage: 'No microphone found. Please connect a microphone and try again.',
            retryable: false,
        };
    }
    if (error.name === 'NotReadableError') {
        return {
            code: 'MIC_IN_USE',
            message: 'Microphone in use',
            userMessage: 'Microphone is in use by another application. Please close other applications using the microphone.',
            retryable: true,
        };
    }
    // File size errors
    if (error.message?.includes('file size') || error.message?.includes('too large')) {
        return {
            code: 'FILE_TOO_LARGE',
            message: 'File too large',
            userMessage: 'Audio file is too large. Maximum size is 25MB. Try recording a shorter clip.',
            retryable: false,
        };
    }
    // Model-specific errors
    if (error.message?.includes('model') && error.message?.includes('not found')) {
        return {
            code: 'MODEL_NOT_AVAILABLE',
            message: 'Model not available',
            userMessage: 'The selected model is not available. Please select a different model in settings.',
            retryable: false,
        };
    }
    // Return parsed error with original message
    return {
        code: 'TRANSCRIPTION_ERROR',
        message: error.message || 'Transcription failed',
        userMessage: error.message || 'Transcription failed. Please try again.',
        retryable: true,
    };
}
/**
 * Retry wrapper with exponential backoff
 */
async function retryWithBackoff(fn, maxRetries = 3, initialDelay = 1000) {
    let lastError;
    for (let i = 0; i < maxRetries; i++) {
        try {
            return await fn();
        }
        catch (error) {
            lastError = error;
            const parsedError = parseTranscriptionError(error);
            // Don't retry if error is not retryable
            if (!parsedError.retryable) {
                throw error;
            }
            // Don't retry on last attempt
            if (i === maxRetries - 1) {
                throw error;
            }
            // Exponential backoff
            const delay = initialDelay * Math.pow(2, i);
            await new Promise((resolve) => setTimeout(resolve, delay));
        }
    }
    throw lastError;
}
