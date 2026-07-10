import 'dotenv/config';
import axios from 'axios';

export const askGemini = async (req, res) => {
  try {
    const { prompt, type } = req.body; // type: 'doubt' | 'summary' | 'quiz' | 'explain'
    const apiKey = process.env.GEMINI_API_KEY;

    if (!prompt) {
      return res.status(400).json({ error: 'Prompt is required' });
    }

    if (apiKey) {
      // Direct HTTP request to Gemini API using Axios
      try {
        const response = await axios.post(
          `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${apiKey}`,
          {
            contents: [
              {
                parts: [
                  {
                    text: `You are StudySync Gemini AI, a helpful collaborative study assistant. Format responses with clean HTML/Markdown. The user has selected option: ${type || 'general'}. Prompt: ${prompt}`
                  }
                ]
              }
            ]
          },
          {
            headers: {
              'Content-Type': 'application/json'
            }
          }
        );

        const reply = response.data?.candidates?.[0]?.content?.parts?.[0]?.text;
        if (reply) {
          return res.json({ reply });
        }
      } catch (geminiErr) {
        console.error(`[AIController] Gemini API network/request error:`, geminiErr.message);
        
        const status = geminiErr.response?.status || 503;
        const errData = geminiErr.response?.data || {};
        const errMsg = errData.error?.message || geminiErr.message;
        
        let friendlyMsg = 'AI Assistant is temporarily unavailable.';
        if (status === 400 && errMsg.includes('API key')) {
          friendlyMsg = 'Invalid Gemini API key. Please verify the environment configuration.';
        } else if (status === 429) {
          friendlyMsg = 'Gemini API rate limit exceeded. Please try again in a few moments.';
        } else if (status === 403) {
          friendlyMsg = 'Access to Gemini API is forbidden. Check authorization settings.';
        } else {
          friendlyMsg = `Gemini API Error: ${errMsg}`;
        }
        
        return res.status(status).json({ error: friendlyMsg });
      }
    }

    // Smart fallback simulator for local offline testing
    let reply = '';
    const query = prompt.toLowerCase();

    if (type === 'quiz' || query.includes('quiz') || query.includes('test')) {
      reply = `### 📝 Custom Study Quiz:
Here is a quick quiz to test your understanding:

1. **Question 1**: What is the primary purpose of the Pomodoro technique?
   - A) Multi-tasking
   - B) Studying in focused intervals (usually 25 or 30 minutes) followed by short breaks
   - C) Working without sleeping
   - *Answer: B*

2. **Question 2**: Which protocol is typically used for real-time signaling in web applications?
   - A) SMTP
   - B) WebSockets (such as Socket.io)
   - C) FTP
   - *Answer: B*

3. **Question 3**: What does the HTTP status code 403 Forbidden indicate?
   - A) The requested resource could not be found
   - B) The user is authenticated but does not have access permissions
   - C) The server is temporarily down for maintenance
   - *Answer: B*

Keep studying and try answering these with your study group!`;
    } else if (type === 'summary' || query.includes('summarize') || query.includes('summary')) {
      reply = `### 📌 Study Session Summary:
Here is a summary of the concepts:
- **Focus Sessions**: Structured blocks designed to maximize deep focus and cognitive flow.
- **Break Times**: Critical periods of rest to refresh mental capacity and reduce burnout.
- **Collaborative Learning**: Social accountability by studying in groups increases motivation and retention.
- **Action Item**: Review this summary before starting your next session!`;
    } else if (type === 'explain' || query.includes('explain') || query.includes('what is')) {
      reply = `### 💡 Concept Explanation:
Let's break down this concept in simple terms:
1. **Core Principle**: Breaking down complex subjects into bite-sized, digestible modules.
2. **Real-world Analogy**: Think of it like building a puzzle: you start by grouping edge pieces (foundations) before connecting the detailed center.
3. **Key Takeaway**: Consistency is more valuable than cramming. Repeat and practice regularly.`;
    } else {
      reply = `### 🤖 StudySync AI Assistant Response:
Hi! I am your StudySync Gemini AI assistant.
- **Doubts**: Ask me any academic questions, and I'll break them down.
- **Quizzes**: Ask me to "generate a quiz" on any topic to test your memory.
- **Summaries**: Paste your notes and ask me to summarize them.

*Prompt received: "${prompt}"*
We are studying collaborative concepts. What topic would you like to explore next with your partners?`;
    }

    return res.json({ reply });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};
