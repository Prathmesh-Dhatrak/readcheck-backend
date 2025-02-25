import { config } from "../config.ts";

interface ClaudeMessage {
  role: "user" | "assistant";
  content: string;
}

interface ClaudeResponse {
  id: string;
  content: {
    type: string;
    text: string;
  }[];
}

export interface ContentAnalysis {
  question: string;
  answer: string;
}

export async function analyzeContent(url: string, title: string, content: string): Promise<ContentAnalysis> {
  if (!config.ANTHROPIC_API_KEY) {
    throw new Error("Anthropic API key is not configured");
  }

  const systemPrompt = 
    "You are an assistant that helps users understand articles they want to read. " +
    "Your task is to analyze the content and generate one insightful question that would verify " +
    "if someone has read and understood the core message of the article. " +
    "Also provide the correct answer to that question. " +
    "Format your response as JSON with 'question' and 'answer' fields.";

  const userPrompt = 
    `Please analyze this article: "${title}" from ${url}\n\n` +
    `Here's the content:\n${content}\n\n` +
    "Generate one insightful question that would verify if someone has read and understood " +
    "the core message of the article. Also provide the correct answer to that question. " +
    "Format your response as JSON with 'question' and 'answer' fields.";

  try {
    const response = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": config.ANTHROPIC_API_KEY,
        "anthropic-version": "2023-06-01"
      },
      body: JSON.stringify({
        model: "claude-3-haiku-20240307",
        system: systemPrompt,
        messages: [
          {
            role: "user",
            content: userPrompt
          }
        ],
        max_tokens: 1024,
        temperature: 0.7
      })
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(`Anthropic API error: ${JSON.stringify(error)}`);
    }

    const data = await response.json() as ClaudeResponse;
    const content = data.content[0].text;
    
    try {
      // Try to parse the response as JSON
      return JSON.parse(content) as ContentAnalysis;
    } catch (_e) {
      // If parsing fails, extract question and answer manually using regex
      const questionMatch = content.match(/["']?question["']?\s*:\s*["'](.+?)["']/);
      const answerMatch = content.match(/["']?answer["']?\s*:\s*["'](.+?)["']/);
      
      if (questionMatch && answerMatch) {
        return {
          question: questionMatch[1],
          answer: answerMatch[1]
        };
      }
      
      throw new Error("Failed to parse Anthropic response");
    }
  } catch (error: unknown) {
    console.error("Error calling Anthropic:", error);
    throw new Error(`Failed to analyze content: ${error instanceof Error ? error.message : String(error)}`);
  }
}

export async function fetchWebContent(url: string): Promise<string> {
  try {
    const response = await fetch(url);
    if (!response.ok) {
      throw new Error(`Failed to fetch content: ${response.statusText}`);
    }
    
    const html = await response.text();
    
    // Basic HTML content extraction (a more robust solution would use a proper HTML parser)
    // Remove scripts and styles
    let content = html
      .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, "")
      .replace(/<style\b[^<]*(?:(?!<\/style>)<[^<]*)*<\/style>/gi, "");
    
    // Extract body content
    const bodyMatch = content.match(/<body[^>]*>([\s\S]*?)<\/body>/i);
    if (bodyMatch) {
      content = bodyMatch[1];
    }
    
    // Remove HTML tags
    content = content.replace(/<\/?[^>]+(>|$)/g, " ");
    
    // Normalize whitespace
    content = content.replace(/\s+/g, " ").trim();
    
    // Truncate content if too long (Claude has token limits)
    if (content.length > 8000) {
      content = content.substring(0, 8000) + "...";
    }
    
    return content;
  } catch (error: unknown) {
    console.error("Error fetching web content:", error);
    throw new Error(`Failed to fetch web content: ${error instanceof Error ? error.message : String(error)}`);
  }
}