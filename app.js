const startButton = document.getElementById("startButton");
const replayButton = document.getElementById("replayButton");
const transcriptText = document.getElementById("transcriptText");
const statusText = document.getElementById("statusText");
const statusDot = document.getElementById("statusDot");
const guessText = document.getElementById("guessText");
const guessConfidence = document.getElementById("guessConfidence");
const guessMeta = document.getElementById("guessMeta");

const SpeechRecognition =
  window.SpeechRecognition || window.webkitSpeechRecognition;
const synth = window.speechSynthesis;
const LOCAL_RECOGNITION_MIME_CANDIDATES = [
  "audio/webm;codecs=opus",
  "audio/webm",
  "audio/ogg;codecs=opus",
  "audio/mp4"
];
const LOCAL_RECOGNITION_AUTO_STOP_MS = 120000;
const LOCAL_RECOGNITION_SILENCE_STOP_MS = 15000;
const LOCAL_RECOGNITION_MIN_RECORDING_MS = 450;
const LOCAL_RECOGNITION_CHUNK_MS = 200;
const LOCAL_RECOGNITION_SILENCE_RMS = 0.01;
const LOCAL_RECOGNITION_SPEECH_RMS = 0.014;
const LOCAL_RECOGNITION_NOISE_SAMPLE_MS = 250;
const LOCAL_RECOGNITION_SPEECH_NOISE_RATIO = 1.6;
const LOCAL_RECOGNITION_MIN_SPEECH_MS = 120;
const LOCAL_RECOGNITION_MIN_PEAK_RMS = 0.012;
const LOCAL_RECOGNITION_MIN_AUDIO_BYTES = 1400;
const LOCAL_RECOGNITION_AUDIO_BITS_PER_SECOND = 48000;
const SAMPLE_ENTRIES = Array.isArray(window.MONTH2_CORPUS)
  ? window.MONTH2_CORPUS.map((entry, index) => ({
      id: entry.id || `S${String(index + 1).padStart(3, "0")}`,
      sourceId: entry.originalId || entry.id || `S${String(index + 1).padStart(3, "0")}`,
      groupId: entry.groupId || "",
      utteranceType: entry.utteranceType || "",
      text: entry.text
    }))
  : (window.SAMPLE_SENTENCES || []).map((text, index) => ({
      id: `S${String(index + 1).padStart(3, "0")}`,
      sourceId: `S${String(index + 1).padStart(3, "0")}`,
      groupId: "",
      utteranceType: "",
      text
    }));
const UI_STATES = {
  READY: "ready",
  LISTENING: "listening",
  PROCESSING: "processing",
  SPEAKING: "speaking",
  ERROR: "error",
  UNSUPPORTED: "unsupported"
};
const STATUS_MESSAGES = {
  [UI_STATES.READY]: "Sẵn sàng để bắt đầu",
  [UI_STATES.LISTENING]: "Đang thu âm local, app sẽ tự xử lý sau 15 giây im lặng",
  [UI_STATES.PROCESSING]: "Đang xử lý, sẽ tự phát lại sau 0.5 giây",
  [UI_STATES.SPEAKING]: "Đang phát lại câu vừa nhận diện",
  [UI_STATES.ERROR]: "Đã có lỗi xảy ra",
  [UI_STATES.UNSUPPORTED]: "Trình duyệt này chưa hỗ trợ thu âm local"
};
const MIN_CORRECTION_SCORE = 0.45;
const AUTO_CORRECTION_SCORE = 0.7;
const ASK_CONFIRMATION_SCORE = 0.82;
const CORRECTION_AUTO_CONFIDENCE = 0.58;
const SINGLE_TOKEN_CORRECTION_AUTO_CONFIDENCE = 0.78;
const CORRECTION_SUGGEST_CONFIDENCE = 0.42;
const MAX_CORRECTION_NGRAM = 3;
const MAX_PHRASE_NGRAM = 5;
const PHRASE_AUTO_CONFIDENCE = 0.68;
const PHRASE_SUGGEST_CONFIDENCE = 0.5;
const PHRASE_DATASET_URL = "data/phrases/phrases.json";
const SHORT_PHRASE_MAX_WORDS = 3;
const SHORT_PHRASE_AUTO_CONFIDENCE = 0.74;
const SHORT_PHRASE_ACCEPT_CONFIDENCE = 0.52;
const SHORT_PHRASE_REVIEW_BOOST_PER_COUNT = 0.025;
const SHORT_PHRASE_MAX_REVIEW_BOOST = 0.18;
const SHORT_PHRASE_REPEAT_THRESHOLD = 3;
const LEARNED_AUDIO_CORRECTION_SCORE = 0.66;
const VOICE_TEMPLATE_CORRECTION_SCORE = 0.68;
const FAST_AUDIO_ACCEPT_SCORE = 0.78;
const FAST_AUDIO_STABLE_ACCEPT_SCORE = 0.86;
const LOCKED_LEARNED_AUDIO_SCORE = 0.86;
const AUDIO_MATCH_MIN_MARGIN = 0.08;
const AUDIO_MATCH_LOCKED_MIN_MARGIN = 0.03;
const TEXT_MATCH_MIN_MARGIN = 0.1;
const SHORT_PHRASE_TEXT_MATCH_MIN_MARGIN = 0.14;
const SHORT_PHRASE_MIN_RAW_SCORE = 0.5;
const SHORT_PHRASE_MIN_RAW_OVERLAP = 0.5;
const SENTENCE_TEXT_MATCH_MIN_MARGIN = 0.1;
const AI_ARBITER_TIMEOUT_MS = 1800;
const AI_ARBITER_MIN_AUTOSPEAK_CONFIDENCE = 0.82;
const FAST_AUDIO_WAIT_MS = 450;
const LEARNED_AUDIO_FAST_WAIT_MS = 160;
const LEARNED_AUDIO_BORDERLINE_WAIT_MS = 260;
const FREE_SPEECH_STT_SCORE = 0.72;
const SHORT_TRANSCRIPT_AUDIO_CORRECTION_SCORE = 0.88;
const MIN_MATCH_WORD_COUNT = 4;
const MIN_MATCH_TEXT_LENGTH = 12;
const KEYWORD_PREFILTER_LIMIT = 10;
const NORMALIZED_SAMPLE_ENTRIES = new WeakMap();
const SPEECH_CORRECTIONS_STORAGE_KEY = "speech_corrections.json";
const SPEECH_REVIEWS_STORAGE_KEY = "voicecoach_speech_reviews";
const SPEECH_CONTEXT_STORAGE_KEY = "voicecoach_context_memory";
const SPEECH_TRUST_STORAGE_KEY = "voicecoach_sample_trust";
const PERSONAL_PHRASEBOOK_STORAGE_KEY = "voicecoach_personal_phrasebook";
const PERSONAL_LEARNING_MODE_STORAGE_KEY = "voicecoach_learning_mode";
const PERSONAL_CONFUSION_MEMORY_STORAGE_KEY = "voicecoach_confusion_memory";
const RECORDER_STORAGE_KEY = "voiceCoachDatasetRecorder";
const CONTEXT_MEMORY_MAX_ITEMS = 40;
const CONTEXT_RECENT_LIMIT = 8;
const CONTEXT_PHRASE_BOOST_MAX = 0.12;
const PERSONAL_PHRASE_LOCK_COUNT = 3;
const PERSONAL_PHRASE_FAST_LEARN_COUNT = 2;
const PERSONAL_PHRASE_PROMOTE_COUNT = 5;
const PERSONAL_PHRASE_MAX_ITEMS = 300;
const PERSONAL_CONFUSION_MAX_ITEMS = 220;
const PERSONAL_CONFUSION_INPUT_SCORE = 0.72;
const PERSONAL_CONFUSION_EXACT_LOCK_COUNT = 2;
const PERSONAL_CONFUSION_FUZZY_LOCK_COUNT = 3;
const PERSONAL_CONFUSION_LOCK_INPUT_SCORE = 0.84;
const PERSONAL_CONFUSION_LOCK_CONFIDENCE = 0.9;
const PERSONAL_CORRECTION_MIN_LEARN_CONFIDENCE = 0.62;
const PERSONAL_AUDIO_MIN_LEARN_CONFIDENCE = 0.62;
const PERSONAL_AUDIO_PROMOTE_COUNT = 3;
const TRUST_CORRECT_BOOST = 0.14;
const TRUST_WRONG_PENALTY = 0.14;
const TRUST_DEFAULT_SCORE = 0.5;
const SAFE_MODE_MIN_AUTO_CONFIDENCE = 0.82;
const DEFAULT_PHRASE_DATASET = [
  "cảm ơn",
  "cảm ơn bạn",
  "xin chào",
  "chào bạn",
  "tôi muốn",
  "tôi cần",
  "giúp tôi",
  "khỏe không",
  "hôm nay",
  "đi làm",
  "ở nhà",
  "một chút",
  "xin lỗi",
  "không sao",
  "vui lòng",
  "nói chậm",
  "nhắc lại",
  "nghe rõ",
  "tôi đau",
  "tôi mệt"
];
const PERSONAL_CORRECTION_RULES = [
  { wrong: "bài", correct: "bạn" },
  { wrong: "để", correct: "đã" },
  { wrong: "hổ", correct: "hòa" },
  { wrong: "con con", correct: "tôi tên" }
];
const CONFIRMED_REVIEW_TAKES = new Set(["review-correct", "review-confirmed"]);

let recognition;
let recognizedTranscript = "";
let finalTranscript = "";
let interimTranscript = "";
let appState = hasLocalRecognitionSupport() ? UI_STATES.READY : UI_STATES.UNSUPPORTED;
let selectedVoice = null;
let matchedSentence = null;
let lastRecognitionResult = null;
let autoReplayTimer = null;
let activePlaybackId = 0;
let hasFinalResultInCurrentSession = false;
let hadRecognitionError = false;
let localRecognitionRecorder = null;
let localRecognitionStream = null;
let localRecognitionChunks = [];
let localRecognitionStopTimer = null;
let lastLocalRecognitionBlob = null;
let localRecognitionAudioContext = null;
let localRecognitionAnalyser = null;
let localRecognitionSilenceTimer = null;
let localRecognitionLevelTimer = null;
let localRecognitionStartedAt = 0;
let localRecognitionTiming = null;
let localRecognitionAudioStats = null;
let voiceTemplateWarmupPromise = null;
let learnedCorrections = loadCorrections();
let correctionRuleCache = null;
let phraseDatasetEntries = [];
let phraseDatasetLoadPromise = null;
let phraseDatasetLoadedFromFile = false;
let phraseDatasetByLength = new Map();
let phraseDatasetExactMap = new Map();
let reviewPanelElements = null;
let personalLearningMode = loadPersonalLearningMode();

function readLocalJson(key, fallback) {
  try {
    const raw = window.localStorage.getItem(key);
    return raw ? JSON.parse(raw) : fallback;
  } catch (error) {
    return fallback;
  }
}

function writeLocalJson(key, value) {
  window.localStorage.setItem(key, JSON.stringify(value, null, 2));
}

function loadPersonalLearningMode() {
  const parsed = readLocalJson(PERSONAL_LEARNING_MODE_STORAGE_KEY, {
    mode: "learning",
    debug: false
  });

  if (!parsed || typeof parsed !== "object") {
    return { mode: "learning", debug: false };
  }

  return {
    mode: "learning",
    debug: false
  };
}

function savePersonalLearningMode(settings) {
  personalLearningMode = {
    mode: settings?.mode === "stability" ? "stability" : "learning",
    debug: Boolean(settings?.debug)
  };
  writeLocalJson(PERSONAL_LEARNING_MODE_STORAGE_KEY, personalLearningMode);
  renderPipelineDebugPanel();
  return personalLearningMode;
}

function isLearningFrozen() {
  return false;
}

function canLearnFromReview(confidence = 0, minimumConfidence = PERSONAL_CORRECTION_MIN_LEARN_CONFIDENCE) {
  return !isLearningFrozen() && Number(confidence || 0) >= minimumConfidence;
}

function loadContextMemory() {
  const parsed = readLocalJson(SPEECH_CONTEXT_STORAGE_KEY, null);
  if (!parsed || typeof parsed !== "object") {
    return { recent: [], phrases: {}, topics: {}, updatedAt: "" };
  }

  return {
    recent: Array.isArray(parsed.recent) ? parsed.recent.slice(0, CONTEXT_RECENT_LIMIT) : [],
    phrases: typeof parsed.phrases === "object" && parsed.phrases ? parsed.phrases : {},
    topics: typeof parsed.topics === "object" && parsed.topics ? parsed.topics : {},
    updatedAt: parsed.updatedAt || ""
  };
}

function loadPersonalPhrasebook() {
  const parsed = readLocalJson(PERSONAL_PHRASEBOOK_STORAGE_KEY, {});
  return parsed && typeof parsed === "object" ? parsed : {};
}

function loadConfusionMemory() {
  const parsed = readLocalJson(PERSONAL_CONFUSION_MEMORY_STORAGE_KEY, { pairs: [] });
  return Array.isArray(parsed?.pairs) ? parsed : { pairs: [] };
}

function saveConfusionMemory(memory) {
  const pairs = Array.isArray(memory?.pairs) ? memory.pairs : [];
  writeLocalJson(PERSONAL_CONFUSION_MEMORY_STORAGE_KEY, {
    pairs: pairs
      .slice()
      .sort((left, right) => {
        const leftWeight = Number(left.count || 0) - Number(left.dismissedCount || 0);
        const rightWeight = Number(right.count || 0) - Number(right.dismissedCount || 0);
        return rightWeight - leftWeight;
      })
      .slice(0, PERSONAL_CONFUSION_MAX_ITEMS)
  });
}

function savePersonalPhrasebook(phrasebook) {
  const entries = Object.entries(phrasebook || {})
    .filter(([, record]) => record?.text)
    .sort((left, right) => {
      const leftScore =
        Number(left[1].correctCount || 0) * 2 -
        Number(left[1].wrongCount || 0) * 3 +
        (left[1].locked ? 10 : 0);
      const rightScore =
        Number(right[1].correctCount || 0) * 2 -
        Number(right[1].wrongCount || 0) * 3 +
        (right[1].locked ? 10 : 0);
      return rightScore - leftScore;
    })
    .slice(0, PERSONAL_PHRASE_MAX_ITEMS);

  writeLocalJson(PERSONAL_PHRASEBOOK_STORAGE_KEY, Object.fromEntries(entries));
}

function updatePersonalPhrasebook(text, options = {}) {
  const normalized = normalizeText(text);
  const displayText = normalizeDisplayText(text);

  if (!normalized || !displayText) {
    return null;
  }

  const phrasebook = loadPersonalPhrasebook();
  const existing = phrasebook[normalized] || {
    text: displayText,
    normalized,
    correctCount: 0,
    wrongCount: 0,
    locked: false,
    createdAt: new Date().toISOString()
  };

  existing.text = displayText;
  existing.correctCount =
    Number(existing.correctCount || 0) + Number(options.correctCount || 0);
  existing.wrongCount =
    Number(existing.wrongCount || 0) + Number(options.wrongCount || 0);
  existing.lastSource = options.source || existing.lastSource || "review";
  existing.updatedAt = new Date().toISOString();

  if (options.locked || existing.correctCount >= PERSONAL_PHRASE_LOCK_COUNT) {
    existing.locked = true;
  }
  existing.promoted =
    Number(existing.correctCount || 0) >= PERSONAL_PHRASE_PROMOTE_COUNT &&
    Number(existing.wrongCount || 0) <= 1;

  if (existing.wrongCount >= 2 && existing.wrongCount >= existing.correctCount) {
    existing.locked = false;
  }

  phrasebook[normalized] = existing;
  savePersonalPhrasebook(phrasebook);
  return existing;
}

function getPersonalPhrasebookRecords() {
  return Object.values(loadPersonalPhrasebook())
    .filter((record) => record?.text && Number(record.correctCount || 0) > Number(record.wrongCount || 0))
    .sort((left, right) => {
      if (Boolean(right.locked) !== Boolean(left.locked)) {
        return Number(Boolean(right.locked)) - Number(Boolean(left.locked));
      }

      return Number(right.correctCount || 0) - Number(left.correctCount || 0);
    });
}

function recordPersonalConfusion(heardText, wrongGuessText, correctedText) {
  const heardNormalized = normalizeText(heardText);
  const wrongNormalized = normalizeText(wrongGuessText);
  const correctNormalized = normalizeText(correctedText);

  if (
    !heardNormalized ||
    !wrongNormalized ||
    !correctNormalized ||
    wrongNormalized === correctNormalized
  ) {
    return null;
  }

  const memory = loadConfusionMemory();
  const key = `${heardNormalized}=>${wrongNormalized}=>${correctNormalized}`;
  const existing = memory.pairs.find((item) => item.key === key) || {
    key,
    heardText: normalizeDisplayText(heardText),
    wrongGuessText: normalizeDisplayText(wrongGuessText),
    correctedText: normalizeDisplayText(correctedText),
    heardNormalized,
    wrongNormalized,
    correctNormalized,
    count: 0,
    dismissedCount: 0,
    createdAt: new Date().toISOString()
  };

  existing.count = Number(existing.count || 0) + 1;
  existing.lastSeenAt = new Date().toISOString();

  if (!memory.pairs.includes(existing)) {
    memory.pairs.push(existing);
  }
  saveConfusionMemory(memory);

  return existing;
}

function getPersonalConfusionAdjustment(inputNormalized, candidateNormalized, pairs = null) {
  if (!inputNormalized || !candidateNormalized) {
    return { adjustment: 0, sources: [] };
  }

  let adjustment = 0;
  const sources = new Set();

  for (const pair of pairs || loadConfusionMemory().pairs || []) {
    const evidence = Math.max(Number(pair.count || 0) - Number(pair.dismissedCount || 0), 0);
    if (!evidence) {
      continue;
    }

    const inputScore = getMatchScore(inputNormalized, pair.heardNormalized || "");
    if (inputScore < PERSONAL_CONFUSION_INPUT_SCORE) {
      continue;
    }

    if (candidateNormalized === pair.wrongNormalized) {
      adjustment -= Math.min(0.42, 0.12 + evidence * 0.06);
      sources.add("negative confusion memory");
    }

    if (candidateNormalized === pair.correctNormalized) {
      adjustment += Math.min(0.24, 0.07 + evidence * 0.04);
      sources.add("positive confusion memory");
    }
  }

  return { adjustment, sources: Array.from(sources) };
}

function getLockedPersonalConfusionCorrection(inputText, pairs = null) {
  const inputNormalized = normalizeText(inputText);

  if (!inputNormalized) {
    return null;
  }

  let bestPair = null;
  let bestScore = 0;
  const considerPair = (pair, evidence) => {
    if (!pair.correctNormalized) {
      return;
    }

    const heardScore = getMatchScore(inputNormalized, pair.heardNormalized || "");
    const wrongScore = getMatchScore(inputNormalized, pair.wrongNormalized || "");
    const inputScore = Math.max(heardScore, wrongScore);
    const exactInputMatch =
      inputNormalized === pair.heardNormalized || inputNormalized === pair.wrongNormalized;
    const requiredEvidence = exactInputMatch
      ? PERSONAL_CONFUSION_EXACT_LOCK_COUNT
      : PERSONAL_CONFUSION_FUZZY_LOCK_COUNT;

    if (evidence < requiredEvidence) {
      return;
    }

    if (
      inputScore < PERSONAL_CONFUSION_LOCK_INPUT_SCORE &&
      !exactInputMatch
    ) {
      return;
    }

    const score = inputScore + Math.min(evidence, 8) * 0.04;
    if (!bestPair || score > bestScore) {
      bestPair = {
        ...pair,
        count: evidence,
        dismissedCount: 0
      };
      bestScore = score;
    }
  };

  for (const pair of pairs || loadConfusionMemory().pairs || []) {
    const evidence = Math.max(Number(pair.count || 0) - Number(pair.dismissedCount || 0), 0);
    considerPair(pair, evidence);
  }

  const reviewEvidence = new Map();
  for (const review of loadReviews()) {
    const heardNormalized = normalizeText(review?.heardText || "");
    const wrongGuessNormalized = normalizeText(
      review?.matchedText || review?.playbackTranscript || review?.heardText || ""
    );
    const correctNormalized = normalizeText(review?.correctedText || "");

    if (!heardNormalized || !correctNormalized || heardNormalized === correctNormalized) {
      continue;
    }

    const key = `${heardNormalized}=>${wrongGuessNormalized}=>${correctNormalized}`;
    const existing = reviewEvidence.get(key) || {
      heardText: normalizeDisplayText(review.heardText),
      correctedText: normalizeDisplayText(review.correctedText),
      wrongGuessText: normalizeDisplayText(
        review.matchedText || review.playbackTranscript || review.heardText
      ),
      heardNormalized,
      wrongNormalized: wrongGuessNormalized || heardNormalized,
      correctNormalized,
      count: 0,
      dismissedCount: 0
    };
    existing.count += 1;
    reviewEvidence.set(key, existing);
  }

  for (const pair of reviewEvidence.values()) {
    considerPair(pair, Number(pair.count || 0));
  }

  if (!bestPair) {
    return null;
  }

  const evidence = Math.max(
    Number(bestPair.count || 0) - Number(bestPair.dismissedCount || 0),
    0
  );

  return {
    correctedText: bestPair.correctedText || normalizeDisplayText(bestPair.correctNormalized),
    heardText: bestPair.heardText || inputText,
    wrongGuessText: bestPair.wrongGuessText || "",
    confidence: Math.min(
      PERSONAL_CONFUSION_LOCK_CONFIDENCE +
        Math.min(evidence - PERSONAL_CONFUSION_EXACT_LOCK_COUNT, 5) * 0.02,
      0.98
    ),
    evidence,
    pair: bestPair
  };
}

