// ===============================
// 🔐 SENSITIVE DETECTION (fallback layer)
// ===============================

const SENSITIVE_PATTERNS = [
  /\b\d{6}\b/,
  /\bpassword[\s:]+\S+/i,
  /\b4[0-9]{15}\b/,
  /\b5[1-5][0-9]{14}\b/,
  /cvv[\s:]+\d{3,4}/i,
];

// ===============================
// 😡 BASIC TOXIC FALLBACK
// ===============================

const TROLL_WORDS = [
  'idiot', 'stupid', 'moron', 'loser',
  'fuck you', 'kill', 'hate you', 'kys'
];

// ===============================
// 🧠 HELPERS
// ===============================

const normalize = (text) => text?.toLowerCase().trim() || '';

const containsSensitiveInfo = (text) => {
  return SENSITIVE_PATTERNS.some(p => p.test(text));
};

const basicToxicCheck = (text) => {
  return TROLL_WORDS.some(word => text.includes(word));
};

// ===============================
// 🤖 SINGLE GROQ CALL
// ===============================

const analyzeWithGroq = async (message, username) => {
  const prompt = `
You are a strict moderation system.

Analyze the message and return a JSON response ONLY.

Message: "${message}"

Tasks:
1. Detect if the message is toxic/abusive (troll)
2. Detect if it contains sensitive/private information
3. Generate a calm, respectful warning message if toxic

Rules:
- Toxic = insults, threats, harassment, abuse
- Sensitive = OTP, passwords, financial data, personal data
- Warning message should be polite, short, human-like
- If NOT toxic → warningMessage should be null

Return STRICT JSON format:

{
  "isTroll": boolean,
  "isSensitive": boolean,
  "severity": "low" | "medium" | "high",
  "warningMessage": string | null
}
`;

  const res = await fetch(
    'https://api.groq.com/openai/v1/chat/completions',
    {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${process.env.GROQ_API_KEY}`,
      },
      body: JSON.stringify({
        model: process.env.GROQ_MODEL || 'llama-3.1-8b-instant',
        messages: [{ role: 'user', content: prompt }],
        temperature: 0,
      }),
    }
  );

  if (!res.ok) {
    throw new Error(`Groq API error: ${res.status}`);
  }

  const data = await res.json();
  const raw = data?.choices?.[0]?.message?.content?.trim();

  try {
    return JSON.parse(raw);
  } catch (err) {
    throw new Error('Invalid JSON from Groq');
  }
};

// ===============================
// 💬 FALLBACK MESSAGE
// ===============================

const fallbackMessage = (username) => {
  return `Hey ${username}, let's keep the conversation respectful.`;
};

// ===============================
// 🎯 MAIN FUNCTION (v3)
// ===============================

const analyzeMessage = async (content, username = 'User') => {
  const result = {
    isSensitive: false,
    isTroll: false,
    severity: 'low',
    warningMessage: null,
  };

  if (!content) return result;

  const text = normalize(content);

  // ===============================
  // 🔥 PRIMARY: GROQ (single call)
  // ===============================

  if (process.env.GROQ_API_KEY) {
    try {
      const aiResult = await analyzeWithGroq(content, username);

      return {
        isSensitive: aiResult.isSensitive,
        isTroll: aiResult.isTroll,
        severity: aiResult.severity || 'low',
        warningMessage: aiResult.warningMessage,
      };

    } catch (err) {
      console.warn('[GROQ FAILED] Falling back:', err.message);
    }
  }

  // ===============================
  // 🧱 FALLBACK LOGIC
  // ===============================

  const isSensitive = containsSensitiveInfo(text);
  const isTroll = basicToxicCheck(text);

  return {
    isSensitive,
    isTroll,
    severity: isTroll ? 'medium' : 'low',
    warningMessage: isTroll ? fallbackMessage(username) : null,
  };
};

// ===============================
// 📦 EXPORT
// ===============================

export {
  analyzeMessage
};