import OpenAI, { toFile } from 'openai';
import { WhisperModel, ResponseFormat } from '../shared/types';

export interface TranscriptionOptions {
  model: WhisperModel;
  responseFormat?: ResponseFormat;
  language?: string;
  temperature?: number;
}

export interface TranscriptionResult {
  text: string;
  segments?: any[];
  words?: any[];
}

/**
 * Transcribe audio using OpenAI models
 * Supports whisper-1, gpt-4o-transcribe, and gpt-4o-mini-transcribe
 */
export async function transcribeAudio(
  audioBuffer: ArrayBuffer,
  apiKey: string,
  options: TranscriptionOptions
): Promise<string> {
  const openai = new OpenAI({ apiKey });

  // Convert ArrayBuffer to Buffer for Node.js
  const buffer = Buffer.from(audioBuffer);
  
  // Use OpenAI's toFile helper to create a proper file object for Node.js
  const file = await toFile(buffer, 'recording.webm', { type: 'audio/webm' });

  const { model, responseFormat = 'text', language, temperature = 0 } = options;

  try {
    // Build request parameters
    const requestParams: any = {
      file,
      model,
      response_format: responseFormat,
    };

    // Add optional parameters
    if (language) {
      requestParams.language = language;
    }
    if (temperature !== undefined) {
      requestParams.temperature = temperature;
    }

    // For whisper-1, we can request timestamps
    if (model === 'whisper-1' && responseFormat === 'verbose_json') {
      requestParams.timestamp_granularities = ['segment'];
    }

    const response = await openai.audio.transcriptions.create(requestParams);

    // Handle different response formats
    if (typeof response === 'string') {
      return response;
    } else if (typeof response === 'object' && response.text) {
      return response.text;
    } else {
      return JSON.stringify(response);
    }
  } catch (error: any) {
    if (error.status === 401) {
      throw new Error('Invalid API key. Please check your OpenAI API key.');
    }
    if (error.status === 429) {
      throw new Error('Rate limit exceeded. Please try again later.');
    }
    if (error.status === 413) {
      throw new Error('Audio file too large. Maximum size is 25MB.');
    }
    if (error.status === 400) {
      throw new Error(`Bad request: ${error.message || 'Invalid parameters'}`);
    }
    if (error.status === 503) {
      throw new Error('OpenAI service temporarily unavailable. Please try again.');
    }
    throw new Error(`Transcription failed: ${error.message || 'Unknown error'}`);
  }
}

/**
 * Transcribe audio with streaming support for gpt-4o models
 * Returns an async generator that yields text chunks as they arrive
 */
export async function* transcribeAudioStream(
  audioBuffer: ArrayBuffer,
  apiKey: string,
  options: TranscriptionOptions
): AsyncGenerator<string, void, unknown> {
  const openai = new OpenAI({ apiKey });
  const { model, language, temperature = 0 } = options;

  // Streaming is only supported for gpt-4o models
  if (model === 'whisper-1') {
    // Fall back to regular transcription for whisper-1
    const result = await transcribeAudio(audioBuffer, apiKey, options);
    yield result;
    return;
  }

  // Convert ArrayBuffer to Buffer for Node.js
  const buffer = Buffer.from(audioBuffer);
  const file = await toFile(buffer, 'recording.webm', { type: 'audio/webm' });

  try {
    const requestParams: any = {
      file,
      model,
      stream: true,
    };

    if (language) {
      requestParams.language = language;
    }
    if (temperature !== undefined) {
      requestParams.temperature = temperature;
    }

    const stream = await openai.audio.transcriptions.create(requestParams);

    // Process the stream
    for await (const chunk of stream as any) {
      if (chunk.text) {
        yield chunk.text;
      }
    }
  } catch (error: any) {
    if (error.status === 401) {
      throw new Error('Invalid API key. Please check your OpenAI API key.');
    }
    if (error.status === 429) {
      throw new Error('Rate limit exceeded. Please try again later.');
    }
    if (error.status === 413) {
      throw new Error('Audio file too large. Maximum size is 25MB.');
    }
    throw new Error(`Streaming transcription failed: ${error.message || 'Unknown error'}`);
  }
}

export async function validateApiKey(apiKey: string): Promise<boolean> {
  const openai = new OpenAI({ apiKey });

  try {
    // Try to list models to validate the key
    await openai.models.list();
    return true;
  } catch (error: any) {
    if (error.status === 401) {
      return false;
    }
    // Other errors might be network issues, consider key valid
    return true;
  }
}
