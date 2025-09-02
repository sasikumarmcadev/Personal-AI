// services/aiClient.js
// This can work with Groq, OpenAI, or any other AI service

const AI_API_URL = process.env.REACT_APP_AI_API_URL || 'https://api.groq.com/openai/v1/chat/completions';
const AI_API_KEY = process.env.REACT_APP_AI_API_KEY || process.env.REACT_APP_GROQ_API_KEY;
const AI_MODEL = process.env.REACT_APP_AI_MODEL || 'llama-3.1-70b-versatile';

export interface ChatMessage {
  role: 'user' | 'assistant' | 'system';
  content: string;
}

export interface ChatCompletionOptions {
  stream?: boolean;
  onChunk?: (chunk: string) => void;
  onComplete?: (fullResponse: string) => void;
  onError?: (error: Error) => void;
  temperature?: number;
  maxTokens?: number;
  model?: string;
}

export const createChatCompletion = async (
  messages: ChatMessage[],
  options: ChatCompletionOptions = {}
): Promise<string> => {
  const {
    stream = false,
    onChunk,
    onComplete,
    onError,
    temperature = 0.7,
    maxTokens = 4000,
    model = AI_MODEL
  } = options;

  try {
    const requestBody = {
      model,
      messages,
      temperature,
      max_tokens: maxTokens,
      stream
    };

    const response = await fetch(AI_API_URL, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${AI_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(requestBody),
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(`AI API Error: ${response.status} - ${errorData.error?.message || response.statusText}`);
    }

    if (stream && onChunk) {
      return await handleStreamingResponse(response, onChunk, onComplete, onError);
    } else {
      const data = await response.json();
      const content = data.choices[0]?.message?.content || '';
      
      if (onComplete) {
        onComplete(content);
      }
      
      return content;
    }
  } catch (error) {
    console.error('AI API request failed:', error);
    
    if (onError) {
      onError(error);
    }
    
    throw error;
  }
};

const handleStreamingResponse = async (
  response: Response,
  onChunk: (chunk: string) => void,
  onComplete?: (fullResponse: string) => void,
  onError?: (error: Error) => void
): Promise<string> => {
  const reader = response.body?.getReader();
  
  if (!reader) {
    throw new Error('Failed to get response reader');
  }

  let fullResponse = '';
  const decoder = new TextDecoder();

  try {
    while (true) {
      const { done, value } = await reader.read();
      
      if (done) break;

      const chunk = decoder.decode(value);
      const lines = chunk.split('\n');

      for (const line of lines) {
        if (line.startsWith('data: ')) {
          const data = line.slice(6);
          
          if (data === '[DONE]') {
            break;
          }

          try {
            const parsed = JSON.parse(data);
            const content = parsed.choices[0]?.delta?.content || '';
            
            if (content) {
              fullResponse += content;
              onChunk(content);
            }
          } catch (parseError) {
            // Skip invalid JSON lines
            continue;
          }
        }
      }
    }

    if (onComplete) {
      onComplete(fullResponse);
    }

    return fullResponse;
  } catch (error) {
    console.error('Error handling streaming response:', error);
    
    if (onError) {
      onError(error);
    }
    
    throw error;
  } finally {
    reader.releaseLock();
  }
};

// Utility function to create system prompts
export const createSystemMessage = (prompt: string): ChatMessage => ({
  role: 'system',
  content: prompt
});

// Pre-defined system prompts
export const SYSTEM_PROMPTS = {
  DEFAULT: "You are a helpful AI assistant. Provide clear, accurate, and helpful responses.",
  CREATIVE: "You are a creative AI assistant. Help users with creative tasks like writing, brainstorming, and artistic endeavors.",
  TECHNICAL: "You are a technical AI assistant. Help users with programming, technical questions, and problem-solving.",
  EDUCATIONAL: "You are an educational AI assistant. Help users learn new concepts by explaining things clearly and providing examples.",
  CASUAL: "You are a friendly, casual AI assistant. Have natural conversations and be personable while staying helpful."
};

// Function to prepare messages with system prompt
export const prepareMessages = (
  messages: ChatMessage[],
  systemPrompt: string = SYSTEM_PROMPTS.DEFAULT
): ChatMessage[] => {
  const hasSystemMessage = messages.some(msg => msg.role === 'system');
  
  if (!hasSystemMessage) {
    return [createSystemMessage(systemPrompt), ...messages];
  }
  
  return messages;
};

// Function to count tokens (approximate)
export const estimateTokenCount = (text: string): number => {
  // Rough estimation: 1 token ≈ 4 characters for English text
  return Math.ceil(text.length / 4);
};

// Function to truncate conversation history if too long
export const truncateConversation = (
  messages: ChatMessage[],
  maxTokens: number = 3000
): ChatMessage[] => {
  let totalTokens = 0;
  const truncatedMessages = [];
  
  // Always keep system message if present
  if (messages[0]?.role === 'system') {
    truncatedMessages.push(messages[0]);
    totalTokens += estimateTokenCount(messages[0].content);
  }
  
  // Add messages from the end (most recent first)
  for (let i = messages.length - 1; i >= 0; i--) {
    const message = messages[i];
    
    if (message.role === 'system') continue; // Already handled
    
    const messageTokens = estimateTokenCount(message.content);
    
    if (totalTokens + messageTokens > maxTokens) {
      break;
    }
    
    truncatedMessages.unshift(message);
    totalTokens += messageTokens;
  }
  
  return truncatedMessages;
};

export default {
  createChatCompletion,
  createSystemMessage,
  prepareMessages,
  estimateTokenCount,
  truncateConversation,
  SYSTEM_PROMPTS
};