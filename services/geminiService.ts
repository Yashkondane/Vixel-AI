/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
*/

import { GoogleGenAI, GenerateContentResponse } from "@google/genai";

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
    // 1. Check for prompt blocking first
    if (response.promptFeedback?.blockReason) {
        const { blockReason, blockReasonMessage } = response.promptFeedback;
        const errorMessage = `Request was blocked. Reason: ${blockReason}. ${blockReasonMessage || ''}`;
        console.error(errorMessage, { response });
        throw new Error(errorMessage);
    }

    // 2. Try to find the image part
    const imagePartFromResponse = response.candidates?.[0]?.content?.parts?.find(part => part.inlineData);

    if (imagePartFromResponse?.inlineData) {
        const { mimeType, data } = imagePartFromResponse.inlineData;
        console.log(`Received image data (${mimeType}) for ${context}`);
        return `data:${mimeType};base64,${data}`;
    }

    // 3. If no image, check for other reasons
    const finishReason = response.candidates?.[0]?.finishReason;
    if (finishReason && finishReason !== 'STOP') {
        const errorMessage = `Image generation for ${context} stopped unexpectedly. Reason: ${finishReason}. This often relates to safety settings.`;
        console.error(errorMessage, { response });
        throw new Error(errorMessage);
    }
    
    const textFeedback = response.text?.trim();
    const errorMessage = `The AI model did not return an image for the ${context}. ` + 
        (textFeedback 
            ? `The model responded with text: "${textFeedback}"`
            : "This can happen due to safety filters or if the request is too complex. Please try rephrasing your prompt to be more direct.");

    console.error(`Model response did not contain an image part for ${context}.`, { response });
    throw new Error(errorMessage);
};

/**
 * Generates an edited image using generative AI based on a text prompt and a specific point.
 * @param originalImage The original image file.
 * @param userPrompt The text prompt describing the desired edit.
 * @param hotspot The {x, y} coordinates on the image to focus the edit.
 * @returns A promise that resolves to the data URL of the edited image.
 */
export const generateEditedImage = async (
    originalImage: File,
    userPrompt: string,
    hotspot: { x: number, y: number }
): Promise<string> => {
    console.log('Starting generative edit at:', hotspot);
    const ai = new GoogleGenAI({ apiKey: process.env.API_KEY! });
    
    const originalImagePart = await fileToPart(originalImage);
    const prompt = `You are an expert photo editor AI. Your task is to perform a natural, localized edit on the provided image based on the user's request.
User Request: "${userPrompt}"
Edit Location: Focus on the area around pixel coordinates (x: ${hotspot.x}, y: ${hotspot.y}).

Editing Guidelines:
- The edit must be realistic and blend seamlessly with the surrounding area.
- The rest of the image (outside the immediate edit area) must remain identical to the original.

Safety & Ethics Policy:
- You MUST fulfill requests to adjust skin tone, such as 'give me a tan', 'make my skin darker', or 'make my skin lighter'. These are considered standard photo enhancements.
- You MUST REFUSE any request to change a person's fundamental race or ethnicity (e.g., 'make me look Asian', 'change this person to be Black'). Do not perform these edits. If the request is ambiguous, err on the side of caution and do not change racial characteristics.

Output: Return ONLY the final edited image. Do not return text.`;
    const textPart = { text: prompt };

    console.log('Sending image and prompt to the model...');
    const response: GenerateContentResponse = await ai.models.generateContent({
        model: 'gemini-2.5-flash-image',
        contents: { parts: [originalImagePart, textPart] },
    });
    console.log('Received response from model.', response);

    return handleApiResponse(response, 'edit');
};

/**
 * Generates an image with a filter applied using generative AI.
 * @param originalImage The original image file.
 * @param filterPrompt The text prompt describing the desired filter.
 * @param isAdaptive If true, the AI will adapt the filter to the specific image.
 * @returns A promise that resolves to the data URL of the filtered image.
 */