function saveContextMemory(memory) {
  const phraseEntries = Object.entries(memory.phrases || {})
    .sort((left, right) => Number(right[1]?.count || 0) - Number(left[1]?.count || 0))
    .slice(0, CONTEXT_MEMORY_MAX_ITEMS);
  const topicEntries = Object.entries(memory.topics || {})
    .sort((left, right) => Number(right[1]?.count || 0) - Number(left[1]?.count || 0))
    .slice(0, CONTEXT_MEMORY_MAX_ITEMS);

  writeLocalJson(SPEECH_CONTEXT_STORAGE_KEY, {
    recent: (memory.recent || []).slice(0, CONTEXT_RECENT_LIMIT),
    phrases: Object.fromEntries(phraseEntries),
    topics: Object.fromEntries(topicEntries),
    updatedAt: new Date().toISOString()
  });
}

function updateContextMemory(text, source = "recognition") {
  const normalized = normalizeText(text);
  const tokens = tokenizeText(normalized);

  if (!normalized || !tokens.length) {
    return null;
  }

  const memory = loadContextMemory();
  const now = new Date().toISOString();
  memory.recent = [
    { text: normalizeDisplayText(text), normalized, source, createdAt: now },
    ...(memory.recent || []).filter((item) => item.normalized !== normalized)
  ].slice(0, CONTEXT_RECENT_LIMIT);

  const phraseRecord = memory.phrases[normalized] || { text: normalizeDisplayText(text), count: 0 };
  phraseRecord.count = Number(phraseRecord.count || 0) + 1;
  phraseRecord.lastUsed = now;
  phraseRecord.source = source;
  memory.phrases[normalized] = phraseRecord;

  for (const token of tokens) {
    const topicRecord = memory.topics[token] || { token, count: 0 };
    topicRecord.count = Number(topicRecord.count || 0) + 1;
    topicRecord.lastUsed = now;
    memory.topics[token] = topicRecord;
  }

  saveContextMemory(memory);
  return memory;
}

function getContextBoost(candidateText) {
  const normalized = normalizeText(candidateText);
  const candidateTokens = tokenizeText(normalized);
  if (!normalized || !candidateTokens.length) {
    return { boost: 0, sources: [] };
  }

  const memory = loadContextMemory();
  const sources = [];
  let boost = 0;
  const phraseRecord = memory.phrases?.[normalized];
  if (phraseRecord) {
    boost += Math.min(Number(phraseRecord.count || 1) * 0.018, 0.075);
    sources.push("frequent phrase");
  }

  const recentMatch = (memory.recent || []).find((item) => item.normalized === normalized);
  if (recentMatch) {
    boost += 0.045;
    sources.push("recent phrase");
  }

  let topicHits = 0;
  for (const token of candidateTokens) {
    if (memory.topics?.[token]) {
      topicHits += 1;
    }
  }

  if (topicHits) {
    boost += Math.min((topicHits / candidateTokens.length) * 0.045, 0.045);
    sources.push("recent topic");
  }

  return {
    boost: Math.min(boost, CONTEXT_PHRASE_BOOST_MAX),
    sources: Array.from(new Set(sources))
  };
}

function loadSampleTrustStore() {
  const parsed = readLocalJson(SPEECH_TRUST_STORAGE_KEY, {});
  return parsed && typeof parsed === "object" ? parsed : {};
}

function saveSampleTrustStore(store) {
  writeLocalJson(SPEECH_TRUST_STORAGE_KEY, store);
  window.voiceTemplateMatcher?.setSampleTrustStore?.(store);
}

function getTrustKeyFromMatch(match) {
  if (!match) {
    return "";
  }

  return match.relativePath || match.fileName || match.sourceSentenceId || match.sentenceId || "";
}

function updateSampleTrustFromReview(isCorrect) {
  const key = getTrustKeyFromMatch(matchedSentence?.match);
  if (!key) {
    return null;
  }

  const store = loadSampleTrustStore();
  const existing = store[key] || {
    audio: key,
    correctCount: 0,
    wrongCount: 0,
    trustScore: TRUST_DEFAULT_SCORE,
    lastConfirmed: ""
  };

  if (isCorrect) {
    existing.correctCount = Number(existing.correctCount || 0) + 1;
    existing.lastConfirmed = new Date().toISOString();
  } else {
    existing.wrongCount = Number(existing.wrongCount || 0) + 1;
    existing.lastWrong = new Date().toISOString();
  }

  const evidence = existing.correctCount + existing.wrongCount;
  const successRate = evidence ? existing.correctCount / evidence : TRUST_DEFAULT_SCORE;
  const decayPenalty = Math.min(Number(existing.wrongCount || 0) * 0.035, 0.18);
  const delta = isCorrect ? TRUST_CORRECT_BOOST : -TRUST_WRONG_PENALTY;
  existing.trustScore = Math.max(
    0.05,
    Math.min(
      0.99,
      successRate * 0.72 +
        TRUST_DEFAULT_SCORE * 0.18 +
        existing.trustScore * 0.1 +
        delta -
        decayPenalty
    )
  );
  existing.trusted =
    Number(existing.correctCount || 0) >= PERSONAL_AUDIO_PROMOTE_COUNT &&
    Number(existing.wrongCount || 0) <= 1;
  existing.unstable =
    Number(existing.wrongCount || 0) >= 2 &&
    Number(existing.wrongCount || 0) >= Number(existing.correctCount || 0);
  existing.updatedAt = new Date().toISOString();
  store[key] = existing;
  saveSampleTrustStore(store);
  return existing;
}

function emitRecognitionPreview(transcriptValue, mode = "interim") {
  window.dispatchEvent(
    new CustomEvent("voicecoach:recognition-preview", {
      detail: {
        transcript: transcriptValue,
        mode,
        createdAt: new Date().toISOString()
      }
    })
  );
}

function hasSpeechPlayback() {
  return typeof window.SpeechSynthesisUtterance !== "undefined" && !!synth;
}

function hasLocalRecognitionSupport() {
  return (
    typeof window.MediaRecorder !== "undefined" &&
    !!navigator.mediaDevices &&
    typeof navigator.mediaDevices.getUserMedia === "function"
  );
}

function getPreferredLocalRecognitionMimeType() {
  if (typeof window.MediaRecorder === "undefined") {
    return "";
  }

  for (const mimeType of LOCAL_RECOGNITION_MIME_CANDIDATES) {
    if (window.MediaRecorder.isTypeSupported(mimeType)) {
      return mimeType;
    }
  }

  return "";
}

function getCurrentSpeakerIdForLocalRecognition() {
  const speakerInput = document.getElementById("speakerIdInput");
  const value = speakerInput?.value || "user01";
  const sanitized = value
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9_-]/g, "");

  return sanitized || "user01";
}

function getAllowedSentenceIdsForLocalRecognition() {
  const mode = new URL(window.location.href).searchParams.get("mode");
  const practiceMode = mode === "practice" || new URL(window.location.href).searchParams.get("practice") === "1";

  if (!practiceMode) {
    return [];
  }

  return (
    window.voiceRecorderControls?.getCurrentRecognitionSentenceIds?.() ||
    window.voiceRecorderControls?.getCurrentPackSentenceIds?.() ||
    []
  );
}

function getCandidateEntriesForLocalRecognition() {
  const allowedSentenceIds = new Set(getAllowedSentenceIdsForLocalRecognition());

  if (!allowedSentenceIds.size) {
    return SAMPLE_ENTRIES;
  }

  return SAMPLE_ENTRIES.filter(
    (entry) => allowedSentenceIds.has(entry.id) || allowedSentenceIds.has(entry.sourceId)
  );
}

function getCandidateSentenceEntriesForLocalRecognition() {
  return getCandidateEntriesForLocalRecognition().filter((entry) => {
    const tokenCount = tokenizeText(entry.text).length;
    return entry.utteranceType === "long" || entry.groupId === "LONG" || tokenCount > SHORT_PHRASE_MAX_WORDS;
  });
}

function getCurrentTargetEntryForLocalRecognition() {
  const recorderEntry = window.voiceRecorderControls?.getCurrentEntry?.();

  if (!recorderEntry?.text) {
    return null;
  }

  return {
    id: recorderEntry.id || "",
    sourceId: recorderEntry.originalId || recorderEntry.sourceId || recorderEntry.id || "",
    text: recorderEntry.text
  };
}

function resolveSentenceMetadataForText(text) {
  const normalizedText = normalizeVietnameseText(text);
  const currentTarget = getCurrentTargetEntryForLocalRecognition();

  if (currentTarget && normalizeVietnameseText(currentTarget.text) === normalizedText) {
    return {
      sentenceId: currentTarget.id,
      sourceSentenceId: currentTarget.sourceId
    };
  }

  const exactEntry = SAMPLE_ENTRIES.find(
    (entry) => normalizeVietnameseText(entry.text) === normalizedText
  );

  if (exactEntry) {
    return {
      sentenceId: exactEntry.id,
      sourceSentenceId: exactEntry.sourceId
    };
  }

  const textMatch = findBestMatch(text, SAMPLE_ENTRIES);
  if (textMatch?.match && textMatch.confidence >= 0.82) {
    return {
      sentenceId: textMatch.match.id,
      sourceSentenceId: textMatch.match.sourceId
    };
  }

  return null;
}

function setIndicatorState(state) {
  statusDot.className = `status-dot ${state}`;
}

function updateControls() {
  startButton.textContent =
    appState === UI_STATES.LISTENING ? "Dừng nghe" : "Bắt đầu nói";
  startButton.disabled =
    !hasLocalRecognitionSupport() ||
    appState === UI_STATES.PROCESSING ||
    appState === UI_STATES.UNSUPPORTED;
  replayButton.disabled =
    !finalTranscript || !hasSpeechPlayback() || appState === UI_STATES.LISTENING;
}

function setAppState(state, message = STATUS_MESSAGES[state]) {
  appState = state;
  statusText.textContent = message;
  setIndicatorState(state);
  updateControls();
}

function renderTranscript(value, mode = "final") {
  const transcriptValue = value.trim();

  if (!transcriptValue) {
    transcriptText.textContent =
      "Chưa có nội dung. Hãy nhấn “Bắt đầu nói” và đọc một câu.";
    transcriptText.className = "placeholder-text";
    return;
  }

  transcriptText.textContent = transcriptValue;
  transcriptText.className =
    mode === "interim" ? "transcript-interim" : "transcript-value";
}

function renderStableTranscript() {
  if (recognizedTranscript) {
    renderTranscript(recognizedTranscript, "final");
    return;
  }

  renderTranscript("");
}

function renderMatchedSentence(match, usesMatchForPlayback = false) {
  if (!match) {
    guessText.textContent =
      "Chưa có gợi ý. Ứng dụng sẽ thử đoán câu gần nhất trong bộ câu mẫu.";
    guessText.className = "placeholder-text";
    guessConfidence.textContent = "--";
    guessMeta.textContent =
      "Độ khớp: chưa có dữ liệu.";
    renderLearningReviewPanel();
    return;
  }

  guessText.textContent = usesMatchForPlayback
    ? match.correctedText
    : match.personalizedCorrectedText || match.lightlyCorrectedText || match.rawText || match.correctedText;
  guessText.className = "guess-value";
  guessConfidence.textContent = `${Math.round(match.confidence * 100)}%`;
  const phraseCorrectionTextValue = match.appliedPhraseCorrections?.length
    ? ` Sửa phrase: ${match.appliedPhraseCorrections
        .map(
          (rule) =>
            `"${rule.wrong}" -> "${rule.correct}" (${rule.ngramSize || 1}g, ${Math.round(
              (rule.confidence || 0) * 100
            )}%)`
        )
        .join(", ")}.`
    : "";
  const lightCorrectionText = match.appliedPersonalCorrections?.length
    ? ` Sửa token/cụm: ${match.appliedPersonalCorrections
        .map(
          (rule) =>
            `"${rule.wrong}" -> "${rule.correct}" (${rule.ngramSize || 1}g, ${Math.round(
              (rule.confidence || 0) * 100
            )}%)`
        )
        .join(", ")}.`
    : "";
  const suggestedCorrectionText = match.suggestedPersonalCorrections?.length
    ? ` Gợi ý sửa chưa áp dụng: ${match.suggestedPersonalCorrections
        .map(
          (rule) =>
            `"${rule.wrong}" -> "${rule.correct}" (${rule.ngramSize || 1}g, ${Math.round(
              (rule.confidence || 0) * 100
            )}%)`
        )
        .join(", ")}.`
    : "";
  const correctionLayerText =
    match.personalizedCorrectedText && match.personalizedCorrectedText !== (match.rawText || match.originalText)
      ? ` Corrected text: "${match.personalizedCorrectedText}".`
      : "";
  const debugText = match.debugText ? ` ${match.debugText}` : "";
  const keywordText =
    typeof match.keywordMatchCount === "number"
      ? ` Từ trùng: ${match.keywordMatchCount}${
          match.keywordMatchWords?.length ? ` (${match.keywordMatchWords.join(", ")})` : ""
        }.`
      : "";
  const topCandidateText = match.topCandidates?.length
    ? ` Top candidates: ${match.topCandidates
        .slice(0, 3)
        .map(
          (candidate) =>
            `${candidate.sourceId || candidate.id} ${Math.round(candidate.score * 100)}%/${
              candidate.keywordMatchCount
            } từ`
        )
        .join(", ")}.`
    : "";
  const inputTypeText = match.inputType
    ? ` Input type: ${match.inputType === "short_phrase" ? "short phrase" : "sentence"}.`
    : "";
  const engineText = match.engineUsed ? ` Engine used: ${match.engineUsed}.` : "";
  const learningSourceText = match.learningSources?.length
    ? ` Learning source: ${match.learningSources.join(", ")}.`
    : "";
  guessMeta.textContent = usesMatchForPlayback
    ? `Raw STT: "${match.rawText || match.originalText}". App nghe: "${match.originalText}". Confidence: ${Math.round(
        match.confidence * 100
      )}%.${inputTypeText}${engineText}${learningSourceText}${correctionLayerText}${keywordText}${topCandidateText}${phraseCorrectionTextValue}${lightCorrectionText}${suggestedCorrectionText} Độ khớp đủ cao, app dùng câu đoán để phát lại.${debugText}`
    : `Raw STT: "${match.rawText || match.originalText}". App nghe: "${match.originalText}". Confidence: ${Math.round(
        match.confidence * 100
      )}%.${inputTypeText}${engineText}${learningSourceText}${correctionLayerText}${keywordText}${topCandidateText}${phraseCorrectionTextValue}${lightCorrectionText}${suggestedCorrectionText} Độ khớp thấp, app chỉ dùng phrase/raw, không tự phát nguyên câu dài.${debugText}`;
  renderLearningReviewPanel();
}

function getReviewHeardText() {
  return (lastRecognitionResult?.heardText || recognizedTranscript || "").trim();
}

function getReviewCorrectedText() {
  const heardText = getReviewHeardText();

  if (matchedSentence?.confirmedByUser) {
    return (
      matchedSentence.correctedText ||
      lastRecognitionResult?.correctedTranscript ||
      finalTranscript ||
      heardText ||
      ""
    ).trim();
  }

  if (!matchedSentence?.usedForPlayback && heardText) {
    return heardText;
  }

  return (
    matchedSentence?.correctedText ||
    lastRecognitionResult?.correctedTranscript ||
    finalTranscript ||
    heardText ||
    ""
  ).trim();
}

function getTopLearnedCorrections(limit = 3) {
  return learnedCorrections
    .slice()
    .sort((left, right) => {
      const leftWeight =
        correctionConfidence(left) * 100 +
        (left.learnedCount || left.count || 1) * 3 +
        (left.usedCount || 0);
      const rightWeight =
        correctionConfidence(right) * 100 +
        (right.learnedCount || right.count || 1) * 3 +
        (right.usedCount || 0);
      return rightWeight - leftWeight;
    })
    .slice(0, limit);
}

function createLearningReviewPanel() {
  const panel = document.createElement("div");
  panel.className = "learning-review-panel";
  panel.style.marginTop = "14px";
  panel.style.display = "grid";
  panel.style.gap = "10px";

  const status = document.createElement("p");
  status.className = "meta-text";

  const debug = document.createElement("details");
  debug.className = "pipeline-debug-panel";
  debug.hidden = !isDebugPipelineEnabled();
  const debugSummary = document.createElement("summary");
  debugSummary.textContent = "Debug pipeline";
  const debugBody = document.createElement("pre");
  debugBody.className = "pipeline-debug-body";
  debug.append(debugSummary, debugBody);

  const controls = document.createElement("div");
  controls.className = "recorder-control-row";
  controls.style.gap = "8px";

  const confirmBox = document.createElement("div");
  confirmBox.className = "uncertain-confirm-panel";
  confirmBox.hidden = true;

  const confirmPrompt = document.createElement("p");
  confirmPrompt.className = "meta-text";

  const confirmOptions = document.createElement("div");
  confirmOptions.className = "uncertain-option-row";

  const confirmInputRow = document.createElement("div");
  confirmInputRow.className = "recorder-control-row";
  confirmInputRow.style.gap = "8px";

  const confirmInput = document.createElement("input");
  confirmInput.className = "field-input";
  confirmInput.type = "text";
  confirmInput.placeholder = "Hoặc nhập câu đúng";
  confirmInput.autocomplete = "off";

  const confirmTypedButton = document.createElement("button");
  confirmTypedButton.className = "primary-button";
  confirmTypedButton.type = "button";
  confirmTypedButton.textContent = "Xác nhận";

  confirmTypedButton.addEventListener("click", () => {
    handleUncertainConfirmation(confirmInput.value);
  });
  confirmInput.addEventListener("keydown", (event) => {
    if (event.key === "Enter") {
      handleUncertainConfirmation(confirmInput.value);
    }
  });

  confirmInputRow.append(confirmInput, confirmTypedButton);
  confirmBox.append(confirmPrompt, confirmOptions, confirmInputRow);

  const correctButton = document.createElement("button");
  correctButton.className = "primary-button";
  correctButton.type = "button";
  correctButton.textContent = "Đúng";

  const wrongButton = document.createElement("button");
  wrongButton.className = "secondary-button";
  wrongButton.type = "button";
  wrongButton.textContent = "Sai";

  const correctionInput = document.createElement("input");
  correctionInput.className = "field-input";
  correctionInput.type = "text";
  correctionInput.placeholder = "Nhập câu đúng";
  correctionInput.autocomplete = "off";
  correctionInput.hidden = true;

  const saveWrongButton = document.createElement("button");
  saveWrongButton.className = "primary-button";
  saveWrongButton.type = "button";
  saveWrongButton.textContent = "Lưu sửa";
  saveWrongButton.hidden = true;

  const showWrongReviewInput = () => {
    correctionInput.hidden = false;
    saveWrongButton.hidden = false;
    correctionInput.value = getReviewCorrectedText();
    correctionInput.focus();
    status.textContent = "Nhập câu đúng rồi bấm Lưu sửa.";
  };

  correctButton.addEventListener("click", () => {
    handleCorrectReview();
  });
  wrongButton.addEventListener("click", () => {
    showWrongReviewInput();
  });
  saveWrongButton.addEventListener("click", () => {
    handleWrongReview(correctionInput.value);
  });
  correctionInput.addEventListener("keydown", (event) => {
    if (event.key === "Enter") {
      handleWrongReview(correctionInput.value);
    }
  });

  controls.append(correctButton, wrongButton, correctionInput, saveWrongButton);
  panel.append(confirmBox, status, debug, controls);
  guessMeta.insertAdjacentElement("afterend", panel);

  reviewPanelElements = {
    panel,
    status,
    debug,
    debugBody,
    confirmBox,
    confirmPrompt,
    confirmOptions,
    confirmInput,
    correctButton,
    wrongButton,
    correctionInput,
    saveWrongButton,
    showWrongReviewInput
  };
}

function renderLearningReviewPanel(message = "") {
  if (!reviewPanelElements) {
    createLearningReviewPanel();
  }

  renderUncertainConfirmationPanel();
  const heardText = getReviewHeardText();
  const correctedText = getReviewCorrectedText();
  const hasReviewTarget = Boolean(heardText || correctedText);

  reviewPanelElements.correctButton.disabled = !hasReviewTarget;
  reviewPanelElements.wrongButton.disabled = !hasReviewTarget;
  reviewPanelElements.status.textContent =
    message ||
    `Review status: ${
      hasReviewTarget
        ? matchedSentence?.usedForPlayback
          ? "chờ đánh dấu câu app phát đúng/sai"
          : "chờ review raw STT; bấm Đúng nếu App nghe đúng"
        : "chưa có kết quả để review"
    }.`;
  renderPipelineDebugPanel();
}

function isDebugPipelineEnabled() {
  return (
    personalLearningMode.debug ||
    new URL(window.location.href).searchParams.get("debug") === "1"
  );
}

