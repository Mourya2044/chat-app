// trollDetection.js

const SENSITIVE_PATTERNS = [
  /\b\d{6}\b/, // 6-digit OTP
  /\botp[\s:]+(?=[a-z0-9]{4,8}\b)(?=.*[a-z])(?=.*\d)[a-z0-9]+\b/i, // Alphanumeric OTP
  /one[.\s-]?time[.\s-]?password/i,
  /\bpassword[\s:]+\S+/i,
  /\b4[0-9]{15}\b/,
  /\b5[1-5][0-9]{14}\b/,
  /\b[0-9]{4}[\s-][0-9]{4}[\s-][0-9]{4}[\s-][0-9]{4}\b/,
  /\b\d{3}-\d{2}-\d{4}\b/,
  /cvv[\s:]+\d{3,4}/i,
  /\biban[\s:]+[a-z]{2}\d{2}/i,
];

// ← No 'g' flag — regex with 'g' retains lastIndex state between calls
//   causing alternating true/false results on repeated tests
const TROLL_WORDS = [
  'idiot', 'stupid', 'dumb', 'moron', 'loser', 'trash', 'worthless',
  'shut up', 'go to hell', 'drop dead', 'get lost',
  'hate you', 'kill yourself', 'end yourself', 'kys',
];

const TROLL_THRESHOLD = 1;

const containsSensitiveInfo = (content) => {
  if (!content) return false;
  const lower = content.toLowerCase();
  return SENSITIVE_PATTERNS.some(pattern => pattern.test(lower));
};

const getTrollScore = (content) => {
  if (!content) return 0;
  const lower = content.toLowerCase();
  let score = 0;

  for (const word of TROLL_WORDS) {
    if (lower.includes(word)) {
      score++;
      console.log(`[TROLL] Matched: "${word}" | message: "${content}" | score: ${score}`);
    }
  }

  return score;
};

const getSoothingResponse = async (trollMessage, username) => {
  if (process.env.GEMINI_API_KEY) {
    try {
      const response = await callGemini(trollMessage, username);
      if (response) return response;
    } catch (e) {
      console.warn('[TROLL] Gemini failed, using fallback:', e.message);
    }
  }

  const soothingMessages = [
    `Hey ${username} 🌟 Looks like things might be getting a bit heated! Remember, everyone here is human and having their own day. Maybe take a breather and come back with good vibes?`,
    `${username}, we all have rough days sometimes 💙 This is a safe space for everyone. Let's keep the conversation kind and constructive!`,
    `Hey there ${username} — I noticed the energy in your message felt a bit tense. We're all here to connect and have a good time. What's on your mind? Maybe we can talk it through!`,
    `${username}, I see you're feeling strongly about something 🤗 That passion is great — let's channel it into a constructive conversation. Everyone here values your thoughts!`,
    `Just a gentle nudge, ${username} 😊 — let's keep this space welcoming for everyone. Sometimes rewording things can help us be heard better. You've got this!`,
  ];

  return soothingMessages[Math.floor(Math.random() * soothingMessages.length)];
};

const callGemini = async (message, username) => {
  const { default: fetch } = await import('node-fetch');

  const prompt = `A user named "${username}" sent this message in a group chat that was flagged for potentially harsh language: "${message}". 

Please write a SHORT, warm, and empathetic message (2-3 sentences max) from a chat bot to this user. The goal is to gently remind them to keep the conversation friendly, without lecturing them or being preachy. Be understanding and human. Don't repeat "I understand" too much. Keep it light and caring.`;

  const res = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/gemini-pro:generateContent?key=${process.env.GEMINI_API_KEY}`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [{ parts: [{ text: prompt }] }],
        generationConfig: { maxOutputTokens: 150, temperature: 0.7 },
      }),
    }
  );

  const data = await res.json();
  return data?.candidates?.[0]?.content?.parts?.[0]?.text || null;
};

const analyzeMessage = async (content, username) => {
  const result = {
    isSensitive: false,
    isTroll: false,
    soothingMessage: null,
  };

  if (!content) return result;

  result.isSensitive = containsSensitiveInfo(content);
  console.log(`[SENSITIVE] "${content}" → ${result.isSensitive}`);

  const trollScore = getTrollScore(content);
  console.log(`[TROLL] Final score: ${trollScore} (threshold: ${TROLL_THRESHOLD})`);

  if (trollScore >= TROLL_THRESHOLD) {
    result.isTroll = true;
    result.soothingMessage = await getSoothingResponse(content, username);
    console.log(`[TROLL] Soothing message: "${result.soothingMessage}"`);
  }

  return result;
};

export { analyzeMessage, containsSensitiveInfo, getTrollScore };