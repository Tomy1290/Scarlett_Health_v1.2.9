import { apiFetch } from '../utils/api';
import { localGreeting, localReply } from './localChat';
import { computeAISummary } from './summary';

export interface CloudChatResponse {
  text: string;
}

export interface CloudChatRequest {
  mode: 'greeting' | 'chat';
  language: 'de' | 'en' | 'pl';
  model?: string;
  summary?: Record<string, any>;
  messages?: Array<{ role: 'user' | 'assistant' | 'system'; content: string }>;
}

/**
 * Test if Cloud LLM is reachable by doing a simple health check
 */
export async function testCloudConnection(): Promise<boolean> {
  try {
    const response = await apiFetch('/', { 
      method: 'GET',
      signal: AbortSignal.timeout(3000) // 3 second timeout
    });
    return response.ok;
  } catch (error) {
    console.warn('Cloud LLM connection test failed:', error);
    return false;
  }
}

/**
 * Call Cloud LLM with timeout and error handling
 */
export async function callCloudLLM(request: CloudChatRequest): Promise<string> {
  try {
    const response = await apiFetch('/chat', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(request),
      signal: AbortSignal.timeout(8000) // 8 second timeout
    });

    if (!response.ok) {
      throw new Error(`Cloud LLM responded with status ${response.status}`);
    }

    const data: CloudChatResponse = await response.json();
    return data.text || '';
  } catch (error) {
    console.warn('Cloud LLM call failed:', error);
    throw error;
  }
}

/**
 * Hybrid greeting - tries Cloud LLM first, falls back to local
 */
export async function hybridGreeting(state: any): Promise<string> {
  try {
    // Test connection first
    const isConnected = await testCloudConnection();
    if (!isConnected) {
      throw new Error('Cloud LLM not reachable');
    }

    // Prepare summary for Cloud LLM
    const summary = computeAISummary(state);
    
    const request: CloudChatRequest = {
      mode: 'greeting',
      language: state.language || 'de',
      model: 'gpt-4o-mini',
      summary
    };

    const result = await callCloudLLM(request);
    if (result && result.trim()) {
      console.log('✅ Cloud LLM greeting successful');
      return result.trim();
    }
    
    throw new Error('Empty response from Cloud LLM');
  } catch (error) {
    console.log('🔄 Cloud LLM failed, falling back to local greeting:', error);
    return await localGreeting(state);
  }
}

/**
 * Hybrid reply - tries Cloud LLM first, falls back to local
 */
export async function hybridReply(state: any, userMessage: string): Promise<string> {
  try {
    // Test connection first
    const isConnected = await testCloudConnection();
    if (!isConnected) {
      throw new Error('Cloud LLM not reachable');
    }

    // Prepare summary for Cloud LLM
    const summary = computeAISummary(state);
    
    // Get recent chat history for context
    const recentChat = (state.chat || []).slice(-6).map((msg: any) => ({
      role: msg.sender === 'user' ? 'user' as const : 'assistant' as const,
      content: msg.text
    }));

    // Add current user message
    recentChat.push({ role: 'user', content: userMessage });

    const request: CloudChatRequest = {
      mode: 'chat',
      language: state.language || 'de',
      model: 'gpt-4o-mini',
      summary,
      messages: recentChat
    };

    const result = await callCloudLLM(request);
    if (result && result.trim()) {
      console.log('✅ Cloud LLM reply successful');
      return result.trim();
    }
    
    throw new Error('Empty response from Cloud LLM');
  } catch (error) {
    console.log('🔄 Cloud LLM failed, falling back to local reply:', error);
    return await localReply(state, userMessage);
  }
}

/**
 * Get current AI status for UI indication
 */
export async function getAIStatus(): Promise<'cloud' | 'local' | 'offline'> {
  try {
    const isConnected = await testCloudConnection();
    return isConnected ? 'cloud' : 'local';
  } catch (error) {
    return 'local';
  }
}