function renderPipelineDebugPanel() {
  if (!reviewPanelElements?.debugBody) {
    return;
  }

  reviewPanelElements.debug.hidden = !isDebugPipelineEnabled();
  if (reviewPanelElements.debug.hidden) {
    reviewPanelElements.debugBody.textContent = "";
    return;
  }

  const result = lastRecognitionResult || {};
  const match = matchedSentence || {};
  const payload = {
    rawTranscript: result.recognizedTranscript || recognizedTranscript || "",
    correctedText: result.correctedTranscript || match.correctedText || "",
    playbackText: result.playbackTranscript || finalTranscript || "",
    inputType: result.inputType || match.inputType || "",
    engineUsed: result.engineUsed || match.engineUsed || "",
    confidence: result.matchScore ?? match.confidence ?? 0,
    learningMode: personalLearningMode.mode,
    trust: loadSampleTrustStore()[getTrustKeyFromMatch(match.match)] || null,
    audioSimilarity: {
      score: match.match?.rawConfidence ?? match.topMatches?.[0]?.score ?? null,
      margin: getAudioMatchMargin(match),
      trusted: Boolean(match.match?.trusted),
      unstable: Boolean(match.match?.unstable),
      confirmedTakeCount: match.match?.confirmedTakeCount || 0
    },
    context: getContextBoost(match.correctedText || result.correctedTranscript || ""),
    correctionSource: {
      phrase: result.appliedPhraseCorrections || match.appliedPhraseCorrections || [],
      token: result.appliedPersonalCorrections || match.appliedPersonalCorrections || [],
      suggestedPhrase: result.suggestedPhraseCorrections || match.suggestedPhraseCorrections || [],
      suggestedToken: result.suggestedPersonalCorrections || match.suggestedPersonalCorrections || []
    },
    phraseCandidates: (match.topCandidates || []).slice(0, 5),
    audioCandidates: match.debugText || "",
    timing: result.timing || match.timing || null,
    safeMode:
      !match.correctedText ||
      Number(match.confidence || result.matchScore || 0) < SAFE_MODE_MIN_AUTO_CONFIDENCE
  };

  reviewPanelElements.debugBody.textContent = JSON.stringify(payload, null, 2);
}

function isShortcutInputElement(element) {
  if (!element) {
    return false;
  }

  const tagName = element.tagName?.toLowerCase();
  return (
    element.isContentEditable ||
    tagName === "input" ||
    tagName === "textarea" ||
    tagName === "select"
  );
}

function handleReviewNumberShortcut(event) {
  if (event.repeat || event.altKey || event.ctrlKey || event.metaKey || event.shiftKey) {
    return;
  }

  if (isShortcutInputElement(document.activeElement) || !reviewPanelElements) {
    return;
  }

  if (event.key === "1" && !reviewPanelElements.correctButton.disabled) {
    event.preventDefault();
    handleCorrectReview();
    return;
  }

  if (event.key === "2" && !reviewPanelElements.wrongButton.disabled) {
    event.preventDefault();
    reviewPanelElements.showWrongReviewInput?.();
  }
}

function shouldAskForConfirmation() {
  return Boolean(
    matchedSentence &&
      finalTranscript &&
      finalTranscript !== matchedSentence.correctedText &&
      matchedSentence.confidence > 0 &&
      matchedSentence.confidence < ASK_CONFIRMATION_SCORE
  );
}

function getUncertainConfirmationOptions() {
  const options = [];
  const pushOption = (text, source) => {
    const cleanText = String(text || "").trim();
    const normalizedText = normalizeText(cleanText);

    if (!cleanText || options.some((item) => normalizeText(item.text) === normalizedText)) {
      return;
    }

    options.push({ text: cleanText, source });
  };

  pushOption(matchedSentence?.correctedText, "guess");
  pushOption(matchedSentence?.personalizedCorrectedText, "personalized");
  pushOption(recognizedTranscript, "raw");

  for (const candidate of matchedSentence?.topCandidates || []) {
    pushOption(candidate.text, candidate.sourceId || candidate.id || "candidate");
  }

  return options.slice(0, 4);
}

function renderUncertainConfirmationPanel() {
  if (!reviewPanelElements?.confirmBox) {
    return;
  }

  const shouldAsk = shouldAskForConfirmation();
  reviewPanelElements.confirmBox.hidden = !shouldAsk;
  reviewPanelElements.confirmOptions.replaceChildren();

  if (!shouldAsk) {
    reviewPanelElements.confirmInput.value = "";
    return;
  }

  const options = getUncertainConfirmationOptions();
  reviewPanelElements.confirmPrompt.textContent =
    "App chưa đủ chắc để tự nói. Chọn câu đúng hoặc nhập lại để app học và phát.";

  for (const option of options) {
    const button = document.createElement("button");
    button.className = option.source === "guess" ? "primary-button" : "secondary-button";
    button.type = "button";
    button.textContent = option.text;
    button.title = option.source;
    button.addEventListener("click", () => {
      handleUncertainConfirmation(option.text);
    });
    reviewPanelElements.confirmOptions.append(button);
  }

  reviewPanelElements.confirmInput.value =
    matchedSentence?.personalizedCorrectedText || recognizedTranscript || "";
}

async function handleUncertainConfirmation(textValue) {
  const confirmedText = String(textValue || "").trim();

  if (!confirmedText) {
    renderLearningReviewPanel("Review status: cần chọn hoặc nhập câu đúng.");
    return;
  }

  const heardText = getReviewHeardText();
  const previousGuessText = matchedSentence?.correctedText || "";
  finalTranscript = confirmedText;
  matchedSentence = {
    ...(matchedSentence || {}),
    correctedText: confirmedText,
    personalizedCorrectedText: confirmedText,
    lightlyCorrectedText: confirmedText,
    confidence: Math.max(matchedSentence?.confidence || 0, ASK_CONFIRMATION_SCORE),
    confirmedByUser: true,
    usedForPlayback: true
  };
  renderTranscript(recognizedTranscript || confirmedText, "final");
  renderMatchedSentence(matchedSentence, true);
  notifyRecognitionResult();

  const confidence = Math.max(matchedSentence?.confidence || 0, ASK_CONFIRMATION_SCORE);
  const shouldLearn = canLearnFromReview(confidence);

  if (shouldLearn) {
    saveReview({
      heardText,
      correctedText: confirmedText,
      matchedText: previousGuessText,
      playbackTranscript: finalTranscript,
      confidence,
      isCorrect: normalizeText(heardText) === normalizeText(confirmedText),
      createdAt: new Date().toISOString()
    });
  }

  if (shouldLearn && heardText && normalizeText(heardText) !== normalizeText(confirmedText)) {
    recordPersonalConfusion(heardText, previousGuessText, confirmedText);
    learnFromReview(heardText, confirmedText);
  }
  if (shouldLearn) {
    updatePersonalPhrasebook(confirmedText, {
      correctCount: 1,
      locked: Boolean(matchedSentence?.aiDecision?.decision === "learn_new_phrase"),
      source: "review-confirmed"
    });
    updateContextMemory(confirmedText, "review-confirmed");
    updateSampleTrustFromReview(true);
  }

  try {
    if (canLearnFromReview(confidence, PERSONAL_AUDIO_MIN_LEARN_CONFIDENCE)) {
      await saveLastRecognitionAudioSample(heardText || confirmedText, confirmedText, "review-confirmed");
    }
  } catch (error) {
    console.warn("Unable to save confirmed uncertain sample:", error.message);
  }

  if (hasSpeechPlayback()) {
    setAppState(UI_STATES.PROCESSING, "Đã xác nhận câu đúng, app sẽ phát lại sau 0.5 giây");
    scheduleAutoReplay();
  } else {
    setAppState(UI_STATES.READY, "Đã xác nhận câu đúng.");
  }
}

function exportCorrections() {
  const blob = new Blob([JSON.stringify(learnedCorrections, null, 2)], {
    type: "application/json"
  });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = "speech_corrections.json";
  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
  renderLearningReviewPanel("Review status: đã export dữ liệu học.");
}

async function importCorrectionsFromFile(file) {
  if (!file) {
    return;
  }

  try {
    const parsed = JSON.parse(await file.text());
    if (!Array.isArray(parsed)) {
      throw new Error("File không phải danh sách corrections.");
    }

    const existingRules = learnedCorrections;
    learnedCorrections = [];
    for (const item of [...existingRules, ...parsed]) {
      upsertCorrectionRule(item.wrong, item.correct, {
        learnedCount: item.learnedCount || item.count || 1,
        successCount: item.successCount || item.success || 0,
        usedCount: item.usedCount || 0,
        ngramSize: item.ngramSize
      });
    }
    sortAndTrimCorrections();
    saveCorrections();
    renderLearningReviewPanel("Review status: đã import dữ liệu học.");
  } catch (error) {
    renderLearningReviewPanel(`Review status: import thất bại (${error.message}).`);
  }
}

function resetLearnedCorrections() {
  if (!window.confirm("Xóa toàn bộ learned corrections trong trình duyệt này?")) {
    return;
  }

  learnedCorrections = [];
  saveCorrections();
  renderLearningReviewPanel("Review status: đã reset dữ liệu học.");
}

async function resetAllPersonalLearning(options = {}) {
  if (!options.skipConfirm) {
    const confirmed = window.confirm(
      "Xóa sạch dữ liệu học cá nhân trong trình duyệt này và bắt đầu học lại từ đầu?"
    );

    if (!confirmed) {
      return false;
    }
  }

  learnedCorrections = [];
  correctionRuleCache = null;
  window.localStorage.removeItem(SPEECH_CORRECTIONS_STORAGE_KEY);
  window.localStorage.removeItem(SPEECH_REVIEWS_STORAGE_KEY);
  window.localStorage.removeItem(SPEECH_CONTEXT_STORAGE_KEY);
  window.localStorage.removeItem(SPEECH_TRUST_STORAGE_KEY);
  window.localStorage.removeItem(PERSONAL_PHRASEBOOK_STORAGE_KEY);
  window.localStorage.removeItem(PERSONAL_LEARNING_MODE_STORAGE_KEY);
  window.localStorage.removeItem(PERSONAL_CONFUSION_MEMORY_STORAGE_KEY);
  window.localStorage.removeItem(RECORDER_STORAGE_KEY);
  personalLearningMode = { mode: "learning", debug: false };
  window.voiceTemplateMatcher?.setSampleTrustStore?.({});

  try {
    await window.voiceTemplateMatcher?.resetLearnedVoiceSamples?.();
  } catch (error) {
    console.warn("Unable to reset learned audio samples:", error.message);
  }

  renderLearningReviewPanel("Review status: đã xóa sạch dữ liệu học cá nhân.");
  return true;
}

function forgetPersonalLearningText(textValue) {
  const target = normalizeText(textValue);

  if (!target) {
    return 0;
  }

  let removedCount = 0;
  const matchesTarget = (...values) =>
    values.some((value) => normalizeText(value || "") === target);

  const beforeCorrections = learnedCorrections.length;
  learnedCorrections = learnedCorrections.filter(
    (rule) => !matchesTarget(rule.wrong, rule.correct)
  );
  removedCount += beforeCorrections - learnedCorrections.length;
  saveCorrections();

  const phrasebook = loadPersonalPhrasebook();
  for (const [key, record] of Object.entries(phrasebook)) {
    if (normalizeText(key) === target || matchesTarget(record?.text)) {
      delete phrasebook[key];
      removedCount += 1;
    }
  }
  savePersonalPhrasebook(phrasebook);

  const reviews = loadReviews();
  const keptReviews = reviews.filter(
    (review) =>
      !matchesTarget(
        review?.heardText,
        review?.correctedText,
        review?.playbackTranscript,
        review?.matchedText
      )
  );
  removedCount += reviews.length - keptReviews.length;
  window.localStorage.setItem(SPEECH_REVIEWS_STORAGE_KEY, JSON.stringify(keptReviews, null, 2));

  const confusionMemory = loadConfusionMemory();
  const keptPairs = (confusionMemory.pairs || []).filter(
    (pair) =>
      !matchesTarget(
        pair?.heardText,
        pair?.wrongGuessText,
        pair?.correctedText,
        pair?.heardNormalized,
        pair?.wrongNormalized,
        pair?.correctNormalized
      )
  );
  removedCount += (confusionMemory.pairs || []).length - keptPairs.length;
  saveConfusionMemory({ pairs: keptPairs });

  const contextMemory = loadContextMemory();
  for (const key of Object.keys(contextMemory.phrases || {})) {
    if (normalizeText(key) === target || matchesTarget(contextMemory.phrases[key]?.text)) {
      delete contextMemory.phrases[key];
      removedCount += 1;
    }
  }
  saveContextMemory(contextMemory);

  correctionRuleCache = null;
  phraseDatasetByLength = new Map();
  phraseDatasetExactMap = new Map();
  renderLearningReviewPanel(`Review status: đã quên "${normalizeDisplayText(textValue)}" (${removedCount} mục memory).`);
  return removedCount;
}

async function resetPersonalLearningFromUrl() {
  const url = new URL(window.location.href);
  const forgetText = url.searchParams.get("forgetText") || url.searchParams.get("forgetPhrase");

  if (forgetText) {
    const removedCount = forgetPersonalLearningText(forgetText);
    url.searchParams.delete("forgetText");
    url.searchParams.delete("forgetPhrase");
    window.history.replaceState({}, "", url.toString());
    setAppState(
      UI_STATES.READY,
      `Đã quên memory cá nhân cho "${normalizeDisplayText(forgetText)}" (${removedCount} mục).`
    );
    return;
  }

  if (url.searchParams.get("resetLearning") !== "1") {
    return;
  }

  await resetAllPersonalLearning({ skipConfirm: true });
  url.searchParams.delete("resetLearning");
  window.history.replaceState({}, "", url.toString());
  setAppState(UI_STATES.READY, "Đã xóa sạch dữ liệu học cá nhân. Bạn có thể bắt đầu học lại.");
}

async function handleCorrectReview() {
  const heardText = getReviewHeardText();
  const correctedText = getReviewCorrectedText() || heardText;
  const confidence = matchedSentence?.confidence || lastRecognitionResult?.matchScore || 0;
  const shouldLearnCorrections = canLearnFromReview(confidence);
  const shouldLearnAudio = canLearnFromReview(confidence, PERSONAL_AUDIO_MIN_LEARN_CONFIDENCE);

  if (!heardText && !correctedText) {
    renderLearningReviewPanel("Review status: chưa có dữ liệu để lưu.");
    return;
  }

  if (shouldLearnCorrections) {
    saveReview({
      heardText,
      correctedText,
      matchedText: matchedSentence?.correctedText || "",
      playbackTranscript: finalTranscript,
      confidence,
      isCorrect: true,
      createdAt: new Date().toISOString()
    });
  }
  const appliedPersonalCorrections =
    matchedSentence?.appliedPersonalCorrections ||
    lastRecognitionResult?.appliedPersonalCorrections ||
    [];
  const acceptedGuessedCorrection =
    Boolean(matchedSentence?.usedForPlayback) ||
    normalizeText(heardText) !== normalizeText(correctedText);

  if (shouldLearnCorrections && acceptedGuessedCorrection) {
    markAppliedCorrectionsSuccessful(appliedPersonalCorrections);
  } else if (shouldLearnCorrections) {
    markAppliedCorrectionsWrong(appliedPersonalCorrections);
  }
  const trust = shouldLearnCorrections ? updateSampleTrustFromReview(true) : null;

  if (correctedText) {
    if (shouldLearnCorrections) {
      if (heardText && normalizeText(heardText) !== normalizeText(correctedText)) {
        learnFromReview(heardText, correctedText);
      }
      updatePersonalPhrasebook(correctedText, {
        correctCount: 1,
        locked: Boolean(acceptedGuessedCorrection && matchedSentence?.aiDecision?.shouldLearn),
        source: acceptedGuessedCorrection ? "review-correct" : "raw-review-correct"
      });
      updateContextMemory(correctedText, "review-correct");
    }
    finalTranscript = correctedText;
    if (matchedSentence) {
      matchedSentence = {
        ...matchedSentence,
        correctedText,
        personalizedCorrectedText: correctedText,
        lightlyCorrectedText: correctedText,
        confirmedByUser: true,
        usedForPlayback: true
      };
    }
    notifyRecognitionResult();
  }

  try {
    const learnedSample = shouldLearnAudio
      ? await saveLastRecognitionAudioSample(heardText, correctedText, "review-correct")
      : null;
    const audioSkipText = !shouldLearnAudio
      ? " Confidence chưa đủ để lưu audio học."
      : "";
    renderLearningReviewPanel(
      learnedSample?.serverPath
        ? `Review status: đã lưu là đúng và thêm audio giọng thật vào server.${trust ? ` Trust ${Math.round(trust.trustScore * 100)}%.` : ""}${audioSkipText}`
        : learnedSample
        ? `Review status: đã lưu là đúng và thêm audio giọng thật vào mẫu học tạm.${trust ? ` Trust ${Math.round(trust.trustScore * 100)}%.` : ""}${audioSkipText}`
        : `Review status: đã lưu là đúng.${trust ? ` Trust ${Math.round(trust.trustScore * 100)}%.` : ""}${audioSkipText}`
    );
  } catch (error) {
    renderLearningReviewPanel(
      `Review status: đã lưu là đúng, nhưng chưa lưu được audio mẫu (${error.message}).`
    );
  }

  if (appState !== UI_STATES.UNSUPPORTED) {
    setAppState(UI_STATES.READY, "Đã lưu là đúng. Bạn có thể nói tiếp hoặc bấm Phát lại.");
  }
}

async function saveLastRecognitionAudioSample(heardText, correctedText, take = "review-wrong") {
  if (!lastLocalRecognitionBlob || !window.voiceTemplateMatcher?.saveLearnedVoiceSample) {
    return null;
  }
  if (!CONFIRMED_REVIEW_TAKES.has(take)) {
    return null;
  }

  const correctedSentence = resolveSentenceMetadataForText(correctedText);

  return window.voiceTemplateMatcher.saveLearnedVoiceSample(
    lastLocalRecognitionBlob,
    getCurrentSpeakerIdForLocalRecognition(),
    {
      heardText,
      correctedText,
      sentenceId: correctedSentence?.sentenceId || "",
      sourceSentenceId: correctedSentence?.sourceSentenceId || "learned-audio",
      take,
      fileName: `${take.replace(/[^a-z0-9_-]/gi, "_")}_${Date.now()}.webm`
    }
  );
}

async function handleWrongReview(correctedTextValue) {
  const heardText = getReviewHeardText();
  const correctedText = correctedTextValue.trim();
  const confidence = matchedSentence?.confidence || lastRecognitionResult?.matchScore || 0;

  if (!heardText || !correctedText) {
    renderLearningReviewPanel("Review status: cần có App nghe và câu đúng.");
    return;
  }

  saveReview({
    heardText,
    correctedText,
    matchedText: matchedSentence?.correctedText || "",
    playbackTranscript: finalTranscript,
    confidence,
    isCorrect: false,
    createdAt: new Date().toISOString()
  });
  const trust = updateSampleTrustFromReview(false);
  markAppliedCorrectionsWrong(
    matchedSentence?.appliedPersonalCorrections ||
      lastRecognitionResult?.appliedPersonalCorrections ||
      []
  );

  if (normalizeText(heardText) !== normalizeText(correctedText)) {
    recordPersonalConfusion(heardText, matchedSentence?.correctedText || "", correctedText);
    learnFromReview(heardText, correctedText);
    updatePersonalPhrasebook(heardText, {
      wrongCount: 1,
      source: "review-wrong-heard"
    });
  }
  updatePersonalPhrasebook(correctedText, {
    correctCount: 1,
    locked: true,
    source: "review-wrong-corrected"
  });
  updateContextMemory(correctedText, "review-wrong-corrected");
  finalTranscript = correctedText;
  if (matchedSentence) {
    matchedSentence = {
      ...matchedSentence,
      correctedText,
      personalizedCorrectedText: correctedText,
      lightlyCorrectedText: correctedText,
      confirmedByUser: true,
      usedForPlayback: true
    };
    renderMatchedSentence(matchedSentence, true);
  }
  notifyRecognitionResult();

  reviewPanelElements.correctionInput.hidden = true;
  reviewPanelElements.saveWrongButton.hidden = true;

  try {
    const learnedSample = await saveLastRecognitionAudioSample(
      heardText,
      correctedText,
      "review-confirmed"
    );
    renderLearningReviewPanel(
      learnedSample?.serverPath
        ? `Review status: đã học từ lỗi sai, lưu câu đúng và thêm audio vào server.${trust ? ` Trust ${Math.round(trust.trustScore * 100)}%.` : ""}`
        : learnedSample
        ? `Review status: đã học từ lỗi sai, lưu câu đúng và thêm audio vào mẫu học tạm.${trust ? ` Trust ${Math.round(trust.trustScore * 100)}%.` : ""}`
        : `Review status: đã học từ lỗi sai và lưu câu đúng.${trust ? ` Trust ${Math.round(trust.trustScore * 100)}%.` : ""}`
    );
  } catch (error) {
    renderLearningReviewPanel(
      `Review status: đã học từ lỗi sai, nhưng chưa lưu được audio mẫu (${error.message}).`
    );
  }

  if (appState !== UI_STATES.UNSUPPORTED) {
    setAppState(UI_STATES.READY, "Đã học từ lỗi sai. Bạn có thể nói tiếp hoặc bấm Phát lại.");
  }
}