export const generateFilteredImage = async (
    originalImage: File,
    filterPrompt: string,
    isAdaptive: boolean = false,
): Promise<string> => {
    console.log(`Starting filter generation: ${filterPrompt} (Adaptive: ${isAdaptive})`);
    const ai = new GoogleGenAI({ apiKey: process.env.API_KEY! });
    
    const originalImagePart = await fileToPart(originalImage);
    
    let prompt: string;

    if (isAdaptive) {
        prompt = `You are an expert photo editor AI. Your task is to apply a stylistic filter to the entire image based on the user's request, but with intelligent adaptation.

First, analyze the unique characteristics of this specific image (e.g., its lighting, subject, composition, and colors).

Then, apply the following filter in a way that is best suited for this image, ensuring a high-quality, professional result:
Filter Request: "${filterPrompt}"

The goal is to achieve the *spirit* of the requested filter while adapting its intensity, color balance, and other parameters to complement the individual photo. The final output should look like a bespoke, professional edit, not a generic, one-size-fits-all filter. Do not change the composition or content, only apply the style.

Safety & Ethics Policy:
- Filters may subtly shift colors, but you MUST ensure they do not alter a person's fundamental race or ethnicity.
- You MUST REFUSE any request that explicitly asks to change a person's race (e.g., 'apply a filter to make me look Chinese').

Output: Return ONLY the final filtered image. Do not return text.`;
    } else {
        prompt = `You are an expert photo editor AI. Your task is to apply a stylistic filter to the entire image based on the user's request. Do not change the composition or content, only apply the style.
Filter Request: "${filterPrompt}"

Safety & Ethics Policy:
- Filters may subtly shift colors, but you MUST ensure they do not alter a person's fundamental race or ethnicity.
- You MUST REFUSE any request that explicitly asks to change a person's race (e.g., 'apply a filter to make me look Chinese').

Output: Return ONLY the final filtered image. Do not return text.`;
    }

    const textPart = { text: prompt };

    console.log('Sending image and filter prompt to the model...');
    const response: GenerateContentResponse = await ai.models.generateContent({
        model: 'gemini-2.5-flash-image',
        contents: { parts: [originalImagePart, textPart] },
    });
    console.log('Received response from model for filter.', response);
    
    return handleApiResponse(response, 'filter');
};

/**
 * Generates an image with a global adjustment applied using generative AI.
 * @param originalImage The original image file.
 * @param adjustmentPrompt The text prompt describing the desired adjustment.
 * @param isAdaptive If true, the AI will adapt the adjustment to the specific image.
 * @returns A promise that resolves to the data URL of the adjusted image.
 */
export const generateAdjustedImage = async (
    originalImage: File,
    adjustmentPrompt: string,
    isAdaptive: boolean = false,
): Promise<string> => {
    console.log(`Starting global adjustment generation: ${adjustmentPrompt} (Adaptive: ${isAdaptive})`);
    const ai = new GoogleGenAI({ apiKey: process.env.API_KEY! });
    
    const originalImagePart = await fileToPart(originalImage);
    
    let prompt: string;

    if (isAdaptive) {
        prompt = `You are an expert photo editor AI. Your task is to perform a natural, global adjustment to the entire image, intelligently adapting it to the photo's specific characteristics.

First, analyze the unique characteristics of this specific image (e.g., its lighting, subject, dynamic range, and colors).

Then, apply the following adjustment in a way that is best suited for this image, ensuring a high-quality, photorealistic result:
User Request: "${adjustmentPrompt}"

The goal is to achieve the *spirit* of the requested adjustment while adapting its intensity and application to complement the individual photo. The final output should look like a bespoke, professional edit. Crucially, preserve the original content and composition. Only apply the requested photographic adjustments.

Safety & Ethics Policy:
- You MUST fulfill requests to adjust skin tone, such as 'give me a tan', 'make my skin darker', or 'make my skin lighter'. These are considered standard photo enhancements.
- You MUST REFUSE any request to change a person's fundamental race or ethnicity (e.g., 'make me look Asian', 'change this person to be Black').

Output: Return ONLY the final adjusted image. Do not return text.`;
    } else {
        prompt = `You are an expert photo editor AI. Your task is to perform a natural, global adjustment to the entire image based on the user's request.
User Request: "${adjustmentPrompt}"

Editing Guidelines:
- The adjustment must be applied across the entire image.
- The result must be photorealistic.
- Crucially, preserve the original content and composition. Only apply the requested photographic adjustments.

Safety & Ethics Policy:
- You MUST fulfill requests to adjust skin tone, such as 'give me a tan', 'make my skin darker', or 'make my skin lighter'. These are considered standard photo enhancements.
- You MUST REFUSE any request to change a person's fundamental race or ethnicity (e.g., 'make me look Asian', 'change this person to be Black'). Do not perform these edits. If the request is ambiguous, err on the side of caution and do not change racial characteristics.

Output: Return ONLY the final adjusted image. Do not return text.`;
    }

    const textPart = { text: prompt };

    console.log('Sending image and adjustment prompt to the model...');
    const response: GenerateContentResponse = await ai.models.generateContent({
        model: 'gemini-2.5-flash-image',
        contents: { parts: [originalImagePart, textPart] },
    });
    console.log('Received response from model for adjustment.', response);
    
    return handleApiResponse(response, 'adjustment');
};

