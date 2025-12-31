
/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
*/

import { checkBudgetAvailability, trackUsage } from "./budgetService";

const BACKEND_URL = "http://localhost:8080/api/process";

/**
 * Generic fetcher to talk to our Go backend.
 */
const callBackend = async (formData: FormData): Promise<string> => {
    const response = await fetch(BACKEND_URL, {
        method: "POST",
        body: formData,
    });

    if (!response.ok) {
        const errorText = await response.text();
        throw new Error(errorText || "Backend processing failed");
    }

    const data = await response.json();
    if (!data.imageUrl) {
        throw new Error("No image was returned from the server");
    }

    return data.imageUrl;
};

export const generateEditedImage = async (
    originalImage: File,
    userPrompt: string,
    hotspot: { x: number, y: number }
): Promise<string> => {
    checkBudgetAvailability('EDIT');
    
    const formData = new FormData();
    const prompt = `You are an expert photo editor AI. Perform a localized edit on the image.
User Request: "${userPrompt}"
Edit Location: (x: ${hotspot.x}, y: ${hotspot.y}).
Guidelines: Keep everything outside the edit area identical. Output ONLY the edited image.`;

    formData.append("prompt", prompt);
    formData.append("image", originalImage);

    const result = await callBackend(formData);
    trackUsage('EDIT');
    return result;
};

export const generateFilteredImage = async (
    originalImage: File,
    filterPrompt: string,
    isAdaptive: boolean = false,
): Promise<string> => {
    checkBudgetAvailability('FILTER');
    
    const formData = new FormData();
    const prompt = `Apply a filter to the entire image. Request: "${filterPrompt}". ${isAdaptive ? 'Adapt it intelligently to this specific photo.' : ''} Output ONLY the image.`;
    
    formData.append("prompt", prompt);
    formData.append("image", originalImage);

    const result = await callBackend(formData);
    trackUsage('FILTER');
    return result;
};

export const generateAdjustedImage = async (
    originalImage: File,
    adjustmentPrompt: string,
    isAdaptive: boolean = false,
): Promise<string> => {
    checkBudgetAvailability('ADJUSTMENT');
    
    const formData = new FormData();
    const prompt = `Perform a global adjustment. Request: "${adjustmentPrompt}". ${isAdaptive ? 'Adapt to lighting/composition.' : ''} Output ONLY the image.`;
    
    formData.append("prompt", prompt);
    formData.append("image", originalImage);

    const result = await callBackend(formData);
    trackUsage('ADJUSTMENT');
    return result;
};

export const generateStyleTransferImage = async (
    contentImage: File,
    styleImage: File,
    userPrompt: string,
): Promise<string> => {
    checkBudgetAvailability('STYLE_TRANSFER');
    
    const formData = new FormData();
    const prompt = `Apply the artistic style of the 'style' image to the 'content' image. Instruction: "${userPrompt}". Output ONLY the image.`;
    
    formData.append("prompt", prompt);
    formData.append("content", contentImage);
    formData.append("style", styleImage);

    const result = await callBackend(formData);
    trackUsage('STYLE_TRANSFER');
    return result;
};

export const generateMaskedImage = async (
    baseImage: File,
    sourceImage: File,
    maskImage: File
): Promise<string> => {
    checkBudgetAvailability('MASK_COMPOSITION');
    
    const formData = new FormData();
    const prompt = `Combine the 'base image' and 'source image' using the 'mask image' (white = source, black = base). Blend seamlessly. Output ONLY the image.`;
    
    formData.append("prompt", prompt);
    formData.append("base", baseImage);
    formData.append("source", sourceImage);
    formData.append("mask", maskImage);

    const result = await callBackend(formData);
    trackUsage('MASK_COMPOSITION');
    return result;
};