function normalizeVietnameseText(value) {
  return value
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/đ/g, "d")
    .replace(/[^a-z0-9\s]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function normalizeText(value) {
  return normalizeVietnameseText(String(value || ""));
}

function tokenizeText(value) {
  const normalized = normalizeText(value);
  return normalized ? normalized.split(" ").filter(Boolean) : [];
}

function normalizeDisplayText(value) {
  return String(value || "")
    .toLowerCase()
    .replace(/[^\p{L}0-9\s]/gu, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function tokenizeDisplayText(value) {
  const normalized = normalizeDisplayText(value);
  return normalized ? normalized.split(" ").filter(Boolean) : [];
}

function normalizePhraseRecord(item, index = 0) {
  const text = typeof item === "string" ? item : item?.text || "";
  const displayText = normalizeDisplayText(text);
  const normalizedText = normalizeText(displayText);
  const tokens = normalizedText ? normalizedText.split(" ").filter(Boolean) : [];

  if (!displayText || tokens.length < 1 || tokens.length > MAX_PHRASE_NGRAM) {
    return null;
  }

  return {
    id: typeof item === "object" && item?.id ? item.id : `P${String(index + 1).padStart(3, "0")}`,
    text: displayText,
    normalizedText,
    tokens,
    tokenCount: tokens.length,
    priority: Number(typeof item === "object" ? item.priority || 1 : 1)
  };
}

function rebuildPhraseDatasetCache(entries) {
  phraseDatasetByLength = new Map();
  phraseDatasetExactMap = new Map();

  for (const entry of entries) {
    if (!phraseDatasetByLength.has(entry.tokenCount)) {
      phraseDatasetByLength.set(entry.tokenCount, []);
    }

    phraseDatasetByLength.get(entry.tokenCount).push(entry);
    phraseDatasetExactMap.set(entry.normalizedText, entry);
  }

  for (const phrases of phraseDatasetByLength.values()) {
    phrases.sort((left, right) => right.priority - left.priority);
  }
}

function setPhraseDataset(entries) {
  const normalizedEntries = entries
    .map(normalizePhraseRecord)
    .filter(Boolean);
  phraseDatasetEntries = normalizedEntries.length
    ? normalizedEntries
    : DEFAULT_PHRASE_DATASET.map(normalizePhraseRecord).filter(Boolean);
  rebuildPhraseDatasetCache(phraseDatasetEntries);
  return phraseDatasetEntries;
}

async function loadPhraseDataset() {
  if (phraseDatasetLoadedFromFile) {
    return phraseDatasetEntries;
  }

  if (phraseDatasetLoadPromise) {
    return phraseDatasetLoadPromise;
  }

  phraseDatasetLoadPromise = fetch(PHRASE_DATASET_URL, { cache: "no-store" })
    .then((response) => (response.ok ? response.json() : Promise.reject(new Error("Phrase dataset not found."))))
    .then((payload) => {
      phraseDatasetLoadedFromFile = true;
      return setPhraseDataset(payload.phrases || payload);
    })
    .catch(() => setPhraseDataset(DEFAULT_PHRASE_DATASET));

  return phraseDatasetLoadPromise;
}

setPhraseDataset(DEFAULT_PHRASE_DATASET);

function escapeRegExp(value) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function loadCorrections() {
  try {
    const raw = window.localStorage.getItem(SPEECH_CORRECTIONS_STORAGE_KEY);
    const parsed = raw ? JSON.parse(raw) : [];

    if (!Array.isArray(parsed)) {
      return [];
    }

    return parsed
      .map((item) => normalizeCorrectionRecord(item))
      .filter((item) => item.wrong && item.correct);
  } catch (error) {
    return [];
  }
}

function normalizeCorrectionRecord(item) {
  const wrong = normalizeDisplayText(item?.wrong || "");
  const correct = normalizeDisplayText(item?.correct || "");
  const learnedCount = Math.max(1, Number(item?.learnedCount || item?.count || 1));
  const successCount = Math.max(0, Number(item?.successCount || item?.success || 0));
  const wrongCount = Math.max(0, Number(item?.wrongCount || item?.failureCount || 0));
  const ngramSize = Math.max(1, Math.min(MAX_CORRECTION_NGRAM, Number(item?.ngramSize || tokenizeText(wrong).length || 1)));

  return {
    wrong,
    correct,
    learnedCount,
    successCount,
    wrongCount,
    successRate: learnedCount ? Math.min(successCount / learnedCount, 1) : 0,
    count: learnedCount,
    usedCount: Math.max(0, Number(item?.usedCount || 0)),
    ngramSize,
    createdAt: item?.createdAt || new Date().toISOString(),
    updatedAt: item?.updatedAt || item?.createdAt || new Date().toISOString(),
    lastUsed: item?.lastUsed || item?.lastUsedAt || ""
  };
}

function saveCorrections() {
  correctionRuleCache = null;
  const records = learnedCorrections.map((item) => {
    const record = normalizeCorrectionRecord(item);
    return {
      ...record,
      confidence: Number(correctionConfidence(record).toFixed(3))
    };
  });
  window.localStorage.setItem(
    SPEECH_CORRECTIONS_STORAGE_KEY,
    JSON.stringify(records, null, 2)
  );
}

function correctionConfidence(rule) {
  if (rule.builtin) {
    return 0.72;
  }

  const learnedCount = Math.max(1, Number(rule.learnedCount || rule.count || 1));
  const successCount = Math.max(0, Number(rule.successCount || rule.success || 0));
  const wrongCount = Math.max(0, Number(rule.wrongCount || 0));
  const usedCount = Number(rule.usedCount || 0);
  const successRate = Math.min(successCount / Math.max(successCount + wrongCount, learnedCount, 1), 1);
  const evidenceScore = Math.min(learnedCount / 6, 1);
  const useScore = Math.min(usedCount / 12, 1);
  const ngramBonus = Math.min(Number(rule.ngramSize || 1) - 1, 2) * 0.04;
  const failurePenalty = Math.min(wrongCount * 0.06, 0.24);

  return Math.max(
    0.05,
    Math.min(0.34 + evidenceScore * 0.28 + successRate * 0.22 + useScore * 0.08 + ngramBonus - failurePenalty, 0.97)
  );
}

function expandCorrectionRule(rule) {
  const wrongTokens = tokenizeText(rule.wrong);
  const correctTokens = tokenizeDisplayText(rule.correct);

  if (!wrongTokens.length || !correctTokens.length) {
    return [];
  }

  return [{
    wrong: wrongTokens.join(" "),
    wrongTokens,
    correct: correctTokens.join(" "),
    correctTokens,
    correctNormalizedTokens: correctTokens.map(normalizeText),
    correctNormalized: correctTokens.map(normalizeText).join(" "),
    learnedCount: rule.learnedCount || rule.count || 1,
    successCount: rule.successCount || 0,
    wrongCount: rule.wrongCount || 0,
    count: rule.learnedCount || rule.count || 1,
    usedCount: rule.usedCount || 0,
    ngramSize: wrongTokens.length,
    builtin: Boolean(rule.builtin),
    sourceRule: rule
  }];
}

function getAllPersonalCorrectionRules() {
  if (correctionRuleCache) {
    return correctionRuleCache;
  }

  const weightedRules = [
    ...learnedCorrections,
    ...PERSONAL_CORRECTION_RULES.map((rule) => ({
      ...rule,
      learnedCount: 1,
      successCount: 1,
      count: 1,
      usedCount: 0,
      ngramSize: tokenizeText(rule.wrong).length || 1,
      builtin: true
    }))
  ]
    .flatMap(expandCorrectionRule)
    .filter(
      (rule) =>
        rule.wrong &&
        rule.correct &&
        (rule.wrong !== normalizeText(rule.correct) || rule.wrong !== normalizeDisplayText(rule.correct))
    )
    .sort((left, right) => {
      if (right.ngramSize !== left.ngramSize) {
        return right.ngramSize - left.ngramSize;
      }

      const leftWeight = correctionConfidence(left);
      const rightWeight = correctionConfidence(right);
      return rightWeight - leftWeight;
    });

  correctionRuleCache = weightedRules;
  return weightedRules;
}

function applyPersonalCorrections(inputText, options = {}) {
  const tokens = tokenizeText(inputText);
  const appliedRules = [];
  const suggestedRules = [];
  const correctedTokens = [];
  const correctedDisplayTokens = [];
  const rules = getAllPersonalCorrectionRules();
  let index = 0;
  let usageChanged = false;

  while (index < tokens.length) {
    const matchedRule = rules.find((rule) => {
      if (!rule.wrongTokens?.length || rule.wrongTokens.length + index > tokens.length) {
        return false;
      }

      return rule.wrongTokens.every((token, tokenIndex) => token === tokens[index + tokenIndex]);
    });

    if (!matchedRule) {
      correctedTokens.push(tokens[index]);
      correctedDisplayTokens.push(tokens[index]);
      index += 1;
      continue;
    }

    const confidence = correctionConfidence(matchedRule);
    const wrongText = tokens.slice(index, index + matchedRule.wrongTokens.length).join(" ");
    const isSingleTokenCorrection =
      matchedRule.wrongTokens.length === 1 && matchedRule.correctNormalizedTokens.length === 1;
    const autoConfidenceThreshold = isSingleTokenCorrection
      ? SINGLE_TOKEN_CORRECTION_AUTO_CONFIDENCE
      : CORRECTION_AUTO_CONFIDENCE;
    const canAutoApply =
      confidence >= autoConfidenceThreshold &&
      matchedRule.correctNormalizedTokens.length <= matchedRule.wrongTokens.length;

    if (!canAutoApply) {
      if (confidence >= CORRECTION_SUGGEST_CONFIDENCE) {
        suggestedRules.push({
          wrong: wrongText,
          correct: matchedRule.correct,
          learnedCount: matchedRule.learnedCount || matchedRule.count || 1,
          successCount: matchedRule.successCount || 0,
          confidence,
          ngramSize: matchedRule.ngramSize,
          tokenIndex: index
        });
      }

      correctedTokens.push(tokens[index]);
      correctedDisplayTokens.push(tokens[index]);
      index += 1;
      continue;
    }

    if (options.trackUsage && !matchedRule.builtin && matchedRule.sourceRule) {
      matchedRule.sourceRule.usedCount = Number(matchedRule.sourceRule.usedCount || 0) + 1;
      matchedRule.sourceRule.updatedAt = new Date().toISOString();
      matchedRule.sourceRule.lastUsed = matchedRule.sourceRule.updatedAt;
      usageChanged = true;
    }

    appliedRules.push({
      wrong: wrongText,
      correct: matchedRule.correct,
      learnedCount: matchedRule.learnedCount || matchedRule.count || 1,
      successCount: matchedRule.successCount || 0,
      wrongCount: matchedRule.wrongCount || 0,
      usedCount: matchedRule.usedCount || 0,
      confidence,
      ngramSize: matchedRule.ngramSize,
      tokenIndex: index
    });
    correctedTokens.push(...matchedRule.correctNormalizedTokens);
    correctedDisplayTokens.push(...matchedRule.correctTokens);
    index += matchedRule.wrongTokens.length;
  }

  if (usageChanged) {
    saveCorrections();
  }

  return {
    rawText: normalizeText(inputText),
    tokens,
    correctedTokens,
    displayText: correctedDisplayTokens.join(" ").replace(/\s+/g, " ").trim(),
    text: correctedTokens.join(" ").replace(/\s+/g, " ").trim(),
    appliedRules,
    suggestedRules
  };
}

function getBestPhraseMatch(segmentTokens) {
  const phraseCandidates = phraseDatasetByLength.get(segmentTokens.length) || [];
  const segmentText = segmentTokens.join(" ");
  const exactPhrase = phraseDatasetExactMap.get(segmentText);

  if (exactPhrase) {
    return {
      phrase: exactPhrase,
      confidence: 1,
      exactMatch: true
    };
  }

  let bestMatch = null;

  for (const phrase of phraseCandidates) {
    const score = getMatchScore(segmentText, phrase.normalizedText);

    if (
      score >= PHRASE_SUGGEST_CONFIDENCE &&
      (!bestMatch ||
        score > bestMatch.confidence ||
        (score === bestMatch.confidence && phrase.tokenCount > bestMatch.phrase.tokenCount))
    ) {
      bestMatch = {
        phrase,
        confidence: Math.min(score + Math.min(phrase.priority, 3) * 0.015, 1),
        exactMatch: false
      };
    }
  }

  return bestMatch;
}

function applyPhraseCorrections(inputText) {
  const tokens = tokenizeText(inputText);
  const correctedTokens = [];
  const correctedDisplayTokens = [];
  const appliedPhrases = [];
  const suggestedPhrases = [];
  let index = 0;

  while (index < tokens.length) {
    let bestMatch = null;
    const maxSize = Math.min(MAX_PHRASE_NGRAM, tokens.length - index);

    for (let ngramSize = maxSize; ngramSize >= 1; ngramSize -= 1) {
      const segmentTokens = tokens.slice(index, index + ngramSize);
      const match = getBestPhraseMatch(segmentTokens);

      if (!match) {
        continue;
      }

      if (!bestMatch || match.confidence > bestMatch.confidence || ngramSize > bestMatch.ngramSize) {
        bestMatch = {
          ...match,
          ngramSize,
          wrong: segmentTokens.join(" ")
        };
      }

      if (match.confidence >= PHRASE_AUTO_CONFIDENCE) {
        break;
      }
    }

    if (!bestMatch || bestMatch.confidence < PHRASE_SUGGEST_CONFIDENCE) {
      correctedTokens.push(tokens[index]);
      correctedDisplayTokens.push(tokens[index]);
      index += 1;
      continue;
    }

    const targetList =
      bestMatch.confidence >= PHRASE_AUTO_CONFIDENCE ? appliedPhrases : suggestedPhrases;
    targetList.push({
      wrong: bestMatch.wrong,
      correct: bestMatch.phrase.text,
      confidence: bestMatch.confidence,
      ngramSize: bestMatch.ngramSize,
      tokenIndex: index,
      source: "phrase-dataset"
    });

    if (bestMatch.confidence >= PHRASE_AUTO_CONFIDENCE) {
      const phraseTokens = tokenizeText(bestMatch.phrase.text);
      correctedTokens.push(...phraseTokens);
      correctedDisplayTokens.push(...tokenizeDisplayText(bestMatch.phrase.text));
      index += bestMatch.ngramSize;
    } else {
      correctedTokens.push(tokens[index]);
      correctedDisplayTokens.push(tokens[index]);
      index += 1;
    }
  }

  return {
    rawText: normalizeText(inputText),
    tokens,
    correctedTokens,
    displayText: correctedDisplayTokens.join(" ").replace(/\s+/g, " ").trim(),
    text: correctedTokens.join(" ").replace(/\s+/g, " ").trim(),
    appliedPhrases,
    suggestedPhrases
  };
}

function runHybridCorrectionPipeline(inputText, options = {}) {
  const phraseCorrection = applyPhraseCorrections(inputText);
  const phraseOutput = phraseCorrection.displayText || phraseCorrection.text || inputText;
  const tokenCorrection = applyPersonalCorrections(phraseOutput, {
    trackUsage: Boolean(options.trackCorrectionUsage)
  });
  const correctedPhraseOutput =
    tokenCorrection.displayText || tokenCorrection.text || phraseOutput || inputText;

  return {
    rawText: normalizeText(inputText),
    normalizedText: normalizeText(inputText),
    phraseCorrection,
    tokenCorrection,
    correctedPhraseOutput,
    correctedNormalizedText: tokenCorrection.text || normalizeText(correctedPhraseOutput),
    appliedPhraseCorrections: phraseCorrection.appliedPhrases,
    suggestedPhraseCorrections: phraseCorrection.suggestedPhrases,
    appliedTokenCorrections: tokenCorrection.appliedRules,
    suggestedTokenCorrections: tokenCorrection.suggestedRules
  };
}

function detectInputType(text) {
  const tokenCount = tokenizeText(text).length;
  return tokenCount > SHORT_PHRASE_MAX_WORDS ? "sentence" : "short_phrase";
}

function loadReviews() {
  try {
    const raw = window.localStorage.getItem(SPEECH_REVIEWS_STORAGE_KEY);
    const parsed = raw ? JSON.parse(raw) : [];
    return Array.isArray(parsed) ? parsed : [];
  } catch (error) {
    return [];
  }
}

function saveReview(review) {
  const reviews = loadReviews();
  reviews.push(review);
  window.localStorage.setItem(SPEECH_REVIEWS_STORAGE_KEY, JSON.stringify(reviews, null, 2));
  return review;
}

function getShortPhraseLearningStats() {
  const statsByPhrase = new Map();

  const ensureStats = (text) => {
    const normalized = normalizeText(text);
    if (!normalized || tokenizeText(normalized).length > SHORT_PHRASE_MAX_WORDS) {
      return null;
    }

    if (!statsByPhrase.has(normalized)) {
      statsByPhrase.set(normalized, {
        reviewCorrectCount: 0,
        correctionMemoryCount: 0,
        repeatedCorrectCount: 0
      });
    }

    return statsByPhrase.get(normalized);
  };

  for (const review of loadReviews()) {
    const correctedText = review?.correctedText || "";
    const stats = ensureStats(correctedText);
    if (!stats) {
      continue;
    }

    if (review.isCorrect) {
      stats.reviewCorrectCount += 1;
      stats.repeatedCorrectCount += 1;
    }

    if (review.isCorrect && normalizeText(review.heardText || "") !== normalizeText(correctedText)) {
      stats.correctionMemoryCount += 1;
    }
  }

  for (const rule of learnedCorrections) {
    const stats = ensureStats(rule.correct);
    if (!stats) {
      continue;
    }

    stats.correctionMemoryCount += Number(rule.learnedCount || rule.count || 1);
  }

  return statsByPhrase;
}

function getShortPhraseCandidates() {
  const candidatesByText = new Map();

  const addCandidate = (text, options = {}) => {
    const record = normalizePhraseRecord(
      {
        id: options.id,
        text,
        priority: options.priority || 1
      },
      candidatesByText.size
    );

    if (!record || record.tokenCount > SHORT_PHRASE_MAX_WORDS) {
      return;
    }

    const existing = candidatesByText.get(record.normalizedText);
    const source = options.source || "phrase dataset";

    if (existing) {
      existing.priority = Math.max(existing.priority, record.priority);
      if (!existing.sources.includes(source)) {
        existing.sources.push(source);
      }
      return;
    }

    candidatesByText.set(record.normalizedText, {
      ...record,
      sourceId: options.sourceId || options.id || record.id,
      sources: [source]
    });
  };

  for (const phrase of phraseDatasetEntries) {
    if (phrase.tokenCount <= SHORT_PHRASE_MAX_WORDS) {
      addCandidate(phrase.text, {
        id: phrase.id,
        priority: phrase.priority,
        source: "phrase dataset"
      });

      for (const token of phrase.tokens) {
        addCandidate(token, {
          priority: Math.max(1, phrase.priority - 1),
          source: "word dataset"
        });
      }
    }
  }

  for (const entry of SAMPLE_ENTRIES) {
    const tokenCount = tokenizeText(entry.text).length;
    if (
      tokenCount <= SHORT_PHRASE_MAX_WORDS ||
      entry.utteranceType === "short" ||
      entry.groupId === "SHORT"
    ) {
      addCandidate(entry.text, {
        id: entry.id,
        sourceId: entry.sourceId,
        priority: 3,
        source: "short corpus"
      });
    }
  }

  for (const record of getPersonalPhrasebookRecords()) {
    const correctCount = Number(record.correctCount || 0);
    const wrongCount = Number(record.wrongCount || 0);
    if (!record.locked && correctCount < PERSONAL_PHRASE_FAST_LEARN_COUNT) {
      continue;
    }

    addCandidate(record.text, {
      priority: record.locked ? 7 : 6,
      source: record.locked ? "locked personal phrase" : "personal phrasebook"
    });
  }

  const phraseStats = getShortPhraseLearningStats();
  for (const review of loadReviews()) {
    if (review?.correctedText) {
      const normalizedReviewText = normalizeText(review.correctedText);
      const stats = phraseStats.get(normalizedReviewText);
      const hasEnoughEvidence =
        Number(stats?.reviewCorrectCount || 0) >= PERSONAL_PHRASE_FAST_LEARN_COUNT ||
        Number(stats?.correctionMemoryCount || 0) >= PERSONAL_PHRASE_FAST_LEARN_COUNT;

      if (!hasEnoughEvidence) {
        continue;
      }

      addCandidate(review.correctedText, {
        priority: review.isCorrect ? 4 : 3,
        source: review.isCorrect ? "review memory" : "correction memory"
      });
    }
  }

  for (const rule of learnedCorrections) {
    if (rule.correct) {
      addCandidate(rule.correct, {
        priority: Math.min(5, 3 + Math.floor((rule.learnedCount || rule.count || 1) / 3)),
        source: "correction memory"
      });
    }
  }

  return Array.from(candidatesByText.values());
}

function getLearningSourcesForPhrase(candidate, stats, hybridCorrection) {
  const sources = new Set(candidate?.sources || []);

  if (hybridCorrection?.appliedTokenCorrections?.length) {
    sources.add("correction memory");
  }

  if (stats?.correctionMemoryCount > 0) {
    sources.add("correction memory");
  }

  if (stats?.reviewCorrectCount > 0) {
    sources.add("review memory");
  }

  if (stats?.repeatedCorrectCount >= SHORT_PHRASE_REPEAT_THRESHOLD) {
    sources.add("repeated correct phrases");
  }

  return Array.from(sources);
}

function runShortPhraseEngine(inputText, options = {}) {
  const hybridCorrection = runHybridCorrectionPipeline(inputText, {
    trackCorrectionUsage: Boolean(options.trackCorrectionUsage)
  });
  const normalizedInput = normalizeText(inputText);
  const normalizedTextForMatching = hybridCorrection.correctedNormalizedText || normalizedInput;
  const inputTokens = normalizedTextForMatching.split(" ").filter(Boolean);
  const rawInputTokens = normalizedInput.split(" ").filter(Boolean);
  const candidates = getShortPhraseCandidates();
  const learningStats = getShortPhraseLearningStats();
  const confusionPairs = loadConfusionMemory().pairs || [];
  const lockedConfusionCorrection = getLockedPersonalConfusionCorrection(
    normalizedInput,
    confusionPairs
  );
  const scoredCandidates = [];
  let bestMatch = null;

  if (!normalizedInput || !inputTokens.length) {
    return {
      originalText: inputText,
      lightlyCorrectedText: inputText,
      personalizedCorrectedText: inputText,
      correctedText: inputText,
      confidence: 0,
      inputType: "short_phrase",
      engineUsed: "phrase engine",
      learningSources: [],
      topCandidates: [],
      match: null
    };
  }

  if (lockedConfusionCorrection?.correctedText) {
    return {
      originalText: inputText,
      lightlyCorrectedText: lockedConfusionCorrection.correctedText,
      personalizedCorrectedText: lockedConfusionCorrection.correctedText,
      correctedText: lockedConfusionCorrection.correctedText,
      confidence: lockedConfusionCorrection.confidence,
      inputType: "short_phrase",
      engineUsed: "confusion lock",
      learningSources: ["locked confusion memory"],
      topCandidates: [
        {
          id: "confusion-lock",
          sourceId: "confusion-lock",
          text: lockedConfusionCorrection.correctedText,
          score: lockedConfusionCorrection.confidence,
          fullSentenceScore: lockedConfusionCorrection.confidence,
          keywordMatchCount: 0,
          keywordMatchWords: [],
          keywordRatio: 0,
          learningSources: ["locked confusion memory"],
          confusionAdjustment: lockedConfusionCorrection.evidence
        }
      ],
      appliedPhraseCorrections: [],
      suggestedPhraseCorrections: hybridCorrection.suggestedPhraseCorrections,
      appliedPersonalCorrections: [
        {
          wrong: lockedConfusionCorrection.wrongGuessText || inputText,
          correct: lockedConfusionCorrection.correctedText,
          confidence: lockedConfusionCorrection.confidence,
          ngramSize: tokenizeText(inputText).length || 1,
          source: "locked-confusion-memory",
          evidence: lockedConfusionCorrection.evidence
        }
      ],
      suggestedPersonalCorrections: hybridCorrection.suggestedTokenCorrections,
      skippedSentenceMatching: true,
      match: {
        id: "confusion-lock",
        sourceId: "confusion-lock",
        rawScore: lockedConfusionCorrection.confidence,
        secondBestScore: 0,
        matchMargin: lockedConfusionCorrection.confidence,
        keywordMatchCount: 0,
        keywordMatchWords: [],
        topCandidates: []
      }
    };
  }

  for (const candidate of candidates) {
    const stats = learningStats.get(candidate.normalizedText) || null;
    const rawScore = getMatchScore(normalizedTextForMatching, candidate.normalizedText);
    const rawInputScore = getMatchScore(normalizedInput, candidate.normalizedText);
    const rawInputOverlapScore = getTokenOverlapScore(rawInputTokens, candidate.tokens);
    const positionScore = getPositionTokenScore(inputTokens, candidate.tokens);
    const overlapScore = getTokenOverlapScore(inputTokens, candidate.tokens);
    const lengthPenalty = Math.abs(inputTokens.length - candidate.tokenCount) * 0.06;
    const hasRawEvidence =
      rawInputScore >= SHORT_PHRASE_MIN_RAW_SCORE ||
      rawInputOverlapScore >= SHORT_PHRASE_MIN_RAW_OVERLAP ||
      normalizedInput === candidate.normalizedText;
    const weakRawEvidencePenalty = hasRawEvidence ? 0 : 0.28;
    const reviewBoost = Math.min(
      ((stats?.reviewCorrectCount || 0) + (stats?.correctionMemoryCount || 0)) *
        SHORT_PHRASE_REVIEW_BOOST_PER_COUNT,
      SHORT_PHRASE_MAX_REVIEW_BOOST
    );
    const repeatBoost =
      (stats?.repeatedCorrectCount || 0) >= SHORT_PHRASE_REPEAT_THRESHOLD ? 0.06 : 0;
    const priorityBoost = Math.min(candidate.priority || 1, 5) * 0.018;
    const exactBoost = normalizedTextForMatching === candidate.normalizedText ? 0.18 : 0;
    const context = getContextBoost(candidate.text);
    const confusion = getPersonalConfusionAdjustment(
      normalizedTextForMatching,
      candidate.normalizedText,
      confusionPairs
    );
    const confidence = Math.max(
      0,
      Math.min(
        rawScore * 0.68 +
          positionScore * 0.17 +
          overlapScore * 0.09 +
          priorityBoost +
          reviewBoost +
          repeatBoost +
          context.boost +
          exactBoost -
          lengthPenalty +
          confusion.adjustment -
          weakRawEvidencePenalty,
        1
      )
    );
    const learningSources = getLearningSourcesForPhrase(candidate, stats, hybridCorrection);
    const candidateLearningSources = Array.from(
      new Set([...learningSources, ...context.sources, ...confusion.sources])
    );

    scoredCandidates.push({
      id: candidate.id,
      sourceId: candidate.sourceId || candidate.id,
      text: candidate.text,
      score: confidence,
      fullSentenceScore: rawScore,
      rawInputScore,
      rawInputOverlapScore,
      keywordMatchCount: getKeywordMatch(inputTokens, candidate.tokens).count,
      keywordMatchWords: getKeywordMatch(inputTokens, candidate.tokens).words,
      keywordRatio: overlapScore,
      learningSources: candidateLearningSources,
      contextBoost: context.boost,
      confusionAdjustment: confusion.adjustment,
      weakRawEvidencePenalty
    });

    if (!bestMatch || confidence > bestMatch.confidence) {
      bestMatch = {
        candidate,
        confidence,
        rawScore,
        rawInputScore,
        rawInputOverlapScore,
        hasRawEvidence,
        stats,
        learningSources: candidateLearningSources,
        contextBoost: context.boost
      };
    }
  }

  const topCandidates = scoredCandidates
    .slice()
    .sort((left, right) => right.score - left.score)
    .slice(0, 5);
  const personalizedText = hybridCorrection.correctedPhraseOutput || inputText;
  const secondBestScore = topCandidates[1]?.score || 0;
  const matchMargin = Math.max((topCandidates[0]?.score || 0) - secondBestScore, 0);
  const hasPersonalEvidence = Boolean(
    bestMatch?.stats &&
      (Number(bestMatch.stats.reviewCorrectCount || 0) > 0 ||
        Number(bestMatch.stats.correctionMemoryCount || 0) > 0 ||
        Number(bestMatch.stats.repeatedCorrectCount || 0) >= SHORT_PHRASE_REPEAT_THRESHOLD)
  );
  const accepted =
    bestMatch &&
    bestMatch.confidence >= SHORT_PHRASE_ACCEPT_CONFIDENCE &&
    bestMatch.hasRawEvidence &&
    (matchMargin >= SHORT_PHRASE_TEXT_MATCH_MIN_MARGIN ||
      (hasPersonalEvidence && matchMargin >= TEXT_MATCH_MIN_MARGIN) ||
      normalizedTextForMatching === bestMatch.candidate.normalizedText);
  const correctedText = accepted ? bestMatch.candidate.text : personalizedText;

  return {
    originalText: inputText,
    lightlyCorrectedText: personalizedText,
    personalizedCorrectedText: personalizedText,
    phraseCorrectionLayer: hybridCorrection.phraseCorrection,
    tokenCorrectionLayer: hybridCorrection.tokenCorrection,
    correctionLayer: hybridCorrection.tokenCorrection,
    hybridCorrection,
    correctedText,
    confidence: accepted ? bestMatch.confidence : 0,
    inputType: "short_phrase",
    engineUsed: "phrase engine",
    learningSources: accepted ? bestMatch.learningSources : ["phrase dataset"],
    contextBoost: accepted ? bestMatch.contextBoost : 0,
    appliedPhraseCorrections: hybridCorrection.appliedPhraseCorrections,
    suggestedPhraseCorrections: hybridCorrection.suggestedPhraseCorrections,
    appliedPersonalCorrections: hybridCorrection.appliedTokenCorrections,
    suggestedPersonalCorrections: hybridCorrection.suggestedTokenCorrections,
    keywordMatchCount: topCandidates[0]?.keywordMatchCount || 0,
    keywordMatchWords: topCandidates[0]?.keywordMatchWords || [],
    topCandidates,
    skippedSentenceMatching: true,
    match: accepted
      ? {
          id: bestMatch.candidate.id,
          sourceId: bestMatch.candidate.sourceId || bestMatch.candidate.id,
          rawScore: bestMatch.rawScore,
          secondBestScore,
          matchMargin,
          keywordMatchCount: topCandidates[0]?.keywordMatchCount || 0,
          keywordMatchWords: topCandidates[0]?.keywordMatchWords || [],
          topCandidates
        }
      : null
  };
}

function upsertCorrectionRule(wrongValue, correctValue, options = {}) {
  const wrong = normalizeDisplayText(wrongValue);
  const correct = normalizeDisplayText(correctValue);
  const correctNormalized = normalizeText(correct);
  const wrongNormalized = normalizeText(wrong);
  const ngramSize = Math.max(
    1,
    Math.min(MAX_CORRECTION_NGRAM, Number(options.ngramSize || tokenizeText(wrong).length || 1))
  );

  const displayDiffers = wrong !== correct;

  if (!wrongNormalized || !correct || (wrongNormalized === correctNormalized && !displayDiffers)) {
    return null;
  }

  const existing = learnedCorrections.find(
    (item) =>
      normalizeText(item.wrong) === wrongNormalized &&
      normalizeText(item.correct) === correctNormalized
  );

  if (existing) {
    existing.learnedCount =
      Number(existing.learnedCount || existing.count || 1) + Number(options.learnedCount || 1);
    existing.successCount =
      Number(existing.successCount || 0) + Number(options.successCount || 0);
    existing.wrongCount = Number(existing.wrongCount || 0) + Number(options.wrongCount || 0);
    existing.count = existing.learnedCount;
    existing.usedCount = Number(existing.usedCount || 0) + Number(options.usedCount || 0);
    existing.ngramSize = Math.max(existing.ngramSize || 1, ngramSize);
    existing.updatedAt = new Date().toISOString();
    return existing;
  }

  const correction = {
    wrong,
    correct,
    learnedCount: Number(options.learnedCount || 1),
    successCount: Number(options.successCount || 0),
    wrongCount: Number(options.wrongCount || 0),
    count: Number(options.learnedCount || 1),
    usedCount: Number(options.usedCount || 0),
    ngramSize,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  };
  learnedCorrections.push(correction);
  return correction;
}

function learnCorrection(wrongToken, correctToken, options = {}) {
  return upsertCorrectionRule(wrongToken, correctToken, {
    ...options,
    learnedCount: options.learnedCount || 1,
    successCount: options.successCount ?? 1
  });
}

function sortAndTrimCorrections() {
  learnedCorrections = learnedCorrections
    .map(normalizeCorrectionRecord)
    .sort((left, right) => {
      if ((right.ngramSize || 1) !== (left.ngramSize || 1)) {
        return (right.ngramSize || 1) - (left.ngramSize || 1);
      }

      const leftWeight = correctionConfidence(left);
      const rightWeight = correctionConfidence(right);
      return rightWeight - leftWeight;
    })
    .slice(0, 500);
}

function markAppliedCorrectionsSuccessful(appliedRules = []) {
  let changed = false;

  for (const rule of appliedRules) {
    const wrong = normalizeText(rule.wrong);
    const correct = normalizeText(rule.correct);
    const existing = learnedCorrections.find(
      (item) => normalizeText(item.wrong) === wrong && normalizeText(item.correct) === correct
    );

    if (existing) {
      existing.successCount = Number(existing.successCount || 0) + 1;
      existing.count = existing.learnedCount || existing.count || 1;
      existing.updatedAt = new Date().toISOString();
      changed = true;
    }
  }

  if (changed) {
    sortAndTrimCorrections();
    saveCorrections();
  }
}

function markAppliedCorrectionsWrong(appliedRules = []) {
  let changed = false;

  for (const rule of appliedRules) {
    const wrong = normalizeText(rule.wrong);
    const correct = normalizeText(rule.correct);
    const existing = learnedCorrections.find(
      (item) => normalizeText(item.wrong) === wrong && normalizeText(item.correct) === correct
    );

    if (existing) {
      existing.wrongCount = Number(existing.wrongCount || 0) + 1;
      existing.updatedAt = new Date().toISOString();
      changed = true;
    }
  }

  if (changed) {
    sortAndTrimCorrections();
    saveCorrections();
  }
}

function learnFromReview(heardText, correctedText) {
  const wrongTokens = tokenizeText(heardText);
  const correctTokens = tokenizeDisplayText(correctedText);

  if (
    !wrongTokens.length ||
    !correctTokens.length ||
    (wrongTokens.join(" ") === correctTokens.map(normalizeText).join(" ") &&
      normalizeDisplayText(heardText) === normalizeDisplayText(correctedText))
  ) {
    return null;
  }

  const learned = [];
  const pairCount = Math.min(wrongTokens.length, correctTokens.length);

  for (let ngramSize = Math.min(MAX_CORRECTION_NGRAM, pairCount); ngramSize >= 1; ngramSize -= 1) {
    for (let index = 0; index <= pairCount - ngramSize; index += 1) {
      const wrongPhrase = wrongTokens.slice(index, index + ngramSize).join(" ");
      const correctPhrase = correctTokens.slice(index, index + ngramSize).join(" ");

      if (normalizeText(wrongPhrase) !== normalizeText(correctPhrase)) {
        const correction = learnCorrection(wrongPhrase, correctPhrase, { ngramSize });
        if (correction) {
          learned.push(correction);
        }
      }
    }
  }

  if (wrongTokens.length === 1 && correctTokens.length === 1 && !learned.length) {
    const correction = learnCorrection(wrongTokens[0], correctTokens[0]);
    if (correction) {
      learned.push(correction);
    }
  }

  if (!learned.length) {
    return null;
  }

  sortAndTrimCorrections();
  saveCorrections();
  return learned[0];
}

function getCommonPrefixLength(a, b) {
  let index = 0;
  while (index < a.length && index < b.length && a[index] === b[index]) {
    index += 1;
  }

  return index;
}

function levenshteinDistance(a, b) {
  if (a === b) {
    return 0;
  }

  const previousRow = Array.from({ length: b.length + 1 }, (_, index) => index);

  for (let i = 0; i < a.length; i += 1) {
    let diagonal = previousRow[0];
    previousRow[0] = i + 1;

    for (let j = 0; j < b.length; j += 1) {
      const temp = previousRow[j + 1];
      previousRow[j + 1] =
        a[i] === b[j]
          ? diagonal
          : Math.min(diagonal + 1, previousRow[j] + 1, previousRow[j + 1] + 1);
      diagonal = temp;
    }
  }

  return previousRow[b.length];
}

function getCharacterNgrams(value, size = 2) {
  const compactValue = value.replace(/\s+/g, " ");
  if (compactValue.length <= size) {
    return compactValue ? [compactValue] : [];
  }

  const ngrams = [];
  for (let index = 0; index <= compactValue.length - size; index += 1) {
    ngrams.push(compactValue.slice(index, index + size));
  }

  return ngrams;
}

function getDiceCoefficient(leftValue, rightValue) {
  const leftNgrams = getCharacterNgrams(leftValue);
  const rightNgrams = getCharacterNgrams(rightValue);

  if (!leftNgrams.length || !rightNgrams.length) {
    return 0;
  }

  const rightCounts = new Map();
  for (const ngram of rightNgrams) {
    rightCounts.set(ngram, (rightCounts.get(ngram) || 0) + 1);
  }

  let overlap = 0;
  for (const ngram of leftNgrams) {
    const count = rightCounts.get(ngram) || 0;
    if (count > 0) {
      overlap += 1;
      rightCounts.set(ngram, count - 1);
    }
  }

  return (2 * overlap) / (leftNgrams.length + rightNgrams.length);
}

function getWordEditScore(inputTokens, candidateTokens) {
  if (!inputTokens.length || !candidateTokens.length) {
    return 0;
  }

  const inputValue = inputTokens.join(" ");
  const candidateValue = candidateTokens.join(" ");
  const distance = levenshteinDistance(inputValue, candidateValue);
  return 1 - distance / Math.max(inputValue.length, candidateValue.length, 1);
}

function getPositionTokenScore(inputTokens, candidateTokens) {
  if (!inputTokens.length || !candidateTokens.length) {
    return 0;
  }

  let matchedWeight = 0;
  const totalWeight = Math.max(inputTokens.length, candidateTokens.length);

  for (let index = 0; index < totalWeight; index += 1) {
    const inputToken = inputTokens[index] || "";
    const candidateToken = candidateTokens[index] || "";

    if (!inputToken || !candidateToken) {
      continue;
    }

    if (inputToken === candidateToken) {
      matchedWeight += 1;
      continue;
    }

    const editScore =
      1 -
      levenshteinDistance(inputToken, candidateToken) /
        Math.max(inputToken.length, candidateToken.length, 1);

    if (
      editScore >= 0.5 ||
      inputToken.startsWith(candidateToken) ||
      candidateToken.startsWith(inputToken)
    ) {
      matchedWeight += Math.max(editScore, 0.55);
    }
  }

  return matchedWeight / totalWeight;
}

function getTokenOverlapScore(inputTokens, candidateTokens) {
  if (!inputTokens.length || !candidateTokens.length) {
    return 0;
  }

  const candidateSet = new Set(candidateTokens);
  const exactMatches = inputTokens.filter((token) => candidateSet.has(token)).length;
  return exactMatches / Math.max(inputTokens.length, candidateTokens.length);
}

function getLongestContiguousMatchLength(inputTokens, candidateTokens) {
  let longest = 0;

  for (let inputIndex = 0; inputIndex < inputTokens.length; inputIndex += 1) {
    for (let candidateIndex = 0; candidateIndex < candidateTokens.length; candidateIndex += 1) {
      let length = 0;

      while (
        inputTokens[inputIndex + length] &&
        candidateTokens[candidateIndex + length] &&
        inputTokens[inputIndex + length] === candidateTokens[candidateIndex + length]
      ) {
        length += 1;
      }

      longest = Math.max(longest, length);
    }
  }

  return longest;
}

function getOrderedTokenScore(inputTokens, candidateTokens) {
  if (!inputTokens.length || !candidateTokens.length) {
    return 0;
  }

  let inputIndex = 0;
  let orderedMatches = 0;

  for (const candidateToken of candidateTokens) {
    while (inputIndex < inputTokens.length && inputTokens[inputIndex] !== candidateToken) {
      inputIndex += 1;
    }

    if (inputIndex >= inputTokens.length) {
      break;
    }

    orderedMatches += 1;
    inputIndex += 1;
  }

  return orderedMatches / Math.max(Math.min(inputTokens.length, candidateTokens.length), 1);
}

function getContextScore(inputTokens, candidateTokens) {
  if (!inputTokens.length || !candidateTokens.length) {
    return 0;
  }

  const contiguousScore =
    getLongestContiguousMatchLength(inputTokens, candidateTokens) /
    Math.max(Math.min(inputTokens.length, candidateTokens.length), 1);
  const orderedScore = getOrderedTokenScore(inputTokens, candidateTokens);
  const positionScore = getPositionTokenScore(inputTokens, candidateTokens);

  return Math.min(contiguousScore * 0.45 + orderedScore * 0.35 + positionScore * 0.2, 1);
}

function getUniqueTokens(normalizedText) {
  return Array.from(new Set(normalizedText.split(" ").filter(Boolean)));
}

function getKeywordMatch(inputTokens, candidateTokens) {
  return getKeywordMatchFromUnique(getUniqueTokens(inputTokens.join(" ")), candidateTokens);
}

function getKeywordMatchFromUnique(uniqueInputTokens, candidateTokensOrSet) {
  const candidateSet =
    candidateTokensOrSet instanceof Set ? candidateTokensOrSet : new Set(candidateTokensOrSet);
  const matchedTokens = uniqueInputTokens.filter((token) =>
    candidateSet.has(token)
  );

  return {
    count: matchedTokens.length,
    words: matchedTokens
  };
}

function isLongEnoughForSentenceGuess(normalizedText) {
  const tokens = normalizedText.split(" ").filter(Boolean);
  return tokens.length >= MIN_MATCH_WORD_COUNT && normalizedText.length > MIN_MATCH_TEXT_LENGTH;
}

function getPrefixScore(inputNormalized, candidateNormalized) {
  return (
    getCommonPrefixLength(inputNormalized, candidateNormalized) /
    Math.max(inputNormalized.length, candidateNormalized.length, 1)
  );
}

function getMatchScore(inputNormalized, candidateNormalized) {
  const inputTokens = inputNormalized.split(" ").filter(Boolean);
  const candidateTokens = candidateNormalized.split(" ").filter(Boolean);
  const charEditScore =
    1 -
    levenshteinDistance(inputNormalized, candidateNormalized) /
      Math.max(inputNormalized.length, candidateNormalized.length, 1);
  const wordEditScore = getWordEditScore(inputTokens, candidateTokens);
  const ngramScore = getDiceCoefficient(inputNormalized, candidateNormalized);
  const positionTokenScore = getPositionTokenScore(inputTokens, candidateTokens);
  const tokenOverlapScore = getTokenOverlapScore(inputTokens, candidateTokens);
  const prefixScore = getPrefixScore(inputNormalized, candidateNormalized);

  let score =
    charEditScore * 0.34 +
    wordEditScore * 0.2 +
    ngramScore * 0.18 +
    positionTokenScore * 0.16 +
    tokenOverlapScore * 0.08 +
    prefixScore * 0.04;

  if (inputTokens[0] && candidateTokens[0] && inputTokens[0] === candidateTokens[0]) {
    score += 0.03;
  }

  if (inputTokens.length <= 2 && tokenOverlapScore < 0.5) {
    score -= 0.12;
  }

  return Math.max(0, Math.min(score, 1));
}

function normalizeSentenceList(sentences) {
  if (NORMALIZED_SAMPLE_ENTRIES.has(sentences)) {
    return NORMALIZED_SAMPLE_ENTRIES.get(sentences);
  }

  const normalizedSentences = (sentences || [])
    .map((sentence, index) => {
      if (typeof sentence === "string") {
        const text = sentence;
        const normalizedText = normalizeVietnameseText(text);

        const tokens = normalizedText.split(" ").filter(Boolean);

        return {
          id: `S${String(index + 1).padStart(3, "0")}`,
          sourceId: `S${String(index + 1).padStart(3, "0")}`,
          text,
          normalizedText,
          tokens,
          tokenSet: new Set(tokens)
        };
      }

      const text = sentence.text || "";
      const normalizedText = normalizeVietnameseText(text);
      const tokens = normalizedText.split(" ").filter(Boolean);

      return {
        id: sentence.id || `S${String(index + 1).padStart(3, "0")}`,
        sourceId:
          sentence.originalId ||
          sentence.sourceId ||
          sentence.id ||
          `S${String(index + 1).padStart(3, "0")}`,
        text,
        normalizedText,
        tokens,
        tokenSet: new Set(tokens)
      };
    })
    .filter((sentence) => sentence.text.trim());

  if (Array.isArray(sentences)) {
    NORMALIZED_SAMPLE_ENTRIES.set(sentences, normalizedSentences);
  }

  return normalizedSentences;
}

function normalizeSentenceListLegacy(sentences) {
  return (sentences || [])
    .map((sentence, index) => {
      if (typeof sentence === "string") {
        return {
          id: `S${String(index + 1).padStart(3, "0")}`,
          sourceId: `S${String(index + 1).padStart(3, "0")}`,
          text: sentence
        };
      }

      return {
        id: sentence.id || `S${String(index + 1).padStart(3, "0")}`,
        sourceId:
          sentence.originalId ||
          sentence.sourceId ||
          sentence.id ||
          `S${String(index + 1).padStart(3, "0")}`,
        text: sentence.text || ""
      };
    })
    .filter((sentence) => sentence.text.trim());
}

function findBestMatch(inputText, sentences, options = {}) {
  if (!options.forceSentenceEngine && detectInputType(inputText) === "short_phrase") {
    return runShortPhraseEngine(inputText, options);
  }

  const inputNormalized = normalizeText(inputText);
  const hybridCorrection = runHybridCorrectionPipeline(inputText, {
    trackCorrectionUsage: Boolean(options.trackCorrectionUsage)
  });
  const normalizedTextForMatching = hybridCorrection.correctedNormalizedText || inputNormalized;
  const sentenceEntries = normalizeSentenceList(sentences);
  const inputTokens = normalizedTextForMatching.split(" ").filter(Boolean);
  const uniqueInputTokens = getUniqueTokens(normalizedTextForMatching);
  const confusionPairs = loadConfusionMemory().pairs || [];

  if (
    !inputNormalized ||
    !isLongEnoughForSentenceGuess(normalizedTextForMatching) ||
    sentenceEntries.length === 0
  ) {
    return {
      originalText: inputText,
      lightlyCorrectedText: hybridCorrection.correctedPhraseOutput || inputText,
      personalizedCorrectedText: hybridCorrection.correctedPhraseOutput || inputText,
      phraseCorrectionLayer: hybridCorrection.phraseCorrection,
      tokenCorrectionLayer: hybridCorrection.tokenCorrection,
      correctionLayer: hybridCorrection.tokenCorrection,
      hybridCorrection,
      correctedText: inputText,
      confidence: 0,
      appliedPhraseCorrections: hybridCorrection.appliedPhraseCorrections,
      suggestedPhraseCorrections: hybridCorrection.suggestedPhraseCorrections,
      appliedPersonalCorrections: hybridCorrection.appliedTokenCorrections,
      suggestedPersonalCorrections: hybridCorrection.suggestedTokenCorrections,
      keywordMatchCount: 0,
      keywordMatchWords: [],
      topCandidates: [],
      inputType: "sentence",
      engineUsed: "sentence engine",
      learningSources: hybridCorrection.appliedTokenCorrections.length ? ["correction memory"] : [],
      skippedReason: "input-too-short",
      match: null
    };
  }

  let bestMatch = null;
  let secondBestScore = 0;
  const scoredCandidates = [];
  const prefilteredCandidates = sentenceEntries
    .map((entry) => {
      const candidateNormalized = entry.normalizedText || normalizeVietnameseText(entry.text);
      const candidateTokens = entry.tokens || candidateNormalized.split(" ").filter(Boolean);
      const keywordMatch = getKeywordMatchFromUnique(uniqueInputTokens, entry.tokenSet || candidateTokens);
      const keywordRatio =
        keywordMatch.count / Math.max(Math.min(inputTokens.length, candidateTokens.length), 1);

      return {
        entry,
        candidateNormalized,
        keywordMatch,
        keywordRatio
      };
    })
    .sort((left, right) => {
      if (right.keywordMatch.count !== left.keywordMatch.count) {
        return right.keywordMatch.count - left.keywordMatch.count;
      }

      return right.keywordRatio - left.keywordRatio;
    })
    .slice(0, KEYWORD_PREFILTER_LIMIT);

  for (const candidate of prefilteredCandidates) {
    const entry = candidate.entry;
    const candidateNormalized = candidate.candidateNormalized;
    const candidateTokens = entry.tokens || candidateNormalized.split(" ").filter(Boolean);
    const rawScore = getMatchScore(normalizedTextForMatching, candidateNormalized);
    const contextScore = getContextScore(inputTokens, candidateTokens);
    const personalContext = getContextBoost(entry.text);
    const keywordBoost = Math.min(candidate.keywordMatch.count * 0.035, 0.16);
    const confusion = getPersonalConfusionAdjustment(
      normalizedTextForMatching,
      candidateNormalized,
      confusionPairs
    );
    const combinedScore = Math.max(
      0,
      Math.min(
        rawScore * 0.68 +
          contextScore * 0.18 +
          candidate.keywordRatio * 0.14 +
          keywordBoost +
          personalContext.boost * 0.65 +
          confusion.adjustment,
        1
      )
    );
    const candidateLearningSources = Array.from(
      new Set([...personalContext.sources, ...confusion.sources])
    );
    scoredCandidates.push({
      id: entry.id,
      sourceId: entry.sourceId,
      text: entry.text,
      score: combinedScore,
      fullSentenceScore: rawScore,
      contextScore,
      keywordMatchCount: candidate.keywordMatch.count,
      keywordMatchWords: candidate.keywordMatch.words,
      keywordRatio: candidate.keywordRatio,
      contextBoost: personalContext.boost,
      confusionAdjustment: confusion.adjustment,
      learningSources: candidateLearningSources
    });

    if (!bestMatch || combinedScore > bestMatch.rawScore) {
      if (bestMatch) {
        secondBestScore = bestMatch.rawScore;
      }
      bestMatch = {
        id: entry.id,
        sourceId: entry.sourceId,
        originalText: inputText,
        lightlyCorrectedText:
          hybridCorrection.appliedPhraseCorrections.length ||
          hybridCorrection.appliedTokenCorrections.length
          ? hybridCorrection.correctedPhraseOutput || normalizedTextForMatching
          : inputText,
        personalizedCorrectedText: hybridCorrection.correctedPhraseOutput || inputText,
        phraseCorrectionLayer: hybridCorrection.phraseCorrection,
        tokenCorrectionLayer: hybridCorrection.tokenCorrection,
        correctionLayer: hybridCorrection.tokenCorrection,
        hybridCorrection,
        appliedPhraseCorrections: hybridCorrection.appliedPhraseCorrections,
        suggestedPhraseCorrections: hybridCorrection.suggestedPhraseCorrections,
        appliedPersonalCorrections: hybridCorrection.appliedTokenCorrections,
        suggestedPersonalCorrections: hybridCorrection.suggestedTokenCorrections,
        correctedText: entry.text,
        rawScore: combinedScore,
        fullSentenceScore: rawScore,
        contextScore,
        keywordMatchCount: candidate.keywordMatch.count,
        keywordMatchWords: candidate.keywordMatch.words,
        secondBestScore,
        confidence: rawScore,
        inputType: "sentence",
        engineUsed: "sentence engine",
        learningSources: [
          ...(hybridCorrection.appliedTokenCorrections.length ? ["correction memory"] : []),
          ...candidateLearningSources
        ],
        contextBoost: personalContext.boost
      };
    } else if (combinedScore > secondBestScore) {
      secondBestScore = combinedScore;
    }
  }
  const topCandidates = scoredCandidates
    .slice()
    .sort((left, right) => right.score - left.score)
    .slice(0, 5);

  if (!bestMatch || bestMatch.rawScore < MIN_CORRECTION_SCORE) {
    return {
      originalText: inputText,
      lightlyCorrectedText:
        hybridCorrection.appliedPhraseCorrections.length ||
        hybridCorrection.appliedTokenCorrections.length
        ? hybridCorrection.correctedPhraseOutput || normalizedTextForMatching
        : inputText,
      personalizedCorrectedText: hybridCorrection.correctedPhraseOutput || inputText,
      phraseCorrectionLayer: hybridCorrection.phraseCorrection,
      tokenCorrectionLayer: hybridCorrection.tokenCorrection,
      correctionLayer: hybridCorrection.tokenCorrection,
      hybridCorrection,
      correctedText:
        hybridCorrection.appliedPhraseCorrections.length ||
        hybridCorrection.appliedTokenCorrections.length
        ? hybridCorrection.correctedPhraseOutput || normalizedTextForMatching
        : inputText,
      confidence: 0,
      appliedPhraseCorrections: hybridCorrection.appliedPhraseCorrections,
      suggestedPhraseCorrections: hybridCorrection.suggestedPhraseCorrections,
      appliedPersonalCorrections: hybridCorrection.appliedTokenCorrections,
      suggestedPersonalCorrections: hybridCorrection.suggestedTokenCorrections,
      keywordMatchCount: bestMatch?.keywordMatchCount || 0,
      keywordMatchWords: bestMatch?.keywordMatchWords || [],
      topCandidates,
      inputType: "sentence",
      engineUsed: "sentence engine",
      learningSources: hybridCorrection.appliedTokenCorrections.length ? ["correction memory"] : [],
      match: null
    };
  }

  const margin = Math.max(bestMatch.rawScore - secondBestScore, 0);
  bestMatch.secondBestScore = secondBestScore;
  bestMatch.confidence = Math.min(bestMatch.rawScore + margin * 0.4, 1);
  bestMatch.match = {
    id: bestMatch.id,
    sourceId: bestMatch.sourceId,
    rawScore: bestMatch.rawScore,
    secondBestScore: bestMatch.secondBestScore,
    keywordMatchCount: bestMatch.keywordMatchCount,
    keywordMatchWords: bestMatch.keywordMatchWords,
    contextScore: bestMatch.contextScore,
    topCandidates
  };
  bestMatch.topCandidates = topCandidates;

  return bestMatch;
}

function findClosestSampleSentence(inputText) {
  const match = findBestMatch(inputText, getCandidateEntriesForLocalRecognition());
  return match.confidence > 0 ? match : null;
}

function getSentenceMatchScore(sourceText, transcriptValue) {
  const sourceNormalized = normalizeVietnameseText(sourceText);
  const transcriptNormalized = normalizeVietnameseText(transcriptValue);

  if (!sourceNormalized || !transcriptNormalized) {
    return 0;
  }

  return getMatchScore(transcriptNormalized, sourceNormalized);
}

function canUseLearnedAudioFallbackAfterStt(sttMatchResult) {
  const transcriptNormalized = normalizeVietnameseText(sttMatchResult?.transcript || "");

  if (!isLongEnoughForSentenceGuess(transcriptNormalized)) {
    return false;
  }

  const currentTarget = getCurrentTargetEntryForLocalRecognition();
  if (!currentTarget?.text) {
    return true;
  }

  const transcriptTokens = transcriptNormalized.split(" ").filter(Boolean);
  const targetNormalized = normalizeVietnameseText(currentTarget.text);
  const targetTokens = targetNormalized.split(" ").filter(Boolean);
  const keywordMatch = getKeywordMatch(transcriptTokens, targetTokens);
  const targetMatchScore = getSentenceMatchScore(currentTarget.text, sttMatchResult.transcript);
  const requiredKeywordCount = Math.min(2, transcriptTokens.length);

  return keywordMatch.count >= requiredKeywordCount || targetMatchScore >= MIN_CORRECTION_SCORE;
}

function notifyRecognitionResult() {
  const correctedTranscript =
    matchedSentence && matchedSentence.confidence >= AUTO_CORRECTION_SCORE
      ? matchedSentence.correctedText
      : matchedSentence?.personalizedCorrectedText || recognizedTranscript;

  lastRecognitionResult = {
    recognizedTranscript,
    heardText: recognizedTranscript,
    correctedTranscript,
    playbackTranscript: finalTranscript,
    matchedText: matchedSentence?.correctedText || "",
    matchScore: matchedSentence?.confidence || 0,
    matchPercent: Math.round((matchedSentence?.confidence || 0) * 100),
    usedCorrection: correctedTranscript !== recognizedTranscript,
    phraseCorrectionLayer: matchedSentence?.phraseCorrectionLayer || null,
    tokenCorrectionLayer: matchedSentence?.tokenCorrectionLayer || null,
    hybridCorrection: matchedSentence?.hybridCorrection || null,
    correctionLayer: matchedSentence?.correctionLayer || null,
    appliedPhraseCorrections: matchedSentence?.appliedPhraseCorrections || [],
    suggestedPhraseCorrections: matchedSentence?.suggestedPhraseCorrections || [],
    appliedPersonalCorrections: matchedSentence?.appliedPersonalCorrections || [],
    suggestedPersonalCorrections: matchedSentence?.suggestedPersonalCorrections || [],
    inputType: matchedSentence?.inputType || "",
    engineUsed: matchedSentence?.engineUsed || "",
    learningSources: matchedSentence?.learningSources || [],
    trust: loadSampleTrustStore()[getTrustKeyFromMatch(matchedSentence?.match)] || null,
    context: getContextBoost(matchedSentence?.correctedText || correctedTranscript || ""),
    timing: matchedSentence?.timing || null,
    createdAt: new Date().toISOString()
  };

  window.dispatchEvent(
    new CustomEvent("voicecoach:recognition-result", {
      detail: lastRecognitionResult
    })
  );
}

function clearAutoReplayTimer() {
  if (autoReplayTimer === null) {
    return;
  }

  window.clearTimeout(autoReplayTimer);
  autoReplayTimer = null;
}

function stopCurrentPlayback() {
  activePlaybackId += 1;
  synth?.cancel?.();
}

function cancelPlayback() {
  clearAutoReplayTimer();
  stopCurrentPlayback();
}

function releaseLocalRecognitionStream() {
  if (localRecognitionLevelTimer !== null) {
    window.clearInterval(localRecognitionLevelTimer);
    localRecognitionLevelTimer = null;
  }

  if (localRecognitionSilenceTimer !== null) {
    window.clearTimeout(localRecognitionSilenceTimer);
    localRecognitionSilenceTimer = null;
  }

  if (localRecognitionAudioContext && typeof localRecognitionAudioContext.close === "function") {
    localRecognitionAudioContext.close().catch(() => {});
  }

  localRecognitionAudioContext = null;
  localRecognitionAnalyser = null;

  if (!localRecognitionStream) {
    return;
  }

  for (const track of localRecognitionStream.getTracks()) {
    track.stop();
  }

  localRecognitionStream = null;
}

function clearLocalRecognitionTimer() {
  if (localRecognitionStopTimer === null) {
    return;
  }

  window.clearTimeout(localRecognitionStopTimer);
  localRecognitionStopTimer = null;
}

function getLocalRecognitionRecordingMs() {
  return localRecognitionStartedAt ? performance.now() - localRecognitionStartedAt : 0;
}

function resetLocalRecognitionAudioStats() {
  localRecognitionAudioStats = {
    frameCount: 0,
    totalRms: 0,
    maxRms: 0,
    noiseFrameCount: 0,
    noiseTotalRms: 0,
    speechFrameCount: 0,
    speechMs: 0,
    sampleIntervalMs: 100
  };
}

function updateLocalRecognitionAudioStats(rms, recordingMs) {
  if (!localRecognitionAudioStats) {
    resetLocalRecognitionAudioStats();
  }

  localRecognitionAudioStats.frameCount += 1;
  localRecognitionAudioStats.totalRms += rms;
  localRecognitionAudioStats.maxRms = Math.max(localRecognitionAudioStats.maxRms, rms);

  if (recordingMs <= LOCAL_RECOGNITION_NOISE_SAMPLE_MS) {
    localRecognitionAudioStats.noiseFrameCount += 1;
    localRecognitionAudioStats.noiseTotalRms += rms;
    return;
  }

  const noiseFloor =
    localRecognitionAudioStats.noiseFrameCount > 0
      ? localRecognitionAudioStats.noiseTotalRms / localRecognitionAudioStats.noiseFrameCount
      : 0;
  const speechThreshold = Math.max(
    LOCAL_RECOGNITION_SPEECH_RMS,
    noiseFloor * LOCAL_RECOGNITION_SPEECH_NOISE_RATIO
  );

  if (rms >= speechThreshold) {
    localRecognitionAudioStats.speechFrameCount += 1;
    localRecognitionAudioStats.speechMs += localRecognitionAudioStats.sampleIntervalMs;
  }
}

function hasLocalRecognitionSpeech(blob) {
  if (!blob?.size) {
    return false;
  }

  if (!localRecognitionAudioStats?.frameCount) {
    return true;
  }

  const averageRms =
    localRecognitionAudioStats.totalRms / Math.max(localRecognitionAudioStats.frameCount, 1);
  const noiseFloor =
    localRecognitionAudioStats.noiseFrameCount > 0
      ? localRecognitionAudioStats.noiseTotalRms / localRecognitionAudioStats.noiseFrameCount
      : 0;
  const dynamicPeakThreshold = Math.max(
    LOCAL_RECOGNITION_MIN_PEAK_RMS,
    noiseFloor * LOCAL_RECOGNITION_SPEECH_NOISE_RATIO
  );
  const hasClearSpeech =
    localRecognitionAudioStats.maxRms >= LOCAL_RECOGNITION_MIN_PEAK_RMS &&
    localRecognitionAudioStats.speechMs >= LOCAL_RECOGNITION_MIN_SPEECH_MS;
  const hasShortSpeech =
    blob.size >= LOCAL_RECOGNITION_MIN_AUDIO_BYTES &&
    localRecognitionAudioStats.maxRms >= dynamicPeakThreshold &&
    averageRms >= noiseFloor * 1.12;

  return (
    hasClearSpeech ||
    hasShortSpeech
  );
}

function startLocalSilenceDetection(stream) {
  const AudioContextClass = window.AudioContext || window.webkitAudioContext;

  if (!AudioContextClass) {
    return;
  }

  localRecognitionAudioContext = new AudioContextClass();
  const source = localRecognitionAudioContext.createMediaStreamSource(stream);
  localRecognitionAnalyser = localRecognitionAudioContext.createAnalyser();
  localRecognitionAnalyser.fftSize = 1024;
  source.connect(localRecognitionAnalyser);

  const samples = new Float32Array(localRecognitionAnalyser.fftSize);
  localRecognitionLevelTimer = window.setInterval(() => {
    if (!localRecognitionAnalyser || appState !== UI_STATES.LISTENING) {
      return;
    }

    localRecognitionAnalyser.getFloatTimeDomainData(samples);
    let sum = 0;
    for (const sample of samples) {
      sum += sample * sample;
    }

    const rms = Math.sqrt(sum / samples.length);
    const recordingMs = getLocalRecognitionRecordingMs();
    updateLocalRecognitionAudioStats(rms, recordingMs);

    if (rms >= LOCAL_RECOGNITION_SILENCE_RMS) {
      if (localRecognitionSilenceTimer !== null) {
        window.clearTimeout(localRecognitionSilenceTimer);
        localRecognitionSilenceTimer = null;
      }
      return;
    }

    if (
      recordingMs >= LOCAL_RECOGNITION_MIN_RECORDING_MS &&
      localRecognitionSilenceTimer === null
    ) {
      localRecognitionSilenceTimer = window.setTimeout(() => {
        localRecognitionSilenceTimer = null;
        stopLocalRecognition();
      }, LOCAL_RECOGNITION_SILENCE_STOP_MS);
    }
  }, 100);
}

function stopLocalRecognition() {
  clearLocalRecognitionTimer();

  if (
    localRecognitionRecorder &&
    localRecognitionRecorder.state !== "inactive"
  ) {
    setAppState(UI_STATES.PROCESSING, "Đang xử lý...");
    localRecognitionRecorder.stop();
    return;
  }

  releaseLocalRecognitionStream();
}

function formatTimingMs(value) {
  return `${Math.round(value || 0)}ms`;
}

function formatRecognitionTiming(timing) {
  if (!timing) {
    return "";
  }

  const parts = [
    `ghi âm ${formatTimingMs(timing.recordingMs)}`,
    `chờ cache ${formatTimingMs(timing.cacheWaitMs)}`,
    `upload+STT ${formatTimingMs(timing.transcribeMs)}`,
    `match text ${formatTimingMs(timing.textMatchMs)}`,
    `match audio ${formatTimingMs(timing.audioMatchMs)}`,
    `tổng ${formatTimingMs(timing.totalMs)}`
  ];

  return ` Timing: ${parts.join(", ")}.`;
}

function yieldToUi() {
  return new Promise((resolve) => window.setTimeout(resolve, 0));
}

function timeoutAfter(ms, fallbackValue = null) {
  return new Promise((resolve) => {
    window.setTimeout(() => resolve(fallbackValue), ms);
  });
}

function getCurrentPackTextsForAiArbiter() {
  const allowedIds = new Set(window.voiceRecorderControls?.getCurrentPackSentenceIds?.() || []);

  if (!allowedIds.size) {
    return [];
  }

  return SAMPLE_ENTRIES
    .filter((entry) => allowedIds.has(entry.id) || allowedIds.has(entry.sourceId))
    .map((entry) => entry.text)
    .slice(0, 10);
}

function buildAiArbiterPayload(matchResult) {
  const currentTarget = getCurrentTargetEntryForLocalRecognition();

  return {
    rawStt: matchResult.transcript || matchResult.rawText || "",
    appGuess: matchResult.correctedText || "",
    personalizedText: matchResult.personalizedCorrectedText || "",
    confidence: matchResult.confidence || 0,
    inputType: matchResult.inputType || "",
    engineUsed: matchResult.engineUsed || matchResult.engine || "",
    usedForPlayback: Boolean(matchResult.usedForPlayback),
    topCandidates: matchResult.topCandidates || matchResult.match?.topCandidates || [],
    appliedPhraseCorrections: matchResult.appliedPhraseCorrections || [],
    appliedPersonalCorrections: matchResult.appliedPersonalCorrections || [],
    recentReviews: loadReviews().slice(-12),
    personalPhrases: getPersonalPhrasebookRecords().slice(0, 20),
    currentTargetText: currentTarget?.text || "",
    currentPackTexts: getCurrentPackTextsForAiArbiter()
  };
}

async function requestAiArbiterDecision(matchResult) {
  const controller = new AbortController();
  const timeout = window.setTimeout(() => controller.abort(), AI_ARBITER_TIMEOUT_MS);

  try {
    const response = await fetch("/api/ai-arbiter", {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify(buildAiArbiterPayload(matchResult)),
      signal: controller.signal
    });
    const payload = await response.json().catch(() => ({}));

    if (!response.ok || !payload?.decision) {
      return null;
    }

    return payload.decision;
  } catch (error) {
    console.warn("AI arbiter unavailable:", error.message);
    return null;
  } finally {
    window.clearTimeout(timeout);
  }
}

function applyAiArbiterDecision(matchResult, decision) {
  if (!decision?.finalText) {
    return matchResult;
  }

  const finalText = normalizeDisplayText(decision.finalText);
  if (!finalText) {
    return matchResult;
  }

  const confidence = Math.max(
    Number(matchResult.confidence || 0),
    Number(decision.confidence || 0)
  );
  const commonFields = {
    ...matchResult,
    aiDecision: decision,
    aiArbitrated: true,
    aiReason: decision.reason || "",
    correctedText: finalText,
    personalizedCorrectedText: finalText,
    confidence,
    engineUsed: `${matchResult.engineUsed || matchResult.engine || "recognition"} + AI arbiter`,
    learningSources: Array.from(new Set([...(matchResult.learningSources || []), "AI arbiter"]))
  };

  if (decision.decision === "use_raw" || decision.decision === "learn_new_phrase") {
    return {
      ...commonFields,
      isFreeSpeech: true,
      inputType: "free_speech",
      appliedPhraseCorrections: [],
      appliedPersonalCorrections: [],
      usedForPlayback: decision.decision === "learn_new_phrase"
        ? false
        : normalizeText(finalText) !== normalizeText(matchResult.transcript || "") &&
          Boolean(decision.shouldAutoSpeak) &&
          confidence >= AI_ARBITER_MIN_AUTOSPEAK_CONFIDENCE
    };
  }

  if (decision.decision === "ask_user") {
    return {
      ...commonFields,
      confidence: Math.min(confidence, ASK_CONFIRMATION_SCORE - 0.01),
      isConfirmed: false,
      usedForPlayback: false
    };
  }

  return {
    ...commonFields,
    usedForPlayback:
      Boolean(decision.shouldAutoSpeak) &&
      confidence >= AI_ARBITER_MIN_AUTOSPEAK_CONFIDENCE
  };
}

async function applyAiArbiter(matchResult) {
  if (!matchResult?.transcript) {
    return matchResult;
  }

  const isHighConfidenceLocalResult =
    matchResult.confidence >= 0.9 &&
    (matchResult.inputType === "short_phrase" ||
      normalizeText(matchResult.correctedText || "") === normalizeText(matchResult.transcript || "")) &&
    isTextMatchStable(matchResult);

  if (isHighConfidenceLocalResult) {
    return {
      ...matchResult,
      aiSkipped: true,
      aiReason: "local result was already stable"
    };
  }

  const decision = await requestAiArbiterDecision(matchResult);
  return decision ? applyAiArbiterDecision(matchResult, decision) : matchResult;
}

function getAudioMatchMargin(matchResult) {
  const rawScore = Number(
    matchResult?.match?.rawConfidence ??
      matchResult?.match?.rawScore ??
      matchResult?.topMatches?.[0]?.score ??
      0
  );
  const secondBestScore = Number(
    matchResult?.match?.secondBestScore ??
      matchResult?.topMatches?.[1]?.score ??
      0
  );

  return Math.max(rawScore - secondBestScore, 0);
}

function isAudioMatchStable(matchResult, options = {}) {
  if (!matchResult?.correctedText) {
    return false;
  }

  const margin = getAudioMatchMargin(matchResult);
  const requiredMargin = options.locked
    ? AUDIO_MATCH_LOCKED_MIN_MARGIN
    : AUDIO_MATCH_MIN_MARGIN;

  return margin >= requiredMargin;
}

function getTextMatchMargin(matchResult) {
  const rawScore = Number(matchResult?.match?.rawConfidence ?? matchResult?.confidence ?? 0);
  const secondBestScore = Number(matchResult?.match?.secondBestScore ?? 0);
  return Math.max(rawScore - secondBestScore, 0);
}

function isTextMatchStable(matchResult) {
  if (!matchResult?.match) {
    return true;
  }

  const correctedTokenCount = tokenizeText(matchResult.correctedText || "").length;
  const transcriptNormalized = normalizeText(matchResult.transcript || matchResult.originalText || "");
  const correctedNormalized = normalizeText(matchResult.correctedText || "");
  const exactMatch = Boolean(transcriptNormalized && transcriptNormalized === correctedNormalized);
  const requiredMargin =
    matchResult.inputType === "short_phrase" || correctedTokenCount <= SHORT_PHRASE_MAX_WORDS
      ? SHORT_PHRASE_TEXT_MATCH_MIN_MARGIN
      : SENTENCE_TEXT_MATCH_MIN_MARGIN;

  return exactMatch || getTextMatchMargin(matchResult) >= requiredMargin;
}

function finishLocalRecognition(matchResult) {
  if (!matchResult?.correctedText) {
    recognizedTranscript = "";
    finalTranscript = "";
    matchedSentence = null;
    renderStableTranscript();
    renderMatchedSentence(null);
    setAppState(
      UI_STATES.ERROR,
      "Không đoán được câu từ audio local. Hãy thu thêm mẫu hoặc đọc lại rõ hơn."
    );
    return;
  }

  const correctedTokenCount = normalizeVietnameseText(matchResult.correctedText || "")
    .split(/\s+/)
    .filter(Boolean).length;
  const canUseLockedLearnedPhrasePlayback =
    matchResult.source === "learned-audio" &&
    correctedTokenCount > 0 &&
    correctedTokenCount <= SHORT_PHRASE_MAX_WORDS &&
    matchResult.confidence >= LOCKED_LEARNED_AUDIO_SCORE &&
    isAudioMatchStable(matchResult, { locked: true });
  const canUseShortPhrasePlayback =
    canUseLockedLearnedPhrasePlayback ||
    ((matchResult.engine === "audio-template" ||
        matchResult.source === "learned-audio" ||
        matchResult.inputType === "short_phrase") &&
      correctedTokenCount > 0 &&
      correctedTokenCount <= SHORT_PHRASE_MAX_WORDS &&
      (matchResult.source === "local-stt" ||
        (matchResult.engine !== "audio-template" && matchResult.source !== "learned-audio") ||
        isAudioMatchStable(matchResult)) &&
      isTextMatchStable(matchResult) &&
      matchResult.confidence >=
        (matchResult.inputType === "short_phrase" ? SHORT_PHRASE_AUTO_CONFIDENCE : FAST_AUDIO_ACCEPT_SCORE));
  const canUseFreeSpeechPlayback =
    matchResult.source === "local-stt" &&
    matchResult.isFreeSpeech &&
    normalizeText(matchResult.correctedText || "") !== normalizeText(matchResult.transcript || "") &&
    isLongEnoughForSentenceGuess(normalizeVietnameseText(matchResult.correctedText || ""));
  const canUseAiArbiterPlayback =
    matchResult.aiArbitrated &&
    matchResult.usedForPlayback &&
    matchResult.confidence >= AI_ARBITER_MIN_AUTOSPEAK_CONFIDENCE;
  const canUseCorrectionForPlayback =
    canUseAiArbiterPlayback ||
    canUseShortPhrasePlayback ||
    (matchResult.confidence >= ASK_CONFIRMATION_SCORE &&
      (isLongEnoughForSentenceGuess(normalizeVietnameseText(matchResult.correctedText || "")) ||
        canUseShortPhrasePlayback)) ||
    (canUseFreeSpeechPlayback && matchResult.confidence >= ASK_CONFIRMATION_SCORE);
  recognizedTranscript = matchResult.transcript || matchResult.correctedText;
  finalTranscript = canUseCorrectionForPlayback
    ? matchResult.correctedText
    : matchResult.personalizedCorrectedText || recognizedTranscript;
  matchedSentence = {
    rawText: matchResult.transcript || matchResult.correctedText,
    originalText: matchResult.source === "local-stt"
      ? matchResult.isFreeSpeech
        ? `Câu mới từ STT local: ${matchResult.transcript}`
        : `${matchResult.engine} nghe: ${matchResult.transcript}`
      : matchResult.source === "learned-audio"
      ? `Audio đã sửa trước đó -> ${matchResult.match?.sourceSentenceId || "learned-audio"}`
      : matchResult.match
      ? matchResult.engine === "audio-template"
        ? `Audio cache -> ${matchResult.match.sourceSentenceId || matchResult.match.sentenceId}, take ${
            matchResult.match.take
          }`
        : `Audio local -> ${matchResult.match.sourceSentenceId || matchResult.match.sentenceId}, take ${
            matchResult.match.take
          }`
      : "Audio local từ mẫu giọng",
    lightlyCorrectedText: matchResult.personalizedCorrectedText || matchResult.correctedText,
    personalizedCorrectedText: matchResult.personalizedCorrectedText || matchResult.correctedText,
    correctedText: matchResult.correctedText,
    confidence: matchResult.confidence || 0,
    phraseCorrectionLayer: matchResult.phraseCorrectionLayer || matchResult.hybridCorrection?.phraseCorrection || null,
    tokenCorrectionLayer: matchResult.tokenCorrectionLayer || matchResult.hybridCorrection?.tokenCorrection || null,
    hybridCorrection: matchResult.hybridCorrection || null,
    appliedPhraseCorrections: matchResult.appliedPhraseCorrections || [],
    suggestedPhraseCorrections: matchResult.suggestedPhraseCorrections || [],
    appliedPersonalCorrections: matchResult.appliedPersonalCorrections || [],
    suggestedPersonalCorrections: matchResult.suggestedPersonalCorrections || [],
    keywordMatchCount: matchResult.keywordMatchCount,
    keywordMatchWords: matchResult.keywordMatchWords,
    topCandidates: matchResult.topCandidates,
    inputType: matchResult.inputType || detectInputType(matchResult.transcript || matchResult.correctedText),
    engineUsed: matchResult.engineUsed || matchResult.engine || "",
    learningSources: matchResult.learningSources || [],
    match: matchResult.match || null,
    timing: matchResult.timing || null,
    usedForPlayback: canUseCorrectionForPlayback,
    debugText: `${matchResult.topMatches?.length
      ? `Đang so ${matchResult.scoredTemplateCount || matchResult.candidateCount || 0}/${
          matchResult.candidateCount || 0
        } ứng viên (${matchResult.templateCount || 0} mẫu tổng). Top: ${matchResult.topMatches
          .map((item) => `${item.sourceSentenceId || item.sentenceId} ${item.percent}%`)
          .join(", ")}.`
      : matchResult.source === "local-stt"
        ? `STT local: ${matchResult.engine}${matchResult.model ? ` (${matchResult.model})` : ""}.${
            matchResult.isFreeSpeech ? " Câu mới ngoài bộ mẫu, dùng transcript đã sửa cá nhân." : ""
          }`
      : matchResult.source === "learned-audio"
        ? `Mẫu học từ các lần đánh dấu sai: ${matchResult.templateCount || 0} mẫu.`
      : ""}${matchResult.aiArbitrated ? ` AI arbiter: ${matchResult.aiReason || "đã phân xử raw/guess"}.` : ""}${formatRecognitionTiming(matchResult.timing)}`
  };

  if (matchResult.topMatches?.length) {
    console.table(matchResult.topMatches);
  }

  renderTranscript(recognizedTranscript, "final");
  emitRecognitionPreview(recognizedTranscript, "final");
  renderMatchedSentence(matchedSentence, canUseCorrectionForPlayback);
  notifyRecognitionResult();

  if (canUseCorrectionForPlayback) {
    updateContextMemory(finalTranscript, matchResult.source || matchResult.engine || "recognition");
  }

  if (hasSpeechPlayback() && canUseCorrectionForPlayback) {
    setAppState(UI_STATES.PROCESSING, "Đã nhận diện xong, app sẽ phát lại sau 0.5 giây");
    scheduleAutoReplay();
  } else if (hasSpeechPlayback()) {
    setAppState(UI_STATES.READY, "Đã nhận diện xong, confidence thấp nên app không tự phát nguyên câu");
  } else {
    setAppState(UI_STATES.READY, "Đã nhận diện xong, nhưng trình duyệt này không hỗ trợ phát lại");
  }
}

async function transcribeAudioWithLocalServer(blob) {
  const startedAt = performance.now();
  const response = await fetch("/api/transcribe", {
    method: "POST",
    headers: {
      "Content-Type": blob.type || "audio/webm"
    },
    body: blob
  });
  const payload = await response.json().catch(() => ({}));

  if (!response.ok) {
    throw new Error(payload.error || "Local STT server failed.");
  }

  return {
    ...payload,
    clientTranscribeMs: performance.now() - startedAt
  };
}

function buildMatchResultFromTranscript(transcriptionResult) {
  const transcript = (transcriptionResult.transcript || "").trim();

  if (!transcript) {
    throw new Error("Local STT không trả về transcript.");
  }

  const matchStartedAt = performance.now();
  const inputType = detectInputType(transcript);
  const candidateEntries =
    inputType === "sentence"
      ? getCandidateSentenceEntriesForLocalRecognition()
      : getCandidateEntriesForLocalRecognition();
  const match = findBestMatch(transcript, candidateEntries.length ? candidateEntries : getCandidateEntriesForLocalRecognition(), {
    trackCorrectionUsage: true
  });
  const canUseShortPhrase =
    match.inputType === "short_phrase" &&
    match.confidence >= SHORT_PHRASE_AUTO_CONFIDENCE &&
    isTextMatchStable(match);
  const canUseSentence =
    match.inputType === "sentence" &&
    match.confidence >= AUTO_CORRECTION_SCORE &&
    isTextMatchStable(match);
  const personalizedText = match.lightlyCorrectedText || transcript;
  const transcriptIsLongEnough = isLongEnoughForSentenceGuess(normalizeVietnameseText(personalizedText));
  const hasCorrectionSignal =
    Boolean(match.appliedPhraseCorrections?.length) ||
    Boolean(match.appliedPersonalCorrections?.length) ||
    normalizeText(personalizedText) !== normalizeText(transcript);
  const canUseFreeSpeech =
    !canUseSentence &&
    transcriptIsLongEnough &&
    hasCorrectionSignal &&
    (!match.match || match.confidence < AUTO_CORRECTION_SCORE);
  const correctedText = canUseSentence
    ? match.correctedText
    : canUseShortPhrase
    ? match.correctedText
    : personalizedText;
  const confidence = canUseFreeSpeech
    ? Math.max(match.confidence || 0, FREE_SPEECH_STT_SCORE)
    : match.confidence || 0;

  return {
    originalAudioAvailable: true,
    correctedText,
    confidence,
    isConfirmed: canUseSentence || canUseShortPhrase || canUseFreeSpeech,
    isFreeSpeech: canUseFreeSpeech,
    templateCount: 0,
    candidateCount: candidateEntries.length,
    topMatches: [],
    match: match.match
      ? {
          sentenceId: match.match.id,
          sourceSentenceId: match.match.sourceId,
          take: "stt",
          fileName: `${transcriptionResult.engine || "local-stt"}:${transcriptionResult.model || ""}`,
          rawConfidence: match.match.rawScore,
          secondBestScore: match.match.secondBestScore,
          keywordMatchCount: match.match.keywordMatchCount,
          keywordMatchWords: match.match.keywordMatchWords,
          topCandidates: match.match.topCandidates
        }
      : null,
    source: "local-stt",
    transcript,
    personalizedCorrectedText: personalizedText,
    phraseCorrectionLayer: match.phraseCorrectionLayer || match.hybridCorrection?.phraseCorrection || null,
    tokenCorrectionLayer: match.tokenCorrectionLayer || match.hybridCorrection?.tokenCorrection || null,
    hybridCorrection: match.hybridCorrection || null,
    correctionLayer: match.correctionLayer || null,
    appliedPhraseCorrections: match.appliedPhraseCorrections || [],
    suggestedPhraseCorrections: match.suggestedPhraseCorrections || [],
    appliedPersonalCorrections: match.appliedPersonalCorrections || [],
    suggestedPersonalCorrections: match.suggestedPersonalCorrections || [],
    keywordMatchCount: match.keywordMatchCount || match.match?.keywordMatchCount || 0,
    keywordMatchWords: match.keywordMatchWords || match.match?.keywordMatchWords || [],
    topCandidates: match.topCandidates || match.match?.topCandidates || [],
    inputType: match.inputType || inputType,
    engineUsed: match.engineUsed || (inputType === "short_phrase" ? "phrase engine" : "sentence engine"),
    learningSources: match.learningSources || [],
    engine: transcriptionResult.engine || "local-stt",
    model: transcriptionResult.model || "",
    timing: {
      transcribeMs:
        transcriptionResult.clientTranscribeMs ||
        transcriptionResult.timing?.total_ms ||
        transcriptionResult.timing?.transcribe_ms ||
        0,
      textMatchMs: performance.now() - matchStartedAt,
      serverReadMs: transcriptionResult.timing?.read_ms || 0,
      serverWriteMs: transcriptionResult.timing?.write_ms || 0,
      serverTranscribeMs: transcriptionResult.timing?.transcribe_ms || 0
    }
  };
}

async function matchLearnedAudioSample(blob) {
  if (!window.voiceTemplateMatcher?.matchLearnedVoiceSamples) {
    return null;
  }

  try {
    window.voiceTemplateMatcher.setSampleTrustStore?.(loadSampleTrustStore());
    const startedAt = performance.now();
    const matchResult = await window.voiceTemplateMatcher.matchLearnedVoiceSamples(
      blob,
      getCurrentSpeakerIdForLocalRecognition(),
      {
        allowedSentenceIds: getAllowedSentenceIdsForLocalRecognition(),
        allowOpenLearned: true
      }
    );

    if (matchResult) {
      const elapsedMs = performance.now() - startedAt;
      const audioMatchMs = matchResult.timing?.audioMatchMs || elapsedMs;
      matchResult.timing = {
        ...(matchResult.timing || {}),
        audioMatchMs,
        cacheWaitMs: Math.max(elapsedMs - audioMatchMs, 0)
      };
    }

    return matchResult?.confidence >= LEARNED_AUDIO_CORRECTION_SCORE ? matchResult : null;
  } catch (error) {
    console.warn("Learned audio matcher unavailable:", error.message);
    return null;
  }
}

async function matchVoiceTemplateSample(blob) {
  if (!window.voiceTemplateMatcher?.matchVoiceToTemplates) {
    return null;
  }

  try {
    window.voiceTemplateMatcher.setSampleTrustStore?.(loadSampleTrustStore());
    const startedAt = performance.now();
    const matchResult = await window.voiceTemplateMatcher.matchVoiceToTemplates(
      blob,
      getCurrentSpeakerIdForLocalRecognition(),
      {
        allowedSentenceIds: getAllowedSentenceIdsForLocalRecognition()
      }
    );

    if (matchResult) {
      const elapsedMs = performance.now() - startedAt;
      const audioMatchMs = matchResult.timing?.audioMatchMs || elapsedMs;
      matchResult.timing = {
        ...(matchResult.timing || {}),
        audioMatchMs,
        cacheWaitMs: Math.max(elapsedMs - audioMatchMs, 0)
      };
    }

    return matchResult?.confidence >= VOICE_TEMPLATE_CORRECTION_SCORE ? matchResult : null;
  } catch (error) {
    console.warn("Voice template matcher unavailable:", error.message);
    return null;
  }
}

async function processLocalRecognitionBlob(blob) {
  const totalStartedAt = performance.now();
  const recordingMs = localRecognitionTiming?.recordingMs || 0;

  const attachTiming = (matchResult) => ({
    ...matchResult,
    timing: {
      ...(matchResult.timing || {}),
      recordingMs,
      totalMs: performance.now() - totalStartedAt
    }
  });
  const fastAudioMatchPromise = matchVoiceTemplateSample(blob).catch(() => null);
  const learnedAudioMatchPromise = matchLearnedAudioSample(blob).catch(() => null);
  const sttMatchPromise = (async () => {
    try {
      return {
        result: await applyAiArbiter(
          buildMatchResultFromTranscript(await transcribeAudioWithLocalServer(blob))
        )
      };
    } catch (error) {
      return { error };
    }
  })();
  const earlyLearnedAudioMatch = await Promise.race([
    learnedAudioMatchPromise,
    timeoutAfter(LEARNED_AUDIO_FAST_WAIT_MS)
  ]);

  if (
    earlyLearnedAudioMatch?.confidence >= LOCKED_LEARNED_AUDIO_SCORE &&
    isAudioMatchStable(earlyLearnedAudioMatch, { locked: true })
  ) {
    earlyLearnedAudioMatch.transcript = earlyLearnedAudioMatch.correctedText;
    earlyLearnedAudioMatch.engine = "learned-audio";
    earlyLearnedAudioMatch.model = "confirmed-local-fast";
    return attachTiming(earlyLearnedAudioMatch);
  }

  const fastAudioMatch = await Promise.race([
    fastAudioMatchPromise,
    timeoutAfter(FAST_AUDIO_WAIT_MS)
  ]);

  if (
    fastAudioMatch?.confidence >= LOCKED_LEARNED_AUDIO_SCORE &&
    isAudioMatchStable(fastAudioMatch, { locked: true })
  ) {
    fastAudioMatch.transcript = fastAudioMatch.correctedText;
    fastAudioMatch.engine = "audio-template";
    fastAudioMatch.model = "cached-local";
    return attachTiming(fastAudioMatch);
  }

  if (
    fastAudioMatch?.confidence >= FAST_AUDIO_STABLE_ACCEPT_SCORE &&
    isAudioMatchStable(fastAudioMatch)
  ) {
    fastAudioMatch.transcript = fastAudioMatch.correctedText;
    fastAudioMatch.engine = "audio-template";
    fastAudioMatch.model = "cached-local";
    return attachTiming(fastAudioMatch);
  }

  if (
    fastAudioMatch?.confidence >= FAST_AUDIO_ACCEPT_SCORE &&
    isAudioMatchStable(fastAudioMatch)
  ) {
    const borderlineLearnedAudioMatch =
      earlyLearnedAudioMatch ||
      (await Promise.race([
        learnedAudioMatchPromise,
        timeoutAfter(LEARNED_AUDIO_BORDERLINE_WAIT_MS)
      ]));

    if (
      borderlineLearnedAudioMatch?.confidence >= LOCKED_LEARNED_AUDIO_SCORE &&
      isAudioMatchStable(borderlineLearnedAudioMatch, { locked: true })
    ) {
      borderlineLearnedAudioMatch.transcript = borderlineLearnedAudioMatch.correctedText;
      borderlineLearnedAudioMatch.engine = "learned-audio";
      borderlineLearnedAudioMatch.model = "confirmed-local";
      return attachTiming(borderlineLearnedAudioMatch);
    }

    fastAudioMatch.transcript = fastAudioMatch.correctedText;
    fastAudioMatch.engine = "audio-template";
    fastAudioMatch.model = "cached-local-borderline";
    return attachTiming(fastAudioMatch);
  }

  try {
    const sttMatchPayload = await sttMatchPromise;
    if (sttMatchPayload.error) {
      throw sttMatchPayload.error;
    }
    const sttMatchResult = sttMatchPayload.result;

    if (sttMatchResult.confidence >= AUTO_CORRECTION_SCORE) {
      return attachTiming(sttMatchResult);
    }

    {
      const transcriptIsLongEnough = isLongEnoughForSentenceGuess(
        normalizeVietnameseText(sttMatchResult.transcript || "")
      );
      await yieldToUi();
      const audioMatches = [];

      if (canUseLearnedAudioFallbackAfterStt(sttMatchResult)) {
        audioMatches.push((await learnedAudioMatchPromise) || earlyLearnedAudioMatch);
      }

      const bestLearnedMatch = audioMatches
        .filter(Boolean)
        .sort((left, right) => right.confidence - left.confidence)[0];

      if (
        bestLearnedMatch &&
        bestLearnedMatch.confidence > sttMatchResult.confidence &&
        isAudioMatchStable(bestLearnedMatch) &&
        (transcriptIsLongEnough ||
          bestLearnedMatch.confidence >= SHORT_TRANSCRIPT_AUDIO_CORRECTION_SCORE)
      ) {
        bestLearnedMatch.transcript = sttMatchResult.transcript;
        bestLearnedMatch.engine = sttMatchResult.engine;
        bestLearnedMatch.model = sttMatchResult.model;
        bestLearnedMatch.timing = {
          ...(sttMatchResult.timing || {}),
          ...(bestLearnedMatch.timing || {}),
          audioMatchMs: bestLearnedMatch.timing?.audioMatchMs || 0
        };
        return attachTiming(bestLearnedMatch);
      }

      const delayedFastAudioMatch = fastAudioMatch || (await fastAudioMatchPromise);
      if (delayedFastAudioMatch) {
        audioMatches.push(delayedFastAudioMatch);
      }

      const bestAudioMatch = audioMatches
        .filter(Boolean)
        .sort((left, right) => right.confidence - left.confidence)[0];

      const canUseAudioMatch =
        bestAudioMatch &&
        bestAudioMatch.confidence > sttMatchResult.confidence &&
        isAudioMatchStable(bestAudioMatch) &&
        (transcriptIsLongEnough ||
          bestAudioMatch.confidence >= SHORT_TRANSCRIPT_AUDIO_CORRECTION_SCORE);

      if (canUseAudioMatch) {
        bestAudioMatch.transcript = sttMatchResult.transcript;
        bestAudioMatch.engine = sttMatchResult.engine;
        bestAudioMatch.model = sttMatchResult.model;
        bestAudioMatch.timing = {
          ...(sttMatchResult.timing || {}),
          ...(bestAudioMatch.timing || {}),
          audioMatchMs: bestAudioMatch.timing?.audioMatchMs || 0
        };
        return attachTiming(bestAudioMatch);
      }
    }

    return attachTiming(sttMatchResult);
  } catch (error) {
    console.warn("Local STT unavailable, falling back to audio template matcher:", error.message);
  }

  if (!window.voiceTemplateMatcher?.matchVoiceToTemplates) {
    throw new Error("Chưa tải được bộ nhận diện local từ voice-matcher.js.");
  }

  const learnedAudioMatch = (await learnedAudioMatchPromise) || earlyLearnedAudioMatch;
  if (learnedAudioMatch && isAudioMatchStable(learnedAudioMatch)) {
    return attachTiming(learnedAudioMatch);
  }

  const fallbackStartedAt = performance.now();
  const fallbackMatch = await window.voiceTemplateMatcher.matchVoiceToTemplates(
    blob,
    getCurrentSpeakerIdForLocalRecognition(),
    {
      allowedSentenceIds: getAllowedSentenceIdsForLocalRecognition()
    }
  );
  fallbackMatch.timing = {
    ...(fallbackMatch.timing || {}),
    audioMatchMs: performance.now() - fallbackStartedAt
  };
  if (isAudioMatchStable(fallbackMatch)) {
    return attachTiming(fallbackMatch);
  }

  throw new Error("Audio gần giống nhiều mẫu khác nhau, app chưa đủ chắc để tự chọn câu.");
}

async function startLocalRecognition() {
  if (!hasLocalRecognitionSupport()) {
    setAppState(UI_STATES.UNSUPPORTED);
    return;
  }

  if (appState === UI_STATES.LISTENING) {
    stopLocalRecognition();
    return;
  }

  clearAutoReplayTimer();
  cancelPlayback();
  clearLocalRecognitionTimer();
  localRecognitionChunks = [];
  recognizedTranscript = "";
  interimTranscript = "";
  finalTranscript = "";
  matchedSentence = null;
  lastRecognitionResult = null;
  localRecognitionTiming = null;
  localRecognitionStartedAt = 0;
  resetLocalRecognitionAudioStats();
  renderStableTranscript();
  renderMatchedSentence(null);
  emitRecognitionPreview("", "listening");
  setAppState(UI_STATES.PROCESSING, "Đang mở micro local...");

  try {
    localRecognitionStream = await navigator.mediaDevices.getUserMedia({
      audio: {
        channelCount: 1,
        echoCancellation: true,
        noiseSuppression: true,
        autoGainControl: true
      }
    });
    startLocalSilenceDetection(localRecognitionStream);
    const mimeType = getPreferredLocalRecognitionMimeType();
    const options = {
      ...(mimeType ? { mimeType } : {}),
      audioBitsPerSecond: LOCAL_RECOGNITION_AUDIO_BITS_PER_SECOND
    };
    localRecognitionRecorder = options
      ? new window.MediaRecorder(localRecognitionStream, options)
      : new window.MediaRecorder(localRecognitionStream);

    localRecognitionRecorder.ondataavailable = (event) => {
      if (event.data.size > 0) {
        localRecognitionChunks.push(event.data);
      }
    };

    localRecognitionRecorder.onerror = () => {
      clearLocalRecognitionTimer();
      releaseLocalRecognitionStream();
      renderStableTranscript();
      setAppState(UI_STATES.ERROR, "Lỗi khi thu audio local, hãy thử lại.");
    };

    localRecognitionRecorder.onstop = async () => {
      const recordingMs = getLocalRecognitionRecordingMs();
      clearLocalRecognitionTimer();
      const outputMimeType =
        localRecognitionRecorder?.mimeType || mimeType || "audio/webm";
      const blob = new Blob(localRecognitionChunks, { type: outputMimeType });
      localRecognitionTiming = {
        recordingMs,
        bytes: blob.size,
        audioStats: localRecognitionAudioStats
      };
      lastLocalRecognitionBlob = blob;
      localRecognitionRecorder = null;
      releaseLocalRecognitionStream();

      try {
        if (!hasLocalRecognitionSpeech(blob)) {
          throw new Error("Không nghe thấy giọng nói rõ ràng, app sẽ không đoán câu từ audio im lặng.");
        }

        setAppState(UI_STATES.PROCESSING, "Đang xử lý...");
        const matchResult = await processLocalRecognitionBlob(blob);
        finishLocalRecognition(matchResult);
      } catch (error) {
        renderStableTranscript();
        renderMatchedSentence(null);
        setAppState(
          UI_STATES.ERROR,
          error.message || "Không thể nhận diện bằng audio local."
        );
      }
    };

    localRecognitionStartedAt = performance.now();
    localRecognitionRecorder.start(LOCAL_RECOGNITION_CHUNK_MS);
    setAppState(
      UI_STATES.LISTENING,
      "Đang nghe..."
    );
    localRecognitionStopTimer = window.setTimeout(
      stopLocalRecognition,
      LOCAL_RECOGNITION_AUTO_STOP_MS
    );
  } catch (error) {
    releaseLocalRecognitionStream();
    renderStableTranscript();
    setAppState(UI_STATES.ERROR, "Không thể truy cập micro để nhận diện local.");
  }
}

function pickBestVoice(voices) {
  if (!voices.length) {
    return null;
  }

  return (
    voices.find((voice) => voice.lang === "vi-VN") ||
    voices.find(
      (voice) => typeof voice.lang === "string" && voice.lang.toLowerCase().startsWith("vi")
    ) ||
    voices.find((voice) => voice.default) ||
    voices[0]
  );
}

function loadVoices() {
  if (!hasSpeechPlayback()) {
    return;
  }

  selectedVoice = pickBestVoice(synth.getVoices());
  updateControls();
}

function speakTranscript(source = "manual") {
  if (!finalTranscript) {
    setAppState(UI_STATES.ERROR, "Chưa có câu nào để phát lại");
    renderStableTranscript();
    return;
  }

  clearAutoReplayTimer();
  stopCurrentPlayback();
  const playbackId = activePlaybackId;
  if (!hasSpeechPlayback()) {
    setAppState(UI_STATES.ERROR, "Trình duyệt này chưa hỗ trợ phát lại bằng giọng nói");
    return;
  }

  loadVoices();
  synth.cancel();
  synth.resume();

  const utterance = new SpeechSynthesisUtterance(finalTranscript);
  utterance.lang = selectedVoice?.lang || "vi-VN";
  if (selectedVoice) {
    utterance.voice = selectedVoice;
  }
  utterance.rate = 0.95;
  utterance.pitch = 1;
  utterance.volume = 1;
  utterance.onstart = () => {
    if (playbackId !== activePlaybackId) {
      return;
    }

    const speakingMessage =
      matchedSentence && finalTranscript === matchedSentence.correctedText
        ? "Đang phát lại câu đoán từ bộ mẫu"
        : source === "auto"
          ? "Đang phát lại tự động câu vừa nhận diện"
          : "Đang phát lại câu vừa nhận diện";

    setAppState(UI_STATES.SPEAKING, speakingMessage);
  };
  utterance.onend = () => {
    if (playbackId !== activePlaybackId) {
      return;
    }

    setAppState(UI_STATES.READY, "Phát lại xong, bạn có thể nói tiếp");
  };
  utterance.onerror = (event) => {
    if (playbackId !== activePlaybackId) {
      return;
    }

    const errorMessages = {
      "audio-busy": "Thiết bị âm thanh đang bị ứng dụng khác chiếm dụng",
      "audio-hardware": "Không tìm thấy loa hoặc thiết bị phát âm thanh",
      "interrupted": "Phát lại bị ngắt giữa chừng",
      "network": "Trình duyệt gặp lỗi mạng khi tải giọng đọc",
      "not-allowed": "Trình duyệt không cho phép phát giọng đọc",
      "synthesis-failed": "Trình duyệt không tạo được giọng đọc"
    };

    setAppState(
      UI_STATES.ERROR,
      errorMessages[event.error] || `Phát lại thất bại: ${event.error}`
    );
    renderStableTranscript();
  };

  synth.speak(utterance);
}

function scheduleAutoReplay() {
  if (!finalTranscript || !hasSpeechPlayback()) {
    return;
  }

  clearAutoReplayTimer();
  autoReplayTimer = window.setTimeout(() => {
    autoReplayTimer = null;
    speakTranscript("auto");
  }, 500);
}

function createRecognition() {
  recognition = new SpeechRecognition();
  recognition.lang = "vi-VN";
  recognition.continuous = false;
  recognition.interimResults = true;
  recognition.maxAlternatives = 1;

  recognition.onstart = () => {
    hadRecognitionError = false;
    hasFinalResultInCurrentSession = false;
    interimTranscript = "";
    renderMatchedSentence(null);
    emitRecognitionPreview("", "listening");
    setAppState(UI_STATES.LISTENING);
  };

  recognition.onresult = (event) => {
    const nextFinalParts = [];
    const nextInterimParts = [];

    for (const result of Array.from(event.results)) {
      const text = result[0]?.transcript?.trim();

      if (!text) {
        continue;
      }

      if (result.isFinal) {
        nextFinalParts.push(text);
      } else {
        nextInterimParts.push(text);
      }
    }

    const nextFinalTranscript = nextFinalParts.join(" ").trim();
    interimTranscript = nextInterimParts.join(" ").trim();

    if (nextFinalTranscript) {
      hasFinalResultInCurrentSession = true;
      recognizedTranscript = nextFinalTranscript;
      interimTranscript = "";
      renderTranscript(recognizedTranscript, "final");
      emitRecognitionPreview(recognizedTranscript, "final");
      matchedSentence = findClosestSampleSentence(recognizedTranscript);
      const canUseMatchedSentence =
        matchedSentence &&
        (matchedSentence.inputType === "short_phrase"
          ? matchedSentence.confidence >= SHORT_PHRASE_AUTO_CONFIDENCE
          : matchedSentence.confidence >= AUTO_CORRECTION_SCORE);
      finalTranscript =
        canUseMatchedSentence
          ? matchedSentence.correctedText
          : recognizedTranscript;
      renderMatchedSentence(
        matchedSentence,
        Boolean(matchedSentence && finalTranscript === matchedSentence.correctedText)
      );
      notifyRecognitionResult();

      if (hasSpeechPlayback() && matchedSentence && finalTranscript === matchedSentence.correctedText) {
        setAppState(
          UI_STATES.PROCESSING,
          "Đang xử lý, app sẽ phát lại câu đã sửa sau 0.5 giây"
        );
        scheduleAutoReplay();
      } else if (hasSpeechPlayback()) {
        setAppState(UI_STATES.PROCESSING, STATUS_MESSAGES[UI_STATES.PROCESSING]);
      } else {
        setAppState(
          UI_STATES.READY,
          "Đã nhận diện xong, nhưng trình duyệt này không hỗ trợ phát lại"
        );
      }

      return;
    }

    if (interimTranscript) {
      renderTranscript(interimTranscript, "interim");
      renderMatchedSentence(null);
      emitRecognitionPreview(interimTranscript, "interim");
      setAppState(UI_STATES.LISTENING, "Đang nghe, nội dung đang được cập nhật");
    }
  };

  recognition.onerror = (event) => {
    hadRecognitionError = true;
    const errorMessages = {
      "audio-capture": "Không tìm thấy micro trên thiết bị này",
      "network": "Lỗi mạng khi dùng nhận diện giọng nói",
      "not-allowed": "Bạn chưa cấp quyền micro cho trình duyệt",
      "no-speech": "Không nghe thấy giọng nói, hãy thử lại",
      "service-not-allowed": "Trình duyệt chặn dịch vụ nhận diện giọng nói"
    };

    renderStableTranscript();
    renderMatchedSentence(
      matchedSentence,
      Boolean(matchedSentence && finalTranscript === matchedSentence.correctedText)
    );
    setAppState(
      UI_STATES.ERROR,
      errorMessages[event.error] || "Không thể nhận diện giọng nói"
    );
  };

  recognition.onend = () => {
    if (
      hadRecognitionError ||
      hasFinalResultInCurrentSession ||
      appState === UI_STATES.PROCESSING ||
      appState === UI_STATES.SPEAKING
    ) {
      updateControls();
      return;
    }

    interimTranscript = "";
    renderStableTranscript();
    renderMatchedSentence(
      matchedSentence,
      Boolean(matchedSentence && finalTranscript === matchedSentence.correctedText)
    );
    setAppState(
      UI_STATES.READY,
      finalTranscript
        ? "Sẵn sàng cho lượt nói tiếp theo"
        : "Không nghe thấy giọng nói, hãy thử lại"
    );
  };
}

function startListening() {
  startLocalRecognition();
}

function stopPracticeSession() {
  clearAutoReplayTimer();
  cancelPlayback();
  stopLocalRecognition();

  if (recognition && typeof recognition.abort === "function") {
    try {
      recognition.abort();
    } catch (error) {
      // Ignore abort races from the browser speech engine.
    }
  }

  renderStableTranscript();
  renderMatchedSentence(
    matchedSentence,
    Boolean(matchedSentence && finalTranscript === matchedSentence.correctedText)
  );

  if (appState !== UI_STATES.UNSUPPORTED) {
    setAppState(
      UI_STATES.READY,
      finalTranscript
        ? "Đã dừng luyện nói, bạn có thể chuyển sang thu âm dữ liệu"
        : STATUS_MESSAGES[UI_STATES.READY]
    );
  }
}

function warmVoiceTemplateCache() {
  if (!window.voiceTemplateMatcher?.loadVoiceTemplates) {
    voiceTemplateWarmupPromise = null;
    return null;
  }

  const waitForIdle = () =>
    new Promise((resolve) => {
      if (typeof window.requestIdleCallback === "function") {
        window.requestIdleCallback(resolve, { timeout: 5000 });
        return;
      }

      window.setTimeout(resolve, 3000);
    });

  voiceTemplateWarmupPromise = waitForIdle()
    .then(() => {
      const speakerId = getCurrentSpeakerIdForLocalRecognition();
      return Promise.allSettled([
        window.voiceTemplateMatcher.loadVoiceTemplates(speakerId),
        window.voiceTemplateMatcher.loadLearnedVoiceTemplates?.(speakerId)
      ]);
    })
    .catch((error) => {
      console.warn("Unable to warm voice template cache:", error.message);
      return null;
    });

  return voiceTemplateWarmupPromise;
}

function warmHybridDatasets() {
  loadPhraseDataset().catch((error) => {
    console.warn("Unable to load phrase dataset:", error.message);
  });
}

if (!SpeechRecognition) {
  // The app uses local audio matching for recognition. Web Speech is kept only
  // as legacy code and is not required.
  recognition = null;
} else {
  createRecognition();
}

setAppState(
  hasLocalRecognitionSupport() ? UI_STATES.READY : UI_STATES.UNSUPPORTED,
  hasLocalRecognitionSupport()
    ? hasSpeechPlayback()
      ? "Sẵn sàng nhận diện local từ mẫu giọng"
      : "Sẵn sàng nhận diện local, nhưng trình duyệt này không hỗ trợ phát lại"
    : STATUS_MESSAGES[UI_STATES.UNSUPPORTED]
);

if (hasSpeechPlayback()) {
  loadVoices();
  if (typeof synth.addEventListener === "function") {
    synth.addEventListener("voiceschanged", loadVoices);
  } else if ("onvoiceschanged" in synth) {
    synth.onvoiceschanged = loadVoices;
  }
} else {
  replayButton.disabled = true;
}

renderMatchedSentence(null);
warmHybridDatasets();
warmVoiceTemplateCache();
window.setTimeout(resetPersonalLearningFromUrl, 0);

window.voiceCoachControls = {
  stopPractice: stopPracticeSession,
  startPractice: startListening,
  findBestMatch,
  detectInputType,
  runShortPhraseEngine,
  applyPhraseCorrections,
  getLastRecognitionResult: () => lastRecognitionResult,
  scoreSentenceMatch: getSentenceMatchScore,
  applyPersonalCorrections,
  runHybridCorrectionPipeline,
  loadPhraseDataset,
  getPhraseDatasetEntries: () => phraseDatasetEntries.slice(),
  learnFromReview,
  forgetPersonalLearningText,
  exportCorrections,
  resetLearnedCorrections,
  resetAllPersonalLearning
};

startButton.addEventListener("click", startListening);
replayButton.addEventListener("click", () => {
  speakTranscript("manual");
});
document.addEventListener("keydown", handleReviewNumberShortcut);
