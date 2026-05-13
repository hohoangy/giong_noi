const speakerIdInput = document.getElementById("speakerIdInput");
const packSelect = document.getElementById("packSelect");
const takeSelect = document.getElementById("takeSelect");
const recordingSentenceId = document.getElementById("recordingSentenceId");
const recordingPositionText = document.getElementById("recordingPositionText");
const recordingSentenceText = document.getElementById("recordingSentenceText");
const recordingFileName = document.getElementById("recordingFileName");
const recordingPackSummary = document.getElementById("recordingPackSummary");
const recordingStatusDot = document.getElementById("recordingStatusDot");
const recordingStatusText = document.getElementById("recordingStatusText");
const prevSentenceButton = document.getElementById("prevSentenceButton");
const nextSentenceButton = document.getElementById("nextSentenceButton");
const recordStartButton = document.getElementById("recordStartButton");
const downloadRecordingButton = document.getElementById("downloadRecordingButton");
const recordingPreview = document.getElementById("recordingPreview");

const RECORDER_STORAGE_KEY = "voiceCoachDatasetRecorder";
const DEFAULT_SPEAKER_ID = "user01";
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

function getPhraseDatasetType(text) {
  const tokenCount = String(text || "").trim().split(/\s+/).filter(Boolean).length;
  return tokenCount <= 3 ? "phrase-short" : "phrase-long";
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
  window.addEventListener("beforeunload", releaseRecorderStream);
}

initializeRecorder();

window.voiceRecorderControls = {
  getCurrentEntry,
  getCurrentSpeakerId,
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
