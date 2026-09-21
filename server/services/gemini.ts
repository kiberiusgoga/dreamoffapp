// Gemini access, in one place.
//
// Each route used to construct its own GoogleGenerativeAI client and repeat
// the "strip the markdown fence, then JSON.parse" dance. Centralising it means
// the model name is configured once and tests can mock a single module.

import { GoogleGenerativeAI } from '@google/generative-ai';
import { GEMINI_API_KEY, GEMINI_MODEL } from '../config.js';
import { logger } from '../logger.js';

export function isGeminiConfigured(): boolean {
    return Boolean(GEMINI_API_KEY);
}

function model() {
    if (!GEMINI_API_KEY) {
        throw new Error('GEMINI_API_KEY is not configured on the server.');
    }
    return new GoogleGenerativeAI(GEMINI_API_KEY).getGenerativeModel({ model: GEMINI_MODEL });
}

/**
 * What a call consumed. Recorded on every request so spend is visible in the
 * log rather than only on a bill at the end of the month — the prompt is the
 * larger half here, and it is the half this code controls.
 */
export interface GeminiUsage {
    promptTokens: number;
    outputTokens: number;
    /**
     * Reasoning the model did before answering. It is billed at the output
     * rate but never appears in candidatesTokenCount, so it has to be derived
     * — and it is routinely larger than the visible answer. Ignoring it
     * understates the bill by more than half.
     */
    thinkingTokens: number;
    totalTokens: number;
    durationMs: number;
}

/** Runs a prompt and returns the trimmed text response. */
export async function generateText(prompt: string, label = 'generateText'): Promise<string> {
    const startedAt = Date.now();
    const result = await model().generateContent(prompt);

    const usage = result.response.usageMetadata;
    const prompt_ = usage?.promptTokenCount ?? 0;
    const output = usage?.candidatesTokenCount ?? 0;
    const total = usage?.totalTokenCount ?? 0;

    logger.info('gemini call', {
        call: label,
        model: GEMINI_MODEL,
        promptTokens: prompt_,
        outputTokens: output,
        // Whatever the total holds beyond the two reported counts.
        thinkingTokens: Math.max(0, total - prompt_ - output),
        totalTokens: total,
        durationMs: Date.now() - startedAt
    });

    return result.response.text().trim();
}

/**
 * Runs a prompt that is expected to return JSON.
 *
 * Models wrap JSON in a markdown fence often enough that stripping it is not
 * optional, and a fence can carry a language tag or trailing newline.
 */
export async function generateJSON<T>(prompt: string, label = 'generateJSON'): Promise<T> {
    const raw = await generateText(prompt, label);

    const unfenced = raw
        .replace(/^```(?:json)?\s*/i, '')
        .replace(/\s*```$/, '')
        .trim();

    try {
        return JSON.parse(unfenced) as T;
    } catch {
        throw new Error('The AI returned a response that was not valid JSON.');
    }
}
