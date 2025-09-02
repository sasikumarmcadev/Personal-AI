// services/chatService.ts
import { createChatCompletion, GroqMessage } from './groqClient';

export const generateResponse = async (messages: any[]): Promise<string> => {
  try {
    // Convert messages to Groq format
    const groqMessages: GroqMessage[] = messages.map(msg => ({
      role: msg.role as 'user' | 'assistant',
      content: msg.content
    }));

    // Use the Groq API
    const response = await createChatCompletion(groqMessages);
    return response;
  } catch (error) {
    console.error('Error generating response:', error);
    throw new Error('Failed to generate response. Please check your API key and try again.');
  }
};