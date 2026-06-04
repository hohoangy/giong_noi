(() => {
const speakerIdInput = document.getElementById("speakerIdInput");
const packSelect = document.getElementById("packSelect");
const takeSelect = document.getElementById("takeSelect");
const recordingSentenceId = document.getElementById("recordingSentenceId");
const recordingPositionText = document.getElementById("recordingPositionText");
const recordingSentenceText = document.getElementById("recordingSentenceText");
const recordingFileName = document.getElementById("recordingFileName");
const recordingPackSummary = document.getElementById("recordingPackSummary");
const trainingReadinessText = document.getElementById("trainingReadinessText");
const trainingReadinessBar = document.getElementById("trainingReadinessBar");
const trainingReadinessScore = document.getElementById("trainingReadinessScore");
const trainingRecordedCount = document.getElementById("trainingRecordedCount");
const trainingReviewCount = document.getElementById("trainingReviewCount");
const trainingStableCount = document.getElementById("trainingStableCount");
const trainingSuggestionList = document.getElementById("trainingSuggestionList");
const jumpTrainingSuggestionButton = document.getElementById("jumpTrainingSuggestionButton");
const learnedTargetCount = document.getElementById("learnedTargetCount");
const learnedTargetList = document.getElementById("learnedTargetList");
const recordingStatusDot = document.getElementById("recordingStatusDot");
const recordingStatusText = document.getElementById("recordingStatusText");
const prevSentenceButton = document.getElementById("prevSentenceButton");
const nextSentenceButton = document.getElementById("nextSentenceButton");
const recordStartButton = document.getElementById("recordStartButton");
const downloadRecordingButton = document.getElementById("downloadRecordingButton");
const recordingPreview = document.getElementById("recordingPreview");

const RECORDER_STORAGE_KEY = "voiceCoachDatasetRecorder";
const SPEECH_REVIEWS_STORAGE_KEY = "voicecoach_speech_reviews";
const DEFAULT_SPEAKER_ID = "user01";
const TARGET_TAKES_PER_ENTRY = 2;
const STABLE_REVIEW_TARGET = 2;
const MASTERED_CORRECT_STREAK = 2;
const MASTERED_CORRECT_COUNT = 3;
const RECORDING_MIME_CANDIDATES = [
  "audio/webm;codecs=opus",
  "audio/webm",
  "audio/ogg;codecs=opus",
  "audio/mp4"
];

const hasRecordingSupport =
  typeof window.MediaRecorder !== "undefined" &&
  !!navigator.mediaDevices &&
  typeof navigator.mediaDevices.getUserMedia === "function";

const sourceCorpus = Array.isArray(window.MONTH2_CORPUS)
  ? window.MONTH2_CORPUS
  : (window.SAMPLE_SENTENCES || []).map((text, index) => ({
      id: `S${String(index + 1).padStart(3, "0")}`,
      sentenceNumber: index + 1,
      groupId: "",
      groupName: "",
      partId: "",
      priority: false,
      text
    }));
let packKeyOrder = [];
let packNumberByKey = new Map();
let recordingEntries = [];
let latestTrainingSuggestionIndex = -1;

function getPhraseDatasetType(text) {
  const tokenCount = String(text || "").trim().split(/\s+/).filter(Boolean).length;
  return tokenCount <= 3 ? "phrase-short" : "phrase-long";
}

function normalizeTrainingText(value) {
  return String(value || "")
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/đ/g, "d")
    .replace(/[^a-z0-9\s]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function loadSpeechReviews() {
  try {
    const raw = window.localStorage.getItem(SPEECH_REVIEWS_STORAGE_KEY);
    const parsed = raw ? JSON.parse(raw) : [];
    return Array.isArray(parsed) ? parsed : [];
  } catch (error) {
    return [];
  }
}

function getEntryTrainingType(entry) {
  if (entry.datasetType) {
    return entry.datasetType;
  }

  if (entry.utteranceType) {
    return entry.utteranceType;
  }

  return getPhraseDatasetType(entry.text);
}

function getTrainingTypeLabel(entry) {
  const type = getEntryTrainingType(entry);
  if (type === "short" || type === "phrase-short") {
    return "cụm/câu ngắn";
  }

  if (type === "long" || type === "phrase-long") {
    return "câu dài";
  }

  return "mục luyện";
}

function getTargetTakeCount() {
  return TARGET_TAKES_PER_ENTRY;
}

function buildRecordingEntries() {
  packKeyOrder = [];
  packNumberByKey = new Map();

  recordingEntries = sourceCorpus.map((entry, index) => {
    const packChunk = Math.floor(((entry.positionInGroup || index + 1) - 1) / 10) + 1;
    const packKey = entry.utteranceType
      ? `${entry.utteranceType}-${packChunk}`
      : entry.groupId && entry.partId
      ? `${entry.groupId}-${entry.partId}`
      : "default";

    if (!packNumberByKey.has(packKey)) {
      packKeyOrder.push(packKey);
      packNumberByKey.set(packKey, packKeyOrder.length);
    }

    return {
      ...entry,
      id: entry.id || `S${String(index + 1).padStart(3, "0")}`,
      sentenceNumber: entry.sentenceNumber || index + 1,
      index,
      packKey,
      packChunk,
      packNumber: packNumberByKey.get(packKey)
    };
  });

  for (const entry of recordingEntries) {
    const packEntries = recordingEntries.filter((item) => item.packKey === entry.packKey);
    entry.positionInPack = packEntries.findIndex((item) => item.id === entry.id) + 1;
  }
}

const recorderState = {
  currentIndex: 0,
  isRecording: false,
  recognitionPreview: null,
  isVoiceMatching: false,
  mediaRecorder: null,
  stream: null,
  chunks: [],
  recordedBlob: null,
  recordedBlobUrl: "",
  recordingStartedAt: 0,
  mimeType: getPreferredRecordingMimeType(),
  storage: loadRecorderStorage()
};

function loadRecorderStorage() {
  try {
    const raw = window.localStorage.getItem(RECORDER_STORAGE_KEY);
    if (!raw) {
      return { speakerId: DEFAULT_SPEAKER_ID, downloads: {}, reviews: {} };
    }

    const parsed = JSON.parse(raw);
    return {
      speakerId: sanitizeSpeakerId(parsed.speakerId || DEFAULT_SPEAKER_ID),
      downloads: typeof parsed.downloads === "object" && parsed.downloads ? parsed.downloads : {},
      reviews: typeof parsed.reviews === "object" && parsed.reviews ? parsed.reviews : {}
    };
  } catch (error) {
    return { speakerId: DEFAULT_SPEAKER_ID, downloads: {}, reviews: {} };
  }
}

function saveRecorderStorage() {
  window.localStorage.setItem(RECORDER_STORAGE_KEY, JSON.stringify(recorderState.storage));
}

function sanitizeSpeakerId(value) {
  const normalized = value
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9_-]/g, "");

  return normalized || DEFAULT_SPEAKER_ID;
}

function getPreferredRecordingMimeType() {
  if (typeof window.MediaRecorder === "undefined") {
    return "";
  }

  for (const mimeType of RECORDING_MIME_CANDIDATES) {
    if (window.MediaRecorder.isTypeSupported(mimeType)) {
      return mimeType;
    }
  }

  return "";
}

function getFileExtension(mimeType) {
  if (!mimeType) {
    return "webm";
  }

  if (mimeType.includes("ogg")) {
    return "ogg";
  }

  if (mimeType.includes("mp4")) {
    return "m4a";
  }

  return "webm";
}

function setRecorderStatus(state, message) {
  recordingStatusDot.className = `status-dot ${state}`;
  recordingStatusText.textContent = message;
}

function getCurrentEntry() {
  return recordingEntries[recorderState.currentIndex];
}

function getEntriesInPack(packNumber) {
  return recordingEntries.filter((entry) => entry.packNumber === packNumber);
}

function getSelectedTake() {
  return Number(takeSelect.value || "1");
}

function getCurrentSpeakerId() {
  return sanitizeSpeakerId(speakerIdInput.value);
}

function getReviewKey(entry, takeIndex = getSelectedTake()) {
  return `${getCurrentSpeakerId()}_${entry.id}_t${String(takeIndex).padStart(2, "0")}`;
}

function getCurrentRecognitionResult() {
  return window.voiceCoachControls?.getLastRecognitionResult?.() || null;
}

function buildRecordingFileName(entry) {
  const extension = getFileExtension(
    recorderState.mimeType ||
      recorderState.mediaRecorder?.mimeType ||
      recorderState.recordedBlob?.type ||
      ""
  );

  return `${getCurrentSpeakerId()}_p${String(entry.packNumber).padStart(2, "0")}_${entry.id.toLowerCase()}_t${String(
    getSelectedTake()
  ).padStart(2, "0")}.${extension}`;
}

function revokeRecordedBlobUrl() {
  if (!recorderState.recordedBlobUrl) {
    return;
  }

  window.URL.revokeObjectURL(recorderState.recordedBlobUrl);
  recorderState.recordedBlobUrl = "";
}

function resetRecordingArtifact(options = {}) {
  revokeRecordedBlobUrl();
  recorderState.recordedBlob = null;
  recorderState.chunks = [];
  recorderState.isVoiceMatching = false;
  recordingPreview.pause();
  recordingPreview.removeAttribute("src");
  recordingPreview.load();
  recordingPreview.hidden = true;
  downloadRecordingButton.disabled = true;

  if (options.resetStatus) {
    setRecorderStatus("ready", options.resetStatus);
  }

}

function countCompletedSentencesInPack(packNumber) {
  return getEntriesInPack(packNumber).filter((entry) => {
    const takes = recorderState.storage.downloads[entry.id] || [];
    return takes.length > 0;
  }).length;
}

function getCompletedTakesForEntry(entry) {
  return recorderState.storage.downloads[entry.id] || [];
}

function renderPackSelect() {
  packSelect.innerHTML = "";

  const totalPacks = Math.max(packKeyOrder.length, 1);
  for (let packNumber = 1; packNumber <= totalPacks; packNumber += 1) {
    const packEntries = getEntriesInPack(packNumber);
    const firstEntry = packEntries[0];
    const lastEntry = packEntries[packEntries.length - 1];
    const option = document.createElement("option");
    option.value = String(packNumber);
    const packLabel =
      firstEntry?.utteranceType === "short"
        ? `Câu ngắn ${String(firstEntry.packChunk).padStart(2, "0")}`
        : firstEntry?.utteranceType === "long"
        ? `Câu dài ${String(firstEntry.packChunk).padStart(2, "0")}`
        : firstEntry?.datasetType === "phrase-short"
        ? "Cụm ngắn"
        : firstEntry?.datasetType === "phrase-long"
        ? "Cụm dài"
        : firstEntry?.groupId && firstEntry?.partId
        ? `${firstEntry.groupId} phần ${firstEntry.partId}`
        : `Pack ${String(packNumber).padStart(2, "0")}`;
    option.textContent = `${packLabel} • ${firstEntry?.id || "S001"}-${
      lastEntry?.id || "S001"
    }`;
    packSelect.appendChild(option);
  }
}

function renderRecorder() {
  const entry = getCurrentEntry();
  if (!entry) {
    recordingSentenceId.textContent = "N/A";
    recordingSentenceText.textContent = "Chưa có câu mẫu để thu âm.";
    recordingPositionText.textContent = "Câu 0/0";
    recordingFileName.textContent = "Tên file sẽ hiện ở đây.";
    recordingPackSummary.textContent = "Bộ câu mẫu hiện đang trống.";
    return;
  }

  const packEntries = getEntriesInPack(entry.packNumber);
  recordingSentenceId.textContent = entry.originalId || entry.id;
  recordingSentenceText.textContent = entry.text;
  recordingPositionText.textContent = `Pack ${String(entry.packNumber).padStart(2, "0")} • ${
    entry.utteranceType === "short"
      ? "Câu ngắn"
      : entry.utteranceType === "long"
      ? "Câu dài"
      : entry.datasetType === "phrase-short"
      ? "Cụm ngắn"
      : entry.datasetType === "phrase-long"
      ? "Cụm dài"
      : entry.groupId || "Corpus"
  }${
    !entry.datasetType && entry.partId ? ` phần ${entry.partId}` : ""
  } • ${entry.datasetType ? "cụm" : "câu"} ${
    entry.positionInPack
  }/${packEntries.length}`;
  recordingFileName.textContent = `Tên file: ${buildRecordingFileName(entry)}`;
  const priorityPrefix =
    entry.datasetType === "phrase-short"
      ? "Dataset cụm ngắn để học phát âm. "
      : entry.datasetType === "phrase-long"
      ? "Dataset cụm dài để học nối âm theo ngữ cảnh. "
      : entry.utteranceType === "short"
      ? "Bộ 200 câu ngắn để học phát âm. "
      : entry.utteranceType === "long"
      ? "Bộ 200 câu dài để học ngữ cảnh. "
      : entry.priority
      ? "Bộ câu ưu tiên. "
      : "";
  recordingPackSummary.textContent = `${priorityPrefix}Pack ${String(
    entry.packNumber
  ).padStart(2, "0")} có ${packEntries.length} ${
    entry.datasetType ? "cụm" : "câu"
  }. Tổng vị trí ${entry.positionInGroup || entry.sentenceNumber}/200.`;

  packSelect.value = String(entry.packNumber);
  updateRecorderControls();
  renderTrainingDashboard();
}

function updateRecorderControls() {
  const hasEntry = Boolean(getCurrentEntry());

  prevSentenceButton.disabled = !hasEntry || recorderState.isRecording || recorderState.currentIndex === 0;
  nextSentenceButton.disabled =
    !hasEntry ||
    recorderState.isRecording ||
    recorderState.currentIndex === recordingEntries.length - 1;
  recordStartButton.disabled = !hasEntry || !hasRecordingSupport;
  recordStartButton.textContent = recorderState.isRecording ? "Dừng thu" : "Bắt đầu thu";
  recordStartButton.classList.toggle("recording-button-active", recorderState.isRecording);
  downloadRecordingButton.disabled = !recorderState.recordedBlob || recorderState.isRecording;
  speakerIdInput.disabled = recorderState.isRecording;
  packSelect.disabled = recorderState.isRecording;
  takeSelect.disabled = recorderState.isRecording;
}

async function ensureRecorderStream() {
  const activeStream = recorderState.stream?.getTracks().some((track) => track.readyState === "live");
  if (activeStream) {
    return recorderState.stream;
  }

  recorderState.stream = await navigator.mediaDevices.getUserMedia({
    audio: {
      channelCount: 1,
      echoCancellation: false,
      noiseSuppression: false,
      autoGainControl: false
    }
  });

  return recorderState.stream;
}

function releaseRecorderStream() {
  if (!recorderState.stream) {
    return;
  }

  for (const track of recorderState.stream.getTracks()) {
    track.stop();
  }

  recorderState.stream = null;
}

async function startDatasetRecording() {
  const entry = getCurrentEntry();
  if (!entry || recorderState.isRecording) {
    return;
  }

  if (!hasRecordingSupport) {
    setRecorderStatus("error", "Trình duyệt này chưa hỗ trợ MediaRecorder để thu âm.");
    updateRecorderControls();
    return;
  }

  window.voiceCoachControls?.stopPractice?.();
  resetRecordingArtifact();

  try {
    const stream = await ensureRecorderStream();
    const options = recorderState.mimeType ? { mimeType: recorderState.mimeType } : undefined;
    recorderState.chunks = [];
    recorderState.mediaRecorder = options
      ? new window.MediaRecorder(stream, options)
      : new window.MediaRecorder(stream);

    recorderState.mediaRecorder.ondataavailable = (event) => {
      if (event.data.size > 0) {
        recorderState.chunks.push(event.data);
      }
    };

    recorderState.mediaRecorder.onerror = () => {
      recorderState.isRecording = false;
      setRecorderStatus("error", "Đã có lỗi khi đang thu âm, hãy thử lại.");
      updateRecorderControls();
    };

    recorderState.mediaRecorder.onstop = () => {
      recorderState.isRecording = false;

      const outputMimeType =
        recorderState.mediaRecorder?.mimeType || recorderState.mimeType || "audio/webm";
      recorderState.recordedBlob = new Blob(recorderState.chunks, { type: outputMimeType });
      revokeRecordedBlobUrl();
      recorderState.recordedBlobUrl = window.URL.createObjectURL(recorderState.recordedBlob);
      recordingPreview.src = recorderState.recordedBlobUrl;
      recordingPreview.hidden = false;

      const durationSeconds = Math.max(
        (Date.now() - recorderState.recordingStartedAt) / 1000,
        0
      ).toFixed(1);

      setRecorderStatus(
        "ready",
        `Đã dừng thu âm sau ${durationSeconds} giây. Có thể tải file hoặc thu lại.`
      );
      renderRecorder();
    };

    recorderState.recordingStartedAt = Date.now();
    recorderState.isRecording = true;
    recorderState.mediaRecorder.start();
    setRecorderStatus(
      "listening",
      `Đang thu âm ${entry.datasetType ? "cụm" : "câu"} ${entry.id}. Hãy đọc đúng một lần.`
    );
    updateRecorderControls();
  } catch (error) {
    setRecorderStatus("error", "Không thể truy cập microphone để thu âm dữ liệu.");
    updateRecorderControls();
  }
}

function stopDatasetRecording() {
  if (!recorderState.isRecording || !recorderState.mediaRecorder) {
    return;
  }

  setRecorderStatus("processing", "Đang hoàn tất file thu âm...");
  recorderState.mediaRecorder.stop();
}

function markDownloaded(entry, takeIndex) {
  const current = new Set(recorderState.storage.downloads[entry.id] || []);
  current.add(takeIndex);
  recorderState.storage.downloads[entry.id] = Array.from(current).sort((a, b) => a - b);
  recorderState.storage.speakerId = getCurrentSpeakerId();
  saveRecorderStorage();
  window.dispatchEvent(new CustomEvent("voicecoach:training-data-changed"));
}

function downloadCurrentRecording() {
  const entry = getCurrentEntry();
  if (!entry || !recorderState.recordedBlob) {
    return;
  }

  const anchor = document.createElement("a");
  anchor.href = recorderState.recordedBlobUrl;
  anchor.download = buildRecordingFileName(entry);
  document.body.appendChild(anchor);
  anchor.click();
  anchor.remove();

  markDownloaded(entry, getSelectedTake());
  setRecorderStatus("ready", `Đã tải ${anchor.download}. Bạn có thể chuyển sang câu tiếp theo.`);
  renderRecorder();
}

function moveSentence(offset) {
  if (recorderState.isRecording) {
    return;
  }

  const nextIndex = Math.min(
    Math.max(recorderState.currentIndex + offset, 0),
    recordingEntries.length - 1
  );

  if (nextIndex === recorderState.currentIndex) {
    return;
  }

  recorderState.currentIndex = nextIndex;
  resetRecordingArtifact({
    resetStatus: "Sẵn sàng thu âm. Mỗi file chỉ đọc đúng một câu."
  });
  renderRecorder();
}

function jumpToPack(packNumber) {
  const nextEntry = getEntriesInPack(packNumber)[0];
  if (!nextEntry || recorderState.isRecording) {
    return;
  }

  recorderState.currentIndex = nextEntry.index;
  resetRecordingArtifact({
    resetStatus: "Đã chuyển pack. Hãy kiểm tra lại câu rồi bắt đầu thu."
  });
  renderRecorder();
}

function jumpToEntryIndex(entryIndex, statusMessage = "Đã chuyển tới mục được đề xuất.") {
  if (recorderState.isRecording || entryIndex < 0 || entryIndex >= recordingEntries.length) {
    return;
  }

  recorderState.currentIndex = entryIndex;
  resetRecordingArtifact({ resetStatus: statusMessage });
  renderRecorder();
}

function buildReviewStatsByEntry() {
  const entryByText = new Map();
  const statsByEntryId = new Map();

  for (const entry of recordingEntries) {
    const normalizedText = normalizeTrainingText(entry.text);
    if (normalizedText && !entryByText.has(normalizedText)) {
      entryByText.set(normalizedText, entry);
    }

    statsByEntryId.set(entry.id, {
      correct: 0,
      wrong: 0,
      recentCorrectStreak: 0,
      recentWrongStreak: 0,
      lastResultCorrect: false,
      recentWrongText: "",
      recentHeardText: ""
    });
  }

  const resolveEntry = (review) => {
    const textCandidates = [
      review?.correctedText,
      review?.matchedText,
      review?.playbackTranscript,
      review?.heardText
    ];

    for (const value of textCandidates) {
      const entry = entryByText.get(normalizeTrainingText(value));
      if (entry) {
        return entry;
      }
    }

    return null;
  };

  let correctTotal = 0;
  let wrongTotal = 0;
  const confusionCounts = new Map();

  for (const review of loadSpeechReviews()) {
    if (!review || typeof review !== "object") {
      continue;
    }

    if (review.isCorrect) {
      correctTotal += 1;
    } else {
      wrongTotal += 1;
    }

    const heardText = String(review.heardText || "").trim();
    const correctedText = String(review.correctedText || "").trim();
    if (!review.isCorrect && heardText && correctedText && normalizeTrainingText(heardText) !== normalizeTrainingText(correctedText)) {
      const key = `${heardText} -> ${correctedText}`;
      confusionCounts.set(key, (confusionCounts.get(key) || 0) + 1);
    }

    const entry = resolveEntry(review);
    if (!entry) {
      continue;
    }

    const stats = statsByEntryId.get(entry.id);
    if (review.isCorrect) {
      stats.correct += 1;
      stats.recentCorrectStreak += 1;
      stats.recentWrongStreak = 0;
      stats.lastResultCorrect = true;
    } else {
      stats.wrong += 1;
      stats.recentWrongStreak += 1;
      stats.recentCorrectStreak = 0;
      stats.lastResultCorrect = false;
      stats.recentWrongText = correctedText;
      stats.recentHeardText = heardText;
    }
  }

  return {
    byEntryId: statsByEntryId,
    correctTotal,
    wrongTotal,
    topConfusions: [...confusionCounts.entries()]
      .sort((left, right) => right[1] - left[1])
      .slice(0, 3)
      .map(([label, count]) => ({ label, count }))
  };
}

function buildTrainingSummary() {
  const reviewStats = buildReviewStatsByEntry();
  const targetTakeCount = getTargetTakeCount();
  const targetTakeTotal = recordingEntries.length * targetTakeCount;
  let recordedTakeTotal = 0;
  let stableEntryTotal = 0;

  const entries = recordingEntries.map((entry) => {
    const completedTakes = getCompletedTakesForEntry(entry);
    const review = reviewStats.byEntryId.get(entry.id) || { correct: 0, wrong: 0 };
    const missingTakes = Math.max(targetTakeCount - completedTakes.length, 0);
    const reviewMastered =
      review.recentCorrectStreak >= MASTERED_CORRECT_STREAK ||
      (review.lastResultCorrect && review.correct >= STABLE_REVIEW_TARGET) ||
      review.correct >= MASTERED_CORRECT_COUNT;
    const stable =
      reviewMastered ||
      (completedTakes.length >= targetTakeCount &&
        review.correct >= STABLE_REVIEW_TARGET &&
        review.recentWrongStreak === 0);

    recordedTakeTotal += Math.min(completedTakes.length, targetTakeCount);
    if (stable) {
      stableEntryTotal += 1;
    }

    const type = getEntryTrainingType(entry);
    const shortPriority = type === "short" || type === "phrase-short" ? 1.2 : 0;
    const reviewNeed = review.correct + review.wrong === 0 && completedTakes.length > 0 ? 1.6 : 0;
    const wrongNeed = review.lastResultCorrect ? 0 : review.recentWrongStreak * 3 + Math.min(review.wrong * 0.25, 2);
    const firstTakeNeed = completedTakes.length === 0 ? 2 : 0;
    const missingTakeNeed = missingTakes * 2.2;
    const noCorrectNeed = review.correct === 0 ? 0.8 : 0;
    const priority = stable
      ? -1
      : missingTakeNeed + wrongNeed + reviewNeed + firstTakeNeed + noCorrectNeed + shortPriority;

    return {
      entry,
      completedTakes,
      missingTakes,
      review,
      stable,
      reviewMastered,
      priority
    };
  });

  const recordedRatio = targetTakeTotal ? recordedTakeTotal / targetTakeTotal : 0;
  const stableRatio = recordingEntries.length ? stableEntryTotal / recordingEntries.length : 0;
  const reviewTotal = reviewStats.correctTotal + reviewStats.wrongTotal;
  const reviewAccuracy = reviewTotal ? reviewStats.correctTotal / reviewTotal : 0;
  const readiness = Math.round(
    Math.max(0, Math.min((recordedRatio * 0.48 + stableRatio * 0.34 + reviewAccuracy * 0.18) * 100, 100))
  );

  return {
    entries,
    targetTakeTotal,
    recordedTakeTotal,
    stableEntryTotal,
    readiness,
    reviewStats,
    suggestions: entries
      .filter((item) => item.priority > 0)
      .sort((left, right) => right.priority - left.priority || left.entry.index - right.entry.index)
      .slice(0, 4)
  };
}

function getSuggestionReason(item) {
  const reasons = [];
  if (item.missingTakes > 0) {
    reasons.push(`thiếu ${item.missingTakes} take`);
  }

  if (item.review.wrong > 0) {
    const wrongLabel = item.review.lastResultCorrect
      ? `${item.review.wrong} lỗi cũ đã có lần đúng mới`
      : `${item.review.wrong} lần review sai`;
    reasons.push(wrongLabel);
  }

  if (item.completedTakes.length > 0 && item.review.correct + item.review.wrong === 0) {
    reasons.push("cần review để học sửa giọng");
  }

  if (!reasons.length) {
    reasons.push(`củng cố ${getTrainingTypeLabel(item.entry)}`);
  }

  return reasons.join(", ");
}

function renderTrainingDashboard() {
  if (!trainingReadinessText || !trainingSuggestionList) {
    return;
  }

  const summary = buildTrainingSummary();
  latestTrainingSuggestionIndex = summary.suggestions[0]?.entry.index ?? -1;

  trainingReadinessScore.textContent = `${summary.readiness}%`;
  trainingReadinessBar.style.width = `${summary.readiness}%`;
  trainingRecordedCount.textContent = `${summary.recordedTakeTotal}/${summary.targetTakeTotal}`;
  trainingReviewCount.textContent = `${summary.reviewStats.correctTotal}/${summary.reviewStats.wrongTotal}`;
  trainingStableCount.textContent = String(summary.stableEntryTotal);
  jumpTrainingSuggestionButton.disabled = latestTrainingSuggestionIndex < 0 || recorderState.isRecording;
  renderLearnedTargetList(summary);

  const confusionText = summary.reviewStats.topConfusions.length
    ? ` Dễ nhầm: ${summary.reviewStats.topConfusions
        .map((item) => `${item.label} (${item.count})`)
        .join("; ")}.`
    : "";

  trainingReadinessText.textContent =
    summary.readiness >= 72
      ? `Nền giọng cố định đang khá tốt. Có thể bắt đầu luyện câu mới có review.${confusionText}`
      : `Ưu tiên thu đủ take và review các mục ngắn trước để app học nhanh hơn.${confusionText}`;

  trainingSuggestionList.replaceChildren();

  if (!summary.suggestions.length) {
    const empty = document.createElement("p");
    empty.className = "meta-text";
    empty.textContent = "Không còn mục ưu tiên rõ ràng. Hãy luyện câu tự do và review để mở rộng phrasebook.";
    trainingSuggestionList.append(empty);
    return;
  }

  for (const item of summary.suggestions) {
    const button = document.createElement("button");
    button.className = "training-suggestion";
    button.type = "button";

    const title = document.createElement("strong");
    title.textContent = `${item.entry.originalId || item.entry.id}: ${item.entry.text}`;

    const meta = document.createElement("span");
    meta.textContent = `${getTrainingTypeLabel(item.entry)} • ${getSuggestionReason(item)}`;

    button.append(title, meta);
    button.addEventListener("click", () => {
      jumpToEntryIndex(item.entry.index, "Đã chuyển tới mục dashboard đề xuất.");
    });
    trainingSuggestionList.append(button);
  }
}

function getLearnedTargetStatus(item) {
  if (item.stable) {
    return "đủ nền";
  }

  if (item.review.lastResultCorrect) {
    return "vừa đúng";
  }

  if (item.review.correct > 0) {
    return "đang học";
  }

  return "có dữ liệu";
}

function renderLearnedTargetList(summary) {
  if (!learnedTargetList || !learnedTargetCount) {
    return;
  }

  const learnedItems = summary.entries
    .filter((item) => item.stable || item.review.correct > 0 || item.completedTakes.length > 0)
    .sort((left, right) => {
      if (left.stable !== right.stable) {
        return left.stable ? -1 : 1;
      }

      return (
        right.review.correct - left.review.correct ||
        right.completedTakes.length - left.completedTakes.length ||
        left.entry.index - right.entry.index
      );
    });

  learnedTargetCount.textContent = String(learnedItems.length);
  learnedTargetList.replaceChildren();

  if (!learnedItems.length) {
    const empty = document.createElement("p");
    empty.className = "meta-text";
    empty.textContent = "Chưa có mục nào đủ dữ liệu học.";
    learnedTargetList.append(empty);
    return;
  }

  for (const item of learnedItems.slice(0, 12)) {
    const row = document.createElement("div");
    row.className = "learned-target-item";

    const content = document.createElement("div");
    const title = document.createElement("strong");
    title.textContent = `${item.entry.originalId || item.entry.id}: ${item.entry.text}`;

    const meta = document.createElement("span");
    meta.textContent = `${getLearnedTargetStatus(item)} • đúng ${item.review.correct} / sai ${
      item.review.wrong
    } • take ${item.completedTakes.length}/${getTargetTakeCount()}`;

    const button = document.createElement("button");
    button.className = "secondary-button";
    button.type = "button";
    button.textContent = "Test lại";
    button.addEventListener("click", () => {
      jumpToEntryIndex(item.entry.index, "Đã chuyển tới mục đã học. Bấm Bắt đầu nói để test lại.");
    });

    content.append(title, meta);
    row.append(content, button);
    learnedTargetList.append(row);
  }
}

function handleSpeakerIdChange() {
  const sanitized = getCurrentSpeakerId();
  speakerIdInput.value = sanitized;
  recorderState.storage.speakerId = sanitized;
  saveRecorderStorage();
  resetRecordingArtifact({
    resetStatus: "Đã cập nhật speaker ID. Hãy thu lại hoặc tải với tên file mới."
  });
  renderRecorder();
}

async function initializeRecorder() {
  buildRecordingEntries();
  speakerIdInput.value = recorderState.storage.speakerId || DEFAULT_SPEAKER_ID;
  renderPackSelect();
  renderRecorder();

  if (!hasRecordingSupport) {
    setRecorderStatus("error", "Trình duyệt này chưa hỗ trợ thu âm bằng MediaRecorder.");
  }

  packSelect.addEventListener("change", () => {
    jumpToPack(Number(packSelect.value || "1"));
  });

  takeSelect.addEventListener("change", () => {
    resetRecordingArtifact({
      resetStatus: "Đã đổi take. Hãy thu âm lại để tránh nhầm tên file."
    });
    renderRecorder();
  });

  speakerIdInput.addEventListener("change", handleSpeakerIdChange);
  speakerIdInput.addEventListener("blur", handleSpeakerIdChange);
  prevSentenceButton.addEventListener("click", () => moveSentence(-1));
  nextSentenceButton.addEventListener("click", () => moveSentence(1));
  recordStartButton.addEventListener("click", () => {
    if (recorderState.isRecording) {
      stopDatasetRecording();
      return;
    }

    startDatasetRecording();
  });
  downloadRecordingButton.addEventListener("click", downloadCurrentRecording);
  jumpTrainingSuggestionButton.addEventListener("click", () => {
    jumpToEntryIndex(latestTrainingSuggestionIndex, "Đã chuyển tới mục app đề xuất luyện tiếp.");
  });
  window.addEventListener("voicecoach:training-data-changed", renderTrainingDashboard);
  window.addEventListener("storage", (event) => {
    if (event.key === SPEECH_REVIEWS_STORAGE_KEY || event.key === RECORDER_STORAGE_KEY) {
      renderTrainingDashboard();
    }
  });
  window.addEventListener("beforeunload", releaseRecorderStream);
}

initializeRecorder();

window.voiceRecorderControls = {
  getCurrentEntry,
  getCurrentSpeakerId,
  getCurrentRecognitionSentenceIds: () => {
    const entry = getCurrentEntry();
    if (!entry) {
      return [];
    }

    const scopeEntries = entry.utteranceType
      ? recordingEntries.filter((candidate) => candidate.utteranceType === entry.utteranceType)
      : entry.groupId
      ? recordingEntries.filter((candidate) => candidate.groupId === entry.groupId)
      : recordingEntries;

    return scopeEntries
      .flatMap((candidate) => [candidate.id, candidate.originalId])
      .filter(Boolean);
  },
  getCurrentPackSentenceIds: () => {
    const entry = getCurrentEntry();
    if (!entry) {
      return [];
    }

    return getEntriesInPack(entry.packNumber)
      .flatMap((packEntry) => [packEntry.id, packEntry.originalId])
      .filter(Boolean);
  }
};
})();
