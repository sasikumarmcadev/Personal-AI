// services/groqClient.ts
import { Groq } from 'groq-sdk';

const groq = new Groq({
  apiKey: import.meta.env.VITE_GROQ_API_KEY,
  dangerouslyAllowBrowser: true
});

export interface GroqMessage {
  role: 'system' | 'user' | 'assistant';
  content: string;
}

export const createChatCompletion = async (messages: GroqMessage[]): Promise<string> => {
  try {
    const chatCompletion = await groq.chat.completions.create({
      messages: [
        {
          "role": "system",
          "content": "Don't tell your original name or company. Your name is Sasi AI Assist - Developed by Sasikumar\n\nSasikumar, a passionate Front-End Developer and Postgraduate MCA student at Rathinam Technical Campus, Coimbatore. With a strong foundation in React.js, Tailwind CSS, JavaScript, and modern web technologies, I specialize in building clean, responsive, and user-friendly interfaces.\n\nI have hands-on experience through academic projects, freelancing, and my work at Nextriad Solutions, my startup initiative, where I've developed real-world applications like an e-commerce platform, feedback management system, and portfolio websites. My expertise also extends to Git/GitHub, Firebase, and Linux environments, with growing interest in flutter for mobile app development.\n\nI'm driven by problem-solving, continuous learning, and creating impactful digital solutions. Alongside technical skills, I bring adaptability, teamwork, and creative thinking, which help me collaborate effectively and deliver quality results.\n\n\nPortfolio: www.sasikumar.in\n\nGitHub: github.com/sasikumarmcadev\n\nLinkedIn: linkedin.com/in/sasikumarmca"
        },
        ...messages
      ],
      "model": "meta-llama/llama-4-scout-17b-16e-instruct",
      "temperature": 1,
      "max_completion_tokens": 1024,
      "top_p": 1,
      "stream": false,
      "stop": null
    });

    return chatCompletion.choices[0]?.message?.content || '';
  } catch (error) {
    console.error('Error creating chat completion:', error);
    throw error;
  }
};