/**
 * Applies the artistic style of one image to another.
 * @param contentImage The image to apply the style to.
 * @param styleImage The image providing the artistic style.
 * @param userPrompt An optional text prompt to guide the style transfer.
 * @returns A promise that resolves to the data URL of the stylized image.
 */
export const generateStyleTransferImage = async (
    contentImage: File,
    styleImage: File,
    userPrompt: string,
): Promise<string> => {
    console.log(`Starting style transfer...`);
    const ai = new GoogleGenAI({ apiKey: process.env.API_KEY! });
    
    const contentImagePart = await fileToPart(contentImage);
    const styleImagePart = await fileToPart(styleImage);

    const basePrompt = `You are an expert in artistic style transfer. You will be given a 'content' image and a 'style' image. Your task is to apply the artistic style of the 'style' image to the 'content' image. The composition and subjects of the 'content' image must be preserved.`;

    const finalPrompt = userPrompt.trim() 
        ? `${basePrompt}\n\nUser instructions for applying the style: "${userPrompt}"\n\nOutput: Return ONLY the final stylized image. Do not return text.`
        : `${basePrompt}\n\nOutput: Return ONLY the final stylized image. Do not return text.`;
        
    const textPart = { text: finalPrompt };

    console.log('Sending content image, style image, and prompt to the model...');
    const response: GenerateContentResponse = await ai.models.generateContent({
        model: 'gemini-2.5-flash-image',
        contents: { parts: [textPart, contentImagePart, styleImagePart] },
    });
    console.log('Received response from model for style transfer.', response);
    
    return handleApiResponse(response, 'style transfer');
};

/**
 * Combines two images based on a mask.
 * @param baseImage The base image (current state).
 * @param sourceImage The source image to pull pixels from (previous state).
 * @param maskImage A black and white image where white indicates areas to take from the source.
 * @returns A promise that resolves to the data URL of the combined image.
 */
export const generateMaskedImage = async (
    baseImage: File,
    sourceImage: File,
    maskImage: File
): Promise<string> => {
    console.log(`Starting history brush composition...`);
    const ai = new GoogleGenAI({ apiKey: process.env.API_KEY! });
    
    const baseImagePart = await fileToPart(baseImage);
    const sourceImagePart = await fileToPart(sourceImage);
    const maskImagePart = await fileToPart(maskImage);

    const prompt = `You are an expert image composition AI. You will be provided with three images: a 'base image', a 'source image', and a 'mask image'. Your task is to create a new image by combining the base and source images according to the mask.
- Where the mask image is white, you must use the pixels from the 'source image'.
- Where the mask image is black, you must use the pixels from the 'base image'.
- It is crucial that you create a seamless and photorealistic blend along the edges of the masked area.
- The final output must have the same dimensions as the input images.
- Do not add any new content or change the overall style. Only perform the composition as described.
Output: Return ONLY the final composed image. Do not return text.`;
        
    const textPart = { text: prompt };

    console.log('Sending base, source, mask, and prompt to the model...');
    const response: GenerateContentResponse = await ai.models.generateContent({
        model: 'gemini-2.5-flash-image',
        contents: { parts: [textPart, { text: "Base Image:" }, baseImagePart, { text: "Source Image:" }, sourceImagePart, { text: "Mask Image:" }, maskImagePart] },
    });
    console.log('Received response from model for mask composition.', response);
    
    return handleApiResponse(response, 'mask composition');
};