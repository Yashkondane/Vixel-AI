
/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
*/

import { GoogleGenAI, GenerateContentResponse } from "@google/genai";
import { checkBudgetAvailability, trackUsage } from "./budgetService";

// Helper to handle the API Key detection from environment or window helper
const getApiKey = async (): Promise<string> => {
    // 1. Try environment variable (Injected by Vite's 'define' plugin)
    // We check for the string "process.env.API_KEY" which Vite replaces at build time.
    const envKey = process.env.API_KEY;
    
    if (envKey && envKey !== 'undefined' && envKey !== '') {
        return envKey;
    }

    // 2. Fallback to window.aistudio helper if available (Common in specific hosted environments)
    if (typeof (window as any).aistudio !== 'undefined') {
        const hasKey = await (window as any).aistudio.hasSelectedApiKey();
        if (!hasKey) {
            await (window as any).aistudio.openSelectKey();
        }
        return process.env.API_KEY || '';
    }

    console.error("Vixel AI: No API Key detected. Ensure your .env file has VITE_GEMINI_API_KEY=your_key and you have restarted the 'npm run dev' server.");
    return '';
};

// Helper function to convert a File object to a Gemini API Part
const fileToPart = async (file: File): Promise<{ inlineData: { mimeType: string; data: string; } }> => {
    const dataUrl = await new Promise<string>((resolve, reject) => {
        const reader = new FileReader();
        reader.readAsDataURL(file);
        reader.onload = () => resolve(reader.result as string);
        reader.onerror = error => reject(error);
    });
    
    const arr = dataUrl.split(',');
    if (arr.length < 2) throw new Error("Invalid data URL");
    const mimeMatch = arr[0].match(/:(.*?);/);
    if (!mimeMatch || !mimeMatch[1]) throw new Error("Could not parse MIME type from data URL");
    
    const mimeType = mimeMatch[1];
    const data = arr[1];
    return { inlineData: { mimeType, data } };
};

const handleApiResponse = (
    response: GenerateContentResponse,
    context: string // e.g., "edit", "filter", "adjustment"
): string => {
    if (response.promptFeedback?.blockReason) {
        const { blockReason, blockReasonMessage } = response.promptFeedback;
        const errorMessage = `Request was blocked. Reason: ${blockReason}. ${blockReasonMessage || ''}`;
        throw new Error(errorMessage);
    }

    const imagePartFromResponse = response.candidates?.[0]?.content?.parts?.find(part => part.inlineData);

    if (imagePartFromResponse?.inlineData) {
        const { mimeType, data } = imagePartFromResponse.inlineData;
        return `data:${mimeType};base64,${data}`;
    }

    const finishReason = response.candidates?.[0]?.finishReason;
    if (finishReason && finishReason !== 'STOP') {
        throw new Error(`Image generation for ${context} stopped unexpectedly. Reason: ${finishReason}.`);
    }
    
    const textFeedback = response.text?.trim();
    const errorMessage = `The AI model did not return an image. ${textFeedback ? `AI: "${textFeedback}"` : ""}`;
    throw new Error(errorMessage);
};

export const generateEditedImage = async (
    originalImage: File,
    userPrompt: string,
    hotspot: { x: number, y: number }
): Promise<string> => {
    checkBudgetAvailability('EDIT');
    
    const apiKey = await getApiKey();
    if (!apiKey) throw new Error("API Key is missing. Please check your .env file and restart your local server.");
    
    const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
    const originalImagePart = await fileToPart(originalImage);
    const prompt = `You are an expert photo editor AI. Perform a localized edit on the image.
User Request: "${userPrompt}"
Edit Location: (x: ${hotspot.x}, y: ${hotspot.y}).
Guidelines: Keep everything outside the edit area identical. Output ONLY the edited image.`;

    const response: GenerateContentResponse = await ai.models.generateContent({
        model: 'gemini-2.5-flash-image',
        contents: { parts: [originalImagePart, { text: prompt }] },
    });

    const result = handleApiResponse(response, 'edit');
    trackUsage('EDIT');
    return result;
};

export const generateFilteredImage = async (
    originalImage: File,
    filterPrompt: string,
    isAdaptive: boolean = false,
): Promise<string> => {
    checkBudgetAvailability('FILTER');
    const apiKey = await getApiKey();
    if (!apiKey) throw new Error("API Key is missing.");

    const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
    const originalImagePart = await fileToPart(originalImage);
    const prompt = `Apply a filter to the entire image. Request: "${filterPrompt}". ${isAdaptive ? 'Adapt it intelligently to this specific photo.' : ''} Output ONLY the image.`;

    const response: GenerateContentResponse = await ai.models.generateContent({
        model: 'gemini-2.5-flash-image',
        contents: { parts: [originalImagePart, { text: prompt }] },
    });
    
    const result = handleApiResponse(response, 'filter');
    trackUsage('FILTER');
    return result;
};

export const generateAdjustedImage = async (
    originalImage: File,
    adjustmentPrompt: string,
    isAdaptive: boolean = false,
): Promise<string> => {
    checkBudgetAvailability('ADJUSTMENT');
    const apiKey = await getApiKey();
    if (!apiKey) throw new Error("API Key is missing.");

    const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
    const originalImagePart = await fileToPart(originalImage);
    const prompt = `Perform a global adjustment. Request: "${adjustmentPrompt}". ${isAdaptive ? 'Adapt to lighting/composition.' : ''} Output ONLY the image.`;

    const response: GenerateContentResponse = await ai.models.generateContent({
        model: 'gemini-2.5-flash-image',
        contents: { parts: [originalImagePart, { text: prompt }] },
    });
    
    const result = handleApiResponse(response, 'adjustment');
    trackUsage('ADJUSTMENT');
    return result;
};

export const generateStyleTransferImage = async (
    contentImage: File,
    styleImage: File,
    userPrompt: string,
): Promise<string> => {
    checkBudgetAvailability('STYLE_TRANSFER');
    const apiKey = await getApiKey();
    if (!apiKey) throw new Error("API Key is missing.");

    const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
    const contentImagePart = await fileToPart(contentImage);
    const styleImagePart = await fileToPart(styleImage);

    const prompt = `Apply the artistic style of the 'style' image to the 'content' image. Instruction: "${userPrompt}". Output ONLY the image.`;
        
    const response: GenerateContentResponse = await ai.models.generateContent({
        model: 'gemini-2.5-flash-image',
        contents: { parts: [{ text: prompt }, contentImagePart, styleImagePart] },
    });
    
    const result = handleApiResponse(response, 'style transfer');
    trackUsage('STYLE_TRANSFER');
    return result;
};

export const generateMaskedImage = async (
    baseImage: File,
    sourceImage: File,
    maskImage: File
): Promise<string> => {
    checkBudgetAvailability('MASK_COMPOSITION');
    const apiKey = await getApiKey();
    if (!apiKey) throw new Error("API Key is missing.");

    const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
    const baseImagePart = await fileToPart(baseImage);
    const sourceImagePart = await fileToPart(sourceImage);
    const maskImagePart = await fileToPart(maskImage);

    const prompt = `Combine the 'base image' and 'source image' using the 'mask image' (white = source, black = base). Blend seamlessly. Output ONLY the image.`;
        
    const response: GenerateContentResponse = await ai.models.generateContent({
        model: 'gemini-2.5-flash-image',
        contents: { parts: [{ text: prompt }, { text: "Base:" }, baseImagePart, { text: "Source:" }, sourceImagePart, { text: "Mask:" }, maskImagePart] },
    });
    
    const result = handleApiResponse(response, 'mask composition');
    trackUsage('MASK_COMPOSITION');
    return result;
};
