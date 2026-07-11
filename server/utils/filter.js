const FilterWord = require('../models/FilterWord');

// ─── Default hardcoded bad words by category ───────────────────────────────
const DEFAULT_WORDS = {
  profanity: [
    'fuck', 'shit', 'bitch', 'asshole', 'bastard', 'damn', 'crap', 'piss',
    'cock', 'dick', 'pussy', 'cunt', 'whore', 'slut', 'motherfucker', 'fucker',
    'nigger', 'nigga', 'chink', 'kike', 'spic', 'wetback', 'faggot', 'fag',
    'retard', 'moron', 'idiot', 'imbecile',
  ],
  'hate-speech': [
    'kill all', 'die you', 'go die', 'exterminate', 'genocide', 'ethnic cleansing',
    'white power', 'black power', 'race war', 'inferior race', 'sub-human',
    'hate muslims', 'hate christians', 'hate jews', 'hate hindus',
  ],
  scam: [
    'click here to win', 'you have won', 'prize money', 'lottery winner',
    'send money to', 'wire transfer', 'western union', 'bitcoin investment',
    'double your money', 'get rich quick', 'nigerian prince', 'inheritance funds',
    'unclaimed funds', 'bank transfer urgent', 'verify your account now',
    'limited time offer', 'act now', 'free money', 'easy cash',
  ],
  cyberbullying: [
    'kill yourself', 'kys', 'go kill yourself', 'you should die', 'nobody loves you',
    'everyone hates you', 'you are worthless', "you're worthless", 'end your life',
    'jump off', 'hang yourself', 'no one cares about you', 'loser',
    'ugly fat', 'fat ugly', 'commit suicide', 'self harm',
  ],
  spam: [
    'follow for follow', 'f4f', 'like for like', 'l4l', 'sub4sub', 'dm me now',
    'check my profile', 'visit my page', 'buy followers', 'instant followers',
    'click my link', 'promo code', 'exclusive deal',
  ],
};

// ─── Normalize text for matching ───────────────────────────────────────────
const normalizeText = (text) => {
  return (text || '')
    .toLowerCase()
    .replace(/[0-9]/g, (n) => {
      const map = { 0: 'o', 1: 'i', 3: 'e', 4: 'a', 5: 's', 7: 't' };
      return map[n] || n;
    })
    .replace(/[^a-z\s]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
};

// ─── Check text against a word/phrase ──────────────────────────────────────
const matchesWord = (normalizedText, word) => {
  const normalizedWord = normalizeText(word);
  // For multi-word phrases, use indexOf; for single words, use word boundary
  if (normalizedWord.includes(' ')) {
    return normalizedText.includes(normalizedWord);
  }
  // Use word boundary for single words
  try {
    const regex = new RegExp(`\\b${normalizedWord.replace(/[-/\\^$*+?.()|[\]{}]/g, '\\$&')}\\b`);
    return regex.test(normalizedText);
  } catch {
    return normalizedText.includes(normalizedWord);
  }
};

// ─── Main scan function ─────────────────────────────────────────────────────
/**
 * Scans text for harmful content.
 * @param {string|string[]} textInput - Text or array of texts to scan.
 * @returns {Promise<{ isFlagged: boolean, category: string|null, matchedWords: string[], reason: string }>}
 */
const scanText = async (textInput) => {
  const texts = Array.isArray(textInput) ? textInput : [textInput];
  const combined = texts.filter(Boolean).join(' ');
  const normalized = normalizeText(combined);

  const result = {
    isFlagged: false,
    category: null,
    matchedWords: [],
    reason: '',
  };

  if (!normalized) return result;

  // 1) Check against default hardcoded words
  for (const [category, words] of Object.entries(DEFAULT_WORDS)) {
    for (const word of words) {
      if (matchesWord(normalized, word)) {
        result.isFlagged = true;
        result.category = category;
        result.matchedWords.push(word);
        result.reason = `Detected ${category} content: "${word}"`;
        return result; // Return on first match for performance
      }
    }
  }

  // 2) Check against custom admin-defined filter words from DB
  try {
    const customWords = await FilterWord.find({ isActive: true }).lean();
    for (const fw of customWords) {
      if (matchesWord(normalized, fw.word)) {
        result.isFlagged = true;
        result.category = fw.category;
        result.matchedWords.push(fw.word);
        result.reason = `Detected ${fw.category} content: "${fw.word}"`;
        return result;
      }
    }
  } catch (err) {
    console.error('FilterWord DB check failed:', err.message);
  }

  return result;
};

/**
 * Client-side safe scan (no DB lookup, uses only default words).
 * For use in synchronous contexts or before DB is available.
 */
const scanTextSync = (textInput) => {
  const texts = Array.isArray(textInput) ? textInput : [textInput];
  const combined = texts.filter(Boolean).join(' ');
  const normalized = normalizeText(combined);

  const result = {
    isFlagged: false,
    category: null,
    matchedWords: [],
    reason: '',
  };

  if (!normalized) return result;

  for (const [category, words] of Object.entries(DEFAULT_WORDS)) {
    for (const word of words) {
      if (matchesWord(normalized, word)) {
        result.isFlagged = true;
        result.category = category;
        result.matchedWords.push(word);
        result.reason = `Detected ${category} content: "${word}"`;
        return result;
      }
    }
  }

  return result;
};

/**
 * Checks tag lists, text hashtags, or chat room keys against blocked tags.
 */
const scanForBlockedTags = async ({ tags = [], text = '', room = '' }) => {
  const BlockedTag = require('../models/BlockedTag');
  
  // Extract all tag candidates
  const candidates = new Set();
  
  // 1. Add direct tags (lowercased)
  tags.forEach(t => {
    if (t) candidates.add(t.toLowerCase().trim().replace(/#/g, ''));
  });

  // 2. Extract hashtags from text (e.g. #politics -> politics)
  if (text) {
    const hashRegex = /#([a-zA-Z0-9_\-]+)/g;
    let match;
    while ((match = hashRegex.exec(text)) !== null) {
      candidates.add(match[1].toLowerCase());
    }
  }

  // 3. Extract tag from room key (e.g. tag:politics -> politics)
  if (room && room.startsWith('tag:')) {
    candidates.add(room.substring(4).toLowerCase().trim());
  }

  if (candidates.size === 0) {
    return { isFlagged: false, blockedTags: [] };
  }

  // Query database for matching blocked tags
  const candidateArray = Array.from(candidates);
  try {
    const matches = await BlockedTag.find({ tag: { $in: candidateArray } }).lean();

    if (matches.length > 0) {
      return {
        isFlagged: true,
        blockedTags: matches.map(m => m.tag)
      };
    }
  } catch (err) {
    console.error('BlockedTag DB check failed:', err.message);
  }

  return { isFlagged: false, blockedTags: [] };
};

module.exports = { scanText, scanTextSync, scanForBlockedTags, DEFAULT_WORDS };
