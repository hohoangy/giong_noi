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
const LOCAL_RECOGNITION_AUTO_STOP_MS = 6000;
const LOCAL_RECOGNITION_SILENCE_STOP_MS = 700;
const LOCAL_RECOGNITION_MIN_RECORDING_MS = 450;
const LOCAL_RECOGNITION_CHUNK_MS = 200;
const LOCAL_RECOGNITION_SILENCE_RMS = 0.018;
const SAMPLE_ENTRIES = Array.isArray(window.MONTH2_CORPUS)
  ? window.MONTH2_CORPUS.map((entry, index) => ({
      id: entry.id || `S${String(index + 1).padStart(3, "0")}`,
      sourceId: entry.originalId || entry.id || `S${String(index + 1).padStart(3, "0")}`,
      text: entry.text
    }))
  : (window.SAMPLE_SENTENCES || []).map((text, index) => ({
      id: `S${String(index + 1).padStart(3, "0")}`,
      sourceId: `S${String(index + 1).padStart(3, "0")}`,
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
  [UI_STATES.LISTENING]: "Đang thu âm local, hãy nói rõ một câu ngắn",
  [UI_STATES.PROCESSING]: "Đang xử lý, sẽ tự phát lại sau 0.5 giây",
  [UI_STATES.SPEAKING]: "Đang phát lại câu vừa nhận diện",
  [UI_STATES.ERROR]: "Đã có lỗi xảy ra",
  [UI_STATES.UNSUPPORTED]: "Trình duyệt này chưa hỗ trợ thu âm local"
};
const MIN_CORRECTION_SCORE = 0.45;
const AUTO_CORRECTION_SCORE = 0.7;
const CORRECTION_AUTO_CONFIDENCE = 0.58;
const CORRECTION_SUGGEST_CONFIDENCE = 0.42;
const MAX_CORRECTION_NGRAM = 3;
const MAX_PHRASE_NGRAM = 5;
const PHRASE_AUTO_CONFIDENCE = 0.68;
const PHRASE_SUGGEST_CONFIDENCE = 0.5;
const PHRASE_DATASET_URL = "data/phrases/phrases.json";
const LEARNED_AUDIO_CORRECTION_SCORE = 0.68;
const VOICE_TEMPLATE_CORRECTION_SCORE = 0.68;
const FAST_AUDIO_ACCEPT_SCORE = 0.74;
const FAST_AUDIO_WAIT_MS = 900;
const SHORT_TRANSCRIPT_AUDIO_CORRECTION_SCORE = 0.88;
const MIN_MATCH_WORD_COUNT = 4;
const MIN_MATCH_TEXT_LENGTH = 12;
const KEYWORD_PREFILTER_LIMIT = 10;
const NORMALIZED_SAMPLE_ENTRIES = new WeakMap();
const SPEECH_CORRECTIONS_STORAGE_KEY = "speech_corrections.json";
const SPEECH_REVIEWS_STORAGE_KEY = "voicecoach_speech_reviews";
const RECORDER_STORAGE_KEY = "voiceCoachDatasetRecorder";
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
let voiceTemplateWarmupPromise = null;
let learnedCorrections = loadCorrections();
let correctionRuleCache = null;
let phraseDatasetEntries = [];
let phraseDatasetLoadPromise = null;
let phraseDatasetLoadedFromFile = false;
let phraseDatasetByLength = new Map();
let phraseDatasetExactMap = new Map();
let reviewPanelElements = null;

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
  return window.voiceRecorderControls?.getCurrentPackSentenceIds?.() || [];
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
  guessMeta.textContent = usesMatchForPlayback
    ? `Raw STT: "${match.rawText || match.originalText}". App nghe: "${match.originalText}". Confidence: ${Math.round(
        match.confidence * 100
      )}%.${correctionLayerText}${keywordText}${topCandidateText}${phraseCorrectionTextValue}${lightCorrectionText}${suggestedCorrectionText} Độ khớp đủ cao, app dùng câu đoán để phát lại.${debugText}`
    : `Raw STT: "${match.rawText || match.originalText}". App nghe: "${match.originalText}". Confidence: ${Math.round(
        match.confidence * 100
      )}%.${correctionLayerText}${keywordText}${topCandidateText}${phraseCorrectionTextValue}${lightCorrectionText}${suggestedCorrectionText} Độ khớp thấp, app chỉ dùng phrase/raw, không tự phát nguyên câu dài.${debugText}`;
  renderLearningReviewPanel();
}

function getReviewHeardText() {
  return (lastRecognitionResult?.heardText || recognizedTranscript || "").trim();
}

function getReviewCorrectedText() {
  return (
    matchedSentence?.correctedText ||
    lastRecognitionResult?.correctedTranscript ||
    finalTranscript ||
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

  const controls = document.createElement("div");
  controls.className = "recorder-control-row";
  controls.style.gap = "8px";

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

  correctButton.addEventListener("click", () => {
    handleCorrectReview();
  });
  wrongButton.addEventListener("click", () => {
    correctionInput.hidden = false;
    saveWrongButton.hidden = false;
    correctionInput.value = getReviewCorrectedText();
    correctionInput.focus();
    status.textContent = "Nhập câu đúng rồi bấm Lưu sửa.";
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
  panel.append(status, controls);
  guessMeta.insertAdjacentElement("afterend", panel);

  reviewPanelElements = {
    panel,
    status,
    correctButton,
    wrongButton,
    correctionInput,
    saveWrongButton
  };
}

function renderLearningReviewPanel(message = "") {
  if (!reviewPanelElements) {
    createLearningReviewPanel();
  }

  const heardText = getReviewHeardText();
  const correctedText = getReviewCorrectedText();
  const hasReviewTarget = Boolean(heardText || correctedText);

  reviewPanelElements.correctButton.disabled = !hasReviewTarget;
  reviewPanelElements.wrongButton.disabled = !hasReviewTarget;
  reviewPanelElements.status.textContent =
    message ||
    `Review status: ${hasReviewTarget ? "chờ đánh dấu đúng/sai" : "chưa có kết quả để review"}.`;
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
  window.localStorage.removeItem(RECORDER_STORAGE_KEY);

  try {
    await window.voiceTemplateMatcher?.resetLearnedVoiceSamples?.();
  } catch (error) {
    console.warn("Unable to reset learned audio samples:", error.message);
  }

  renderLearningReviewPanel("Review status: đã xóa sạch dữ liệu học cá nhân.");
  return true;
}

async function resetPersonalLearningFromUrl() {
  const url = new URL(window.location.href);

  if (url.searchParams.get("resetLearning") !== "1") {
    return;
  }

  await resetAllPersonalLearning({ skipConfirm: true });
  url.searchParams.delete("resetLearning");
  window.history.replaceState({}, "", url.toString());
  setAppState(UI_STATES.READY, "Đã xóa sạch dữ liệu học cá nhân. Bạn có thể bắt đầu học lại.");
}

function handleCorrectReview() {
  const heardText = getReviewHeardText();
  const correctedText = getReviewCorrectedText() || heardText;

  if (!heardText && !correctedText) {
    renderLearningReviewPanel("Review status: chưa có dữ liệu để lưu.");
    return;
  }

  saveReview({
    heardText,
    correctedText,
    confidence: matchedSentence?.confidence || lastRecognitionResult?.matchScore || 0,
    isCorrect: true,
    createdAt: new Date().toISOString()
  });
  markAppliedCorrectionsSuccessful(
    matchedSentence?.appliedPersonalCorrections ||
      lastRecognitionResult?.appliedPersonalCorrections ||
      []
  );
  renderLearningReviewPanel("Review status: đã lưu là đúng.");
}

async function saveLastRecognitionAudioSample(heardText, correctedText) {
  if (!lastLocalRecognitionBlob || !window.voiceTemplateMatcher?.saveLearnedVoiceSample) {
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
      take: "review-wrong",
      fileName: `review_wrong_${Date.now()}.webm`
    }
  );
}

async function handleWrongReview(correctedTextValue) {
  const heardText = getReviewHeardText();
  const correctedText = correctedTextValue.trim();

  if (!heardText || !correctedText) {
    renderLearningReviewPanel("Review status: cần có App nghe và câu đúng.");
    return;
  }

  saveReview({
    heardText,
    correctedText,
    confidence: matchedSentence?.confidence || lastRecognitionResult?.matchScore || 0,
    isCorrect: false,
    createdAt: new Date().toISOString()
  });
  learnFromReview(heardText, correctedText);
  reviewPanelElements.correctionInput.hidden = true;
  reviewPanelElements.saveWrongButton.hidden = true;

  try {
    const learnedSample = await saveLastRecognitionAudioSample(heardText, correctedText);
    renderLearningReviewPanel(
      learnedSample?.serverPath
        ? "Review status: đã lưu sửa sai và lưu audio mẫu vào server."
        : learnedSample
        ? "Review status: đã lưu sửa sai và thêm audio vào mẫu học tạm trong trình duyệt."
        : "Review status: đã lưu sửa sai. Chưa có audio để thêm vào mẫu học."
    );
  } catch (error) {
    renderLearningReviewPanel(
      `Review status: đã lưu sửa sai, nhưng chưa lưu được audio mẫu (${error.message}).`
    );
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
  const ngramSize = Math.max(1, Math.min(MAX_CORRECTION_NGRAM, Number(item?.ngramSize || tokenizeText(wrong).length || 1)));

  return {
    wrong,
    correct,
    learnedCount,
    successCount,
    count: learnedCount,
    usedCount: Math.max(0, Number(item?.usedCount || 0)),
    ngramSize,
    createdAt: item?.createdAt || new Date().toISOString(),
    updatedAt: item?.updatedAt || item?.createdAt || new Date().toISOString()
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
  const usedCount = Number(rule.usedCount || 0);
  const successRate = Math.min(successCount / learnedCount, 1);
  const evidenceScore = Math.min(learnedCount / 6, 1);
  const useScore = Math.min(usedCount / 12, 1);
  const ngramBonus = Math.min(Number(rule.ngramSize || 1) - 1, 2) * 0.04;

  return Math.min(0.34 + evidenceScore * 0.28 + successRate * 0.22 + useScore * 0.08 + ngramBonus, 0.97);
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
    .filter((rule) => rule.wrong && rule.correct && rule.wrong !== normalizeText(rule.correct))
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
    const canAutoApply =
      confidence >= CORRECTION_AUTO_CONFIDENCE &&
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
      usageChanged = true;
    }

    appliedRules.push({
      wrong: wrongText,
      correct: matchedRule.correct,
      learnedCount: matchedRule.learnedCount || matchedRule.count || 1,
      successCount: matchedRule.successCount || 0,
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

function upsertCorrectionRule(wrongValue, correctValue, options = {}) {
  const wrong = normalizeDisplayText(wrongValue);
  const correct = normalizeDisplayText(correctValue);
  const correctNormalized = normalizeText(correct);
  const wrongNormalized = normalizeText(wrong);
  const ngramSize = Math.max(
    1,
    Math.min(MAX_CORRECTION_NGRAM, Number(options.ngramSize || tokenizeText(wrong).length || 1))
  );

  if (!wrongNormalized || !correct || wrongNormalized === correctNormalized) {
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

function learnFromReview(heardText, correctedText) {
  const wrongTokens = tokenizeText(heardText);
  const correctTokens = tokenizeDisplayText(correctedText);

  if (
    !wrongTokens.length ||
    !correctTokens.length ||
    wrongTokens.join(" ") === correctTokens.map(normalizeText).join(" ")
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
  const inputNormalized = normalizeText(inputText);
  const hybridCorrection = runHybridCorrectionPipeline(inputText, {
    trackCorrectionUsage: Boolean(options.trackCorrectionUsage)
  });
  const normalizedTextForMatching = hybridCorrection.correctedNormalizedText || inputNormalized;
  const sentenceEntries = normalizeSentenceList(sentences);
  const inputTokens = normalizedTextForMatching.split(" ").filter(Boolean);
  const uniqueInputTokens = getUniqueTokens(normalizedTextForMatching);

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
    const rawScore = getMatchScore(normalizedTextForMatching, candidateNormalized);
    const keywordBoost = Math.min(candidate.keywordMatch.count * 0.035, 0.16);
    const combinedScore = Math.min(rawScore * 0.86 + candidate.keywordRatio * 0.14 + keywordBoost, 1);
    scoredCandidates.push({
      id: entry.id,
      sourceId: entry.sourceId,
      text: entry.text,
      score: combinedScore,
      fullSentenceScore: rawScore,
      keywordMatchCount: candidate.keywordMatch.count,
      keywordMatchWords: candidate.keywordMatch.words,
      keywordRatio: candidate.keywordRatio
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
        keywordMatchCount: candidate.keywordMatch.count,
        keywordMatchWords: candidate.keywordMatch.words,
        secondBestScore,
        confidence: rawScore
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

function cancelPlayback() {
  clearAutoReplayTimer();

  if (!hasSpeechPlayback()) {
    return;
  }

  activePlaybackId += 1;
  synth.cancel();
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

  const canUseCorrectionForPlayback =
    matchResult.confidence >= AUTO_CORRECTION_SCORE &&
    isLongEnoughForSentenceGuess(normalizeVietnameseText(matchResult.correctedText || ""));
  recognizedTranscript = matchResult.transcript || matchResult.correctedText;
  finalTranscript = canUseCorrectionForPlayback
    ? matchResult.correctedText
    : matchResult.personalizedCorrectedText || recognizedTranscript;
  matchedSentence = {
    rawText: matchResult.transcript || matchResult.correctedText,
    originalText: matchResult.source === "local-stt"
      ? `${matchResult.engine} nghe: ${matchResult.transcript}`
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
    match: matchResult.match || null,
    debugText: `${matchResult.topMatches?.length
      ? `Đang so ${matchResult.scoredTemplateCount || matchResult.candidateCount || 0}/${
          matchResult.candidateCount || 0
        } ứng viên (${matchResult.templateCount || 0} mẫu tổng). Top: ${matchResult.topMatches
          .map((item) => `${item.sourceSentenceId || item.sentenceId} ${item.percent}%`)
          .join(", ")}.`
      : matchResult.source === "local-stt"
        ? `STT local: ${matchResult.engine}${matchResult.model ? ` (${matchResult.model})` : ""}.`
      : matchResult.source === "learned-audio"
        ? `Mẫu học từ các lần đánh dấu sai: ${matchResult.templateCount || 0} mẫu.`
      : ""}${formatRecognitionTiming(matchResult.timing)}`
  };

  if (matchResult.topMatches?.length) {
    console.table(matchResult.topMatches);
  }

  renderTranscript(recognizedTranscript, "final");
  emitRecognitionPreview(recognizedTranscript, "final");
  renderMatchedSentence(matchedSentence, canUseCorrectionForPlayback);
  notifyRecognitionResult();

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
  const match = findBestMatch(transcript, getCandidateEntriesForLocalRecognition(), {
    trackCorrectionUsage: true
  });
  const canUseSentence = match.confidence >= AUTO_CORRECTION_SCORE;
  const correctedText = canUseSentence
    ? match.correctedText
    : match.lightlyCorrectedText || transcript;

  return {
    originalAudioAvailable: true,
    correctedText,
    confidence: match.confidence || 0,
    isConfirmed: canUseSentence,
    templateCount: 0,
    candidateCount: getCandidateEntriesForLocalRecognition().length,
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
    personalizedCorrectedText: match.lightlyCorrectedText || transcript,
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
    const startedAt = performance.now();
    const matchResult = await window.voiceTemplateMatcher.matchLearnedVoiceSamples(
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
  const fastAudioMatch = await Promise.race([
    fastAudioMatchPromise,
    timeoutAfter(FAST_AUDIO_WAIT_MS)
  ]);

  if (fastAudioMatch?.confidence >= FAST_AUDIO_ACCEPT_SCORE) {
    fastAudioMatch.transcript = fastAudioMatch.correctedText;
    fastAudioMatch.engine = "audio-template";
    fastAudioMatch.model = "cached-local";
    return attachTiming(fastAudioMatch);
  }

  try {
    const sttMatchResult = buildMatchResultFromTranscript(await transcribeAudioWithLocalServer(blob));

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
        audioMatches.push(await matchLearnedAudioSample(blob));
      }

      const bestLearnedMatch = audioMatches
        .filter(Boolean)
        .sort((left, right) => right.confidence - left.confidence)[0];

      if (
        bestLearnedMatch &&
        bestLearnedMatch.confidence > sttMatchResult.confidence &&
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

  const learnedAudioMatch = await matchLearnedAudioSample(blob);
  if (learnedAudioMatch) {
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
  return attachTiming(fallbackMatch);
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
    const options = mimeType ? { mimeType } : undefined;
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
        bytes: blob.size
      };
      lastLocalRecognitionBlob = blob;
      localRecognitionRecorder = null;
      releaseLocalRecognitionStream();

      try {
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

  if (!hasSpeechPlayback()) {
    setAppState(UI_STATES.ERROR, "Trình duyệt này chưa hỗ trợ phát lại bằng giọng nói");
    return;
  }

  clearAutoReplayTimer();
  loadVoices();
  const playbackId = ++activePlaybackId;
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
      finalTranscript =
        matchedSentence && matchedSentence.confidence >= AUTO_CORRECTION_SCORE
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
    .then(() =>
      window.voiceTemplateMatcher.loadVoiceTemplates(getCurrentSpeakerIdForLocalRecognition())
    )
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
  applyPhraseCorrections,
  getLastRecognitionResult: () => lastRecognitionResult,
  scoreSentenceMatch: getSentenceMatchScore,
  applyPersonalCorrections,
  runHybridCorrectionPipeline,
  loadPhraseDataset,
  getPhraseDatasetEntries: () => phraseDatasetEntries.slice(),
  learnFromReview,
  exportCorrections,
  resetLearnedCorrections,
  resetAllPersonalLearning
};

startButton.addEventListener("click", startListening);
replayButton.addEventListener("click", () => {
  speakTranscript("manual");
});
