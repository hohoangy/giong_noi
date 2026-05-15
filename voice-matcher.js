const VOICE_TEMPLATE_CACHE = new Map();
const VOICE_TEMPLATE_SUBSET_CACHE = new Map();
const VOICE_MANIFEST_CACHE = new Map();
const LEARNED_VOICE_TEMPLATE_CACHE = new Map();
const LEARNED_VOICE_DB_NAME = "voicecoach-learned-audio";
const LEARNED_VOICE_DB_VERSION = 1;
const LEARNED_VOICE_STORE = "samples";
const MAX_LEARNED_VOICE_SAMPLES = 200;
const VOICE_FEATURE_SIZE = 64;
const DTW_CANDIDATE_LIMIT = 24;
const DTW_CONFIRMED_CANDIDATE_LIMIT = 24;
const CONFIRMED_LEARNED_TAKES = new Set(["review-correct", "review-confirmed"]);
const CONFIRMED_LEARNED_MIN_SCORE = 0.68;
const CONFIRMED_LEARNED_BOOST_FLOOR = 0.91;
const CONFIRMED_LEARNED_BOOST_MAX = 0.98;
const CONFIRMED_LEARNED_EVIDENCE_TARGET = 4;
const SPECTRAL_SAMPLE_RATE = 16000;
const SPECTRAL_FRAME_SIZE = 400;
const SPECTRAL_HOP_SIZE = 160;
const SPECTRAL_BANDS = [
  140, 190, 260, 350, 470, 640, 860, 1160, 1560, 2100, 2830, 3800, 5100
];
const MAX_SPECTRAL_FRAMES = 90;
let SAMPLE_TRUST_STORE = {};

function setSampleTrustStore(store) {
  SAMPLE_TRUST_STORE = store && typeof store === "object" ? store : {};
}

function getTemplateTrustRecord(template) {
  const keys = [
    template?.relativePath,
    template?.serverPath,
    template?.fileName,
    template?.sourceSentenceId,
    template?.sentenceId
  ].filter(Boolean);

  for (const key of keys) {
    if (SAMPLE_TRUST_STORE[key]) {
      return SAMPLE_TRUST_STORE[key];
    }
  }

  return null;
}

function applyTrustToScore(score, template) {
  const trust = getTemplateTrustRecord(template);
  if (!trust) {
    return score;
  }

  const trustScore = Math.max(0, Math.min(Number(trust.trustScore || 0.5), 1));
  const evidence = Number(trust.correctCount || 0) + Number(trust.wrongCount || 0);
  const evidenceWeight = Math.min(evidence / 8, 1);
  const adjustment = (trustScore - 0.5) * 0.18 * evidenceWeight;
  return Math.max(0, Math.min(score + adjustment, 1));
}

function getAudioContext() {
  const AudioContextClass = window.AudioContext || window.webkitAudioContext;
  if (!AudioContextClass) {
    throw new Error("Trình duyệt chưa hỗ trợ Web Audio API.");
  }

  return new AudioContextClass();
}

async function decodeAudioBlob(blob) {
  const audioContext = getAudioContext();
  const arrayBuffer = await blob.arrayBuffer();
  const audioBuffer = await audioContext.decodeAudioData(arrayBuffer.slice(0));

  if (typeof audioContext.close === "function") {
    audioContext.close();
  }

  return audioBuffer;
}

function getMonoSamples(audioBuffer) {
  const output = new Float32Array(audioBuffer.length);

  for (let channelIndex = 0; channelIndex < audioBuffer.numberOfChannels; channelIndex += 1) {
    const channel = audioBuffer.getChannelData(channelIndex);
    for (let sampleIndex = 0; sampleIndex < channel.length; sampleIndex += 1) {
      output[sampleIndex] += channel[sampleIndex] / audioBuffer.numberOfChannels;
    }
  }

  return output;
}

function trimSilence(samples) {
  const threshold = 0.015;
  let start = 0;
  let end = samples.length - 1;

  while (start < samples.length && Math.abs(samples[start]) < threshold) {
    start += 1;
  }

  while (end > start && Math.abs(samples[end]) < threshold) {
    end -= 1;
  }

  return samples.slice(start, end + 1);
}

function normalizeSamples(samples) {
  let peak = 0;

  for (const sample of samples) {
    peak = Math.max(peak, Math.abs(sample));
  }

  if (!peak) {
    return samples;
  }

  return samples.map((sample) => sample / peak);
}

function resampleSamples(samples, sourceSampleRate, targetSampleRate) {
  if (sourceSampleRate === targetSampleRate) {
    return samples;
  }

  const ratio = sourceSampleRate / targetSampleRate;
  const outputLength = Math.max(Math.floor(samples.length / ratio), 1);
  const output = new Float32Array(outputLength);

  for (let index = 0; index < outputLength; index += 1) {
    const sourceIndex = index * ratio;
    const leftIndex = Math.floor(sourceIndex);
    const rightIndex = Math.min(leftIndex + 1, samples.length - 1);
    const weight = sourceIndex - leftIndex;
    output[index] = samples[leftIndex] * (1 - weight) + samples[rightIndex] * weight;
  }

  return output;
}

function normalizeVector(values) {
  const mean = values.reduce((sum, value) => sum + value, 0) / Math.max(values.length, 1);
  const variance =
    values.reduce((sum, value) => sum + (value - mean) ** 2, 0) / Math.max(values.length, 1);
  const std = Math.sqrt(variance) || 1;

  return values.map((value) => (value - mean) / std);
}

function extractFrameFeatures(samples, frameCount) {
  const envelope = [];
  const zeroCrossing = [];
  const frameSize = Math.max(Math.floor(samples.length / frameCount), 1);

  for (let frameIndex = 0; frameIndex < frameCount; frameIndex += 1) {
    const start = frameIndex * frameSize;
    const end = frameIndex === frameCount - 1 ? samples.length : Math.min(start + frameSize, samples.length);
    let energy = 0;
    let crossings = 0;
    let previous = samples[start] || 0;

    for (let index = start; index < end; index += 1) {
      const value = samples[index] || 0;
      energy += value * value;

      if ((previous < 0 && value >= 0) || (previous >= 0 && value < 0)) {
        crossings += 1;
      }

      previous = value;
    }

    const frameLength = Math.max(end - start, 1);
    envelope.push(Math.sqrt(energy / frameLength));
    zeroCrossing.push(crossings / frameLength);
  }

  return {
    envelope: normalizeVector(envelope),
    zeroCrossing: normalizeVector(zeroCrossing)
  };
}

function getGoertzelMagnitude(samples, start, frequency, sampleRate) {
  const normalizedFrequency = frequency / sampleRate;
  const coefficient = 2 * Math.cos(2 * Math.PI * normalizedFrequency);
  let previous = 0;
  let previous2 = 0;

  for (let index = 0; index < SPECTRAL_FRAME_SIZE; index += 1) {
    const windowPosition = index / Math.max(SPECTRAL_FRAME_SIZE - 1, 1);
    const hammingWindow = 0.54 - 0.46 * Math.cos(2 * Math.PI * windowPosition);
    const sample = (samples[start + index] || 0) * hammingWindow;
    const current = sample + coefficient * previous - previous2;
    previous2 = previous;
    previous = current;
  }

  return Math.sqrt(previous2 ** 2 + previous ** 2 - coefficient * previous * previous2);
}

function normalizeFeatureFrame(values) {
  const loggedValues = values.map((value) => Math.log1p(value));
  const mean =
    loggedValues.reduce((sum, value) => sum + value, 0) / Math.max(loggedValues.length, 1);
  const variance =
    loggedValues.reduce((sum, value) => sum + (value - mean) ** 2, 0) /
    Math.max(loggedValues.length, 1);
  const std = Math.sqrt(variance) || 1;

  return loggedValues.map((value) => (value - mean) / std);
}

function limitFrameCount(frames, maxFrames) {
  if (frames.length <= maxFrames) {
    return frames;
  }

  return Array.from({ length: maxFrames }, (_, index) => {
    const sourceIndex = Math.round((index * (frames.length - 1)) / Math.max(maxFrames - 1, 1));
    return frames[sourceIndex];
  });
}

function extractSpectralFeatures(samples, sampleRate) {
  const resampledSamples = resampleSamples(samples, sampleRate, SPECTRAL_SAMPLE_RATE);
  const frames = [];

  if (resampledSamples.length < SPECTRAL_FRAME_SIZE) {
    return [normalizeFeatureFrame(SPECTRAL_BANDS.map((frequency) =>
      getGoertzelMagnitude(resampledSamples, 0, frequency, SPECTRAL_SAMPLE_RATE)
    ))];
  }

  for (
    let start = 0;
    start <= resampledSamples.length - SPECTRAL_FRAME_SIZE;
    start += SPECTRAL_HOP_SIZE
  ) {
    const bandMagnitudes = SPECTRAL_BANDS.map((frequency) =>
      getGoertzelMagnitude(resampledSamples, start, frequency, SPECTRAL_SAMPLE_RATE)
    );
    frames.push(normalizeFeatureFrame(bandMagnitudes));
  }

  return limitFrameCount(frames, MAX_SPECTRAL_FRAMES);
}

async function extractVoiceFeatures(blob) {
  const audioBuffer = await decodeAudioBlob(blob);
  const monoSamples = trimSilence(getMonoSamples(audioBuffer));
  const samples = normalizeSamples(monoSamples.length ? monoSamples : getMonoSamples(audioBuffer));
  const frameFeatures = extractFrameFeatures(samples, VOICE_FEATURE_SIZE);

  return {
    duration: samples.length / audioBuffer.sampleRate,
    envelope: frameFeatures.envelope,
    zeroCrossing: frameFeatures.zeroCrossing,
    spectralFrames: extractSpectralFeatures(samples, audioBuffer.sampleRate)
  };
}

function cosineSimilarity(leftVector, rightVector) {
  let dot = 0;
  let leftMagnitude = 0;
  let rightMagnitude = 0;
  const length = Math.min(leftVector.length, rightVector.length);

  for (let index = 0; index < length; index += 1) {
    dot += leftVector[index] * rightVector[index];
    leftMagnitude += leftVector[index] ** 2;
    rightMagnitude += rightVector[index] ** 2;
  }

  if (!leftMagnitude || !rightMagnitude) {
    return 0;
  }

  return (dot / Math.sqrt(leftMagnitude * rightMagnitude) + 1) / 2;
}

function getFrameDistance(leftFrame, rightFrame) {
  let sum = 0;
  const length = Math.min(leftFrame.length, rightFrame.length);

  for (let index = 0; index < length; index += 1) {
    sum += (leftFrame[index] - rightFrame[index]) ** 2;
  }

  return Math.sqrt(sum / Math.max(length, 1));
}

function getDtwDistance(leftFrames, rightFrames) {
  if (!leftFrames.length || !rightFrames.length) {
    return Number.POSITIVE_INFINITY;
  }

  const leftLength = leftFrames.length;
  const rightLength = rightFrames.length;
  const previous = new Float32Array(rightLength + 1);
  const current = new Float32Array(rightLength + 1);
  previous.fill(Number.POSITIVE_INFINITY);
  previous[0] = 0;

  for (let leftIndex = 1; leftIndex <= leftLength; leftIndex += 1) {
    current.fill(Number.POSITIVE_INFINITY);

    for (let rightIndex = 1; rightIndex <= rightLength; rightIndex += 1) {
      const cost = getFrameDistance(leftFrames[leftIndex - 1], rightFrames[rightIndex - 1]);
      current[rightIndex] =
        cost +
        Math.min(
          previous[rightIndex],
          current[rightIndex - 1],
          previous[rightIndex - 1]
        );
    }

    previous.set(current);
  }

  return previous[rightLength] / Math.max(leftLength + rightLength, 1);
}

function getDtwSimilarity(leftFrames, rightFrames) {
  const distance = getDtwDistance(leftFrames, rightFrames);

  if (!Number.isFinite(distance)) {
    return 0;
  }

  return 1 / (1 + distance);
}

function compareVoiceFeatures(inputFeatures, templateFeatures) {
  const spectralScore = getDtwSimilarity(
    inputFeatures.spectralFrames,
    templateFeatures.spectralFrames
  );
  const envelopeScore = cosineSimilarity(inputFeatures.envelope, templateFeatures.envelope);
  const zcrScore = cosineSimilarity(inputFeatures.zeroCrossing, templateFeatures.zeroCrossing);
  const durationRatio =
    Math.min(inputFeatures.duration, templateFeatures.duration) /
    Math.max(inputFeatures.duration, templateFeatures.duration, 0.001);

  return spectralScore * 0.68 + envelopeScore * 0.14 + zcrScore * 0.04 + durationRatio * 0.14;
}

function compareVoiceFeaturesFast(inputFeatures, templateFeatures) {
  const envelopeScore = cosineSimilarity(inputFeatures.envelope, templateFeatures.envelope);
  const zcrScore = cosineSimilarity(inputFeatures.zeroCrossing, templateFeatures.zeroCrossing);
  const durationRatio =
    Math.min(inputFeatures.duration, templateFeatures.duration) /
    Math.max(inputFeatures.duration, templateFeatures.duration, 0.001);

  return envelopeScore * 0.55 + durationRatio * 0.35 + zcrScore * 0.1;
}

function scoreTemplateCandidates(inputFeatures, candidateTemplates) {
  const fastRankedTemplates = candidateTemplates
    .map((template) => ({
      template,
      fastScore: compareVoiceFeaturesFast(inputFeatures, template.features)
    }))
    .sort((left, right) => right.fastScore - left.fastScore);

  const dtwCandidatesByKey = new Map();
  const addDtwCandidates = (items, limit) => {
    for (const item of items.slice(0, Math.min(limit, items.length))) {
      const key = `${item.template.sourceSentenceId || item.template.sentenceId}:${item.template.fileName}:${item.template.createdAt || ""}`;
      dtwCandidatesByKey.set(key, item);
    }
  };

  addDtwCandidates(fastRankedTemplates, DTW_CANDIDATE_LIMIT);
  addDtwCandidates(
    fastRankedTemplates.filter((item) => isConfirmedLearnedTemplate(item.template)),
    DTW_CONFIRMED_CANDIDATE_LIMIT
  );

  const dtwCandidates = [...dtwCandidatesByKey.values()];

  return dtwCandidates.map((item) => {
    const rawScore = compareVoiceFeatures(inputFeatures, item.template.features);
    return {
      template: item.template,
      score: applyTrustToScore(rawScore, item.template),
      rawScore,
      trust: getTemplateTrustRecord(item.template),
      fastScore: item.fastScore
    };
  });
}

function isConfirmedLearnedTemplate(template) {
  return Boolean(template?.confirmed || CONFIRMED_LEARNED_TAKES.has(template?.take));
}

function getConfirmedLearnedConfidence(score, secondBestScore, template, evidence = {}) {
  const margin = Math.max(score - secondBestScore, 0);
  const baseConfidence = Math.min(score + margin * 0.25, 1);

  if (!isConfirmedLearnedTemplate(template) || score < CONFIRMED_LEARNED_MIN_SCORE) {
    return baseConfidence;
  }

  const confirmedTakeCount = Math.max(1, Number(evidence.confirmedTakeCount || 1));
  const confirmedEvidenceScore = Math.min(
    confirmedTakeCount / CONFIRMED_LEARNED_EVIDENCE_TARGET,
    1
  );
  const confirmedAverageScore = Number(evidence.confirmedAverageScore || score);
  const evidenceBoost = Math.min((score - CONFIRMED_LEARNED_MIN_SCORE) * 0.35, 0.07);
  const marginBoost = Math.min(margin * 0.12, 0.03);
  const countBoost = confirmedEvidenceScore * 0.035;
  const averageBoost = Math.max(confirmedAverageScore - CONFIRMED_LEARNED_MIN_SCORE, 0) * 0.08;
  return Math.min(
    Math.max(
      baseConfidence,
      CONFIRMED_LEARNED_BOOST_FLOOR + evidenceBoost + marginBoost + countBoost + averageBoost
    ),
    CONFIRMED_LEARNED_BOOST_MAX
  );
}

function runIndexedDbRequest(request) {
  return new Promise((resolve, reject) => {
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error || new Error("IndexedDB request failed."));
  });
}

function openLearnedVoiceDb() {
  if (!window.indexedDB) {
    return Promise.reject(new Error("Trình duyệt chưa hỗ trợ IndexedDB để lưu mẫu học."));
  }

  return new Promise((resolve, reject) => {
    const request = window.indexedDB.open(LEARNED_VOICE_DB_NAME, LEARNED_VOICE_DB_VERSION);

    request.onupgradeneeded = () => {
      const db = request.result;
      if (!db.objectStoreNames.contains(LEARNED_VOICE_STORE)) {
        const store = db.createObjectStore(LEARNED_VOICE_STORE, { keyPath: "id" });
        store.createIndex("speakerId", "speakerId", { unique: false });
        store.createIndex("createdAt", "createdAt", { unique: false });
      }
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error || new Error("Không mở được IndexedDB."));
  });
}

async function withLearnedVoiceStore(mode, callback) {
  const db = await openLearnedVoiceDb();

  try {
    return await new Promise((resolve, reject) => {
      const transaction = db.transaction(LEARNED_VOICE_STORE, mode);
      const store = transaction.objectStore(LEARNED_VOICE_STORE);
      let callbackResult;

      transaction.oncomplete = () => resolve(callbackResult);
      transaction.onerror = () => reject(transaction.error || new Error("IndexedDB transaction failed."));
      transaction.onabort = () => reject(transaction.error || new Error("IndexedDB transaction aborted."));

      Promise.resolve(callback(store))
        .then((result) => {
          callbackResult = result;
        })
        .catch((error) => {
          transaction.abort();
          reject(error);
        });
    });
  } finally {
    db.close();
  }
}

async function getStoredLearnedVoiceSamples(speakerId) {
  return withLearnedVoiceStore("readonly", async (store) => {
    const index = store.index("speakerId");
    return runIndexedDbRequest(index.getAll(speakerId));
  });
}

async function pruneLearnedVoiceSamples(speakerId) {
  const samples = await getStoredLearnedVoiceSamples(speakerId);
  const overflowCount = samples.length - MAX_LEARNED_VOICE_SAMPLES;

  if (overflowCount <= 0) {
    return;
  }

  const idsToDelete = samples
    .slice()
    .sort((left, right) => String(left.createdAt).localeCompare(String(right.createdAt)))
    .slice(0, overflowCount)
    .map((sample) => sample.id);

  await withLearnedVoiceStore("readwrite", async (store) => {
    for (const id of idsToDelete) {
      store.delete(id);
    }
  });
}

function createLearnedVoiceSampleId() {
  if (window.crypto?.randomUUID) {
    return window.crypto.randomUUID();
  }

  return `learned-${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

function blobToBase64(blob) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const result = String(reader.result || "");
      resolve(result.includes(",") ? result.split(",").pop() : result);
    };
    reader.onerror = () => reject(reader.error || new Error("Không đọc được audio để lưu."));
    reader.readAsDataURL(blob);
  });
}

async function saveLearnedVoiceSampleToServer(blob, speakerId, metadata) {
  const response = await fetch("/api/learned-samples", {
    method: "POST",
    headers: {
      "Content-Type": "application/json"
    },
    body: JSON.stringify({
      speakerId,
      heardText: metadata.heardText || "",
      correctedText: metadata.correctedText || "",
      sentenceId: metadata.sentenceId || "",
      sourceSentenceId: metadata.sourceSentenceId || "learned-audio",
      take: metadata.take || "review-wrong",
      mimeType: blob.type || "audio/webm",
      audioBase64: await blobToBase64(blob)
    })
  });
  const payload = await response.json().catch(() => ({}));

  if (!response.ok) {
    throw new Error(payload.error || "Không lưu được mẫu học lên server.");
  }

  return payload.sample || null;
}

async function saveLearnedVoiceSample(blob, speakerId, metadata = {}) {
  if (!blob) {
    throw new Error("Không có audio để lưu mẫu học.");
  }

  const correctedText = String(metadata.correctedText || "").trim();
  if (!correctedText) {
    throw new Error("Cần câu đúng để lưu mẫu học.");
  }

  let serverSample = null;
  try {
    serverSample = await saveLearnedVoiceSampleToServer(blob, speakerId, {
      ...metadata,
      correctedText
    });
  } catch (error) {
    console.warn("Unable to persist learned audio on server:", error.message);
  }

  const createdAt = new Date().toISOString();
  const sample = {
    id: serverSample?.id || createLearnedVoiceSampleId(),
    speakerId,
    sentenceId: serverSample?.sentence_id || metadata.sentenceId || `learned-${Date.now()}`,
    sourceSentenceId: serverSample?.source_sentence_id || metadata.sourceSentenceId || "learned-audio",
    text: correctedText,
    heardText: String(metadata.heardText || "").trim(),
    fileName: serverSample?.file_name || metadata.fileName || `learned_${Date.now()}.webm`,
    take: serverSample?.take || metadata.take || "learned",
    confirmed: CONFIRMED_LEARNED_TAKES.has(serverSample?.take || metadata.take),
    mimeType: blob.type || "audio/webm",
    audioBlob: blob,
    features: await extractVoiceFeatures(blob),
    createdAt: serverSample?.created_at || createdAt,
    serverPath: serverSample?.relative_path || ""
  };

  await withLearnedVoiceStore("readwrite", async (store) => {
    store.put(sample);
  });
  await pruneLearnedVoiceSamples(speakerId);
  LEARNED_VOICE_TEMPLATE_CACHE.delete(speakerId);

  return sample;
}

async function loadServerLearnedVoiceTemplates(speakerId) {
  try {
    const manifestResponse = await fetch(`/api/learned-samples?speakerId=${encodeURIComponent(speakerId)}`, {
      cache: "no-store"
    });

    if (!manifestResponse.ok) {
      return [];
    }

    const manifest = await manifestResponse.json();
    const templates = [];

    for (const sample of manifest.samples || []) {
      try {
        const audioResponse = await fetch(sample.relative_path, { cache: "no-store" });
        if (!audioResponse.ok) {
          continue;
        }

        const blob = await audioResponse.blob();
        templates.push({
          speakerId,
          sentenceId: sample.sentence_id || sample.id,
          sourceSentenceId: sample.source_sentence_id || "learned-audio",
          text: sample.corrected_text || "",
          heardText: sample.heard_text || "",
          take: sample.take || "learned",
          confirmed: CONFIRMED_LEARNED_TAKES.has(sample.take || "learned"),
          fileName: sample.file_name || sample.id,
          relativePath: sample.relative_path || "",
          features: await extractVoiceFeatures(blob),
          learned: true,
          serverStored: true,
          createdAt: sample.created_at || manifest.generated_at || ""
        });
      } catch (error) {
        // Skip samples the browser cannot fetch or decode.
      }
    }

    return templates.filter((template) => template.text && template.features);
  } catch (error) {
    return [];
  }
}

async function loadLearnedVoiceTemplates(speakerId) {
  if (LEARNED_VOICE_TEMPLATE_CACHE.has(speakerId)) {
    return LEARNED_VOICE_TEMPLATE_CACHE.get(speakerId);
  }

  const loadPromise = (async () => {
    const samples = await getStoredLearnedVoiceSamples(speakerId);
    const localTemplates = samples
      .filter((sample) => sample.text && sample.features)
      .map((sample) => ({
        speakerId: sample.speakerId,
        sentenceId: sample.sentenceId,
        sourceSentenceId: sample.sourceSentenceId,
        text: sample.text,
        heardText: sample.heardText,
        take: sample.take,
        confirmed: Boolean(sample.confirmed) || CONFIRMED_LEARNED_TAKES.has(sample.take),
        fileName: sample.fileName,
        relativePath: sample.serverPath || "",
        features: sample.features,
        learned: true,
        serverStored: Boolean(sample.serverPath),
        createdAt: sample.createdAt
      }));
    const serverTemplates = await loadServerLearnedVoiceTemplates(speakerId);
    const templatesByKey = new Map();

    for (const template of [...serverTemplates, ...localTemplates]) {
      const key = `${template.sourceSentenceId}:${template.fileName}:${template.createdAt}`;
      templatesByKey.set(key, template);
    }

    return [...templatesByKey.values()];
  })();

  LEARNED_VOICE_TEMPLATE_CACHE.set(speakerId, loadPromise);

  try {
    const templates = await loadPromise;
    LEARNED_VOICE_TEMPLATE_CACHE.set(speakerId, templates);
    return templates;
  } catch (error) {
    LEARNED_VOICE_TEMPLATE_CACHE.delete(speakerId);
    throw error;
  }
}

function resetLearnedVoiceSamples() {
  LEARNED_VOICE_TEMPLATE_CACHE.clear();

  if (!window.indexedDB) {
    return Promise.resolve(false);
  }

  return new Promise((resolve, reject) => {
    const request = window.indexedDB.deleteDatabase(LEARNED_VOICE_DB_NAME);
    request.onsuccess = () => resolve(true);
    request.onblocked = () => resolve(false);
    request.onerror = () => reject(request.error || new Error("Không xóa được IndexedDB learned audio."));
  });
}

function getTopMatches(scoredTemplates, limit = 5) {
  return scoredTemplates
    .slice()
    .sort((left, right) => right.score - left.score)
    .slice(0, limit)
    .map((item) => ({
      sentenceId: item.template.sentenceId,
      sourceSentenceId: item.template.sourceSentenceId,
      take: item.template.take,
      fileName: item.template.fileName,
      text: item.template.text,
      score: item.score,
      trustScore: item.trust?.trustScore || null,
      percent: Math.round(item.score * 100)
    }));
}

function normalizeTemplateText(value) {
  return String(value || "")
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/đ/g, "d")
    .replace(/[^a-z0-9\s]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function getSentenceLevelMatches(scoredTemplates, options = {}) {
  const matchesBySentence = new Map();

  for (const scoredTemplate of scoredTemplates) {
    const key = options.groupByText
      ? normalizeTemplateText(scoredTemplate.template.text) || scoredTemplate.template.sentenceId
      : scoredTemplate.template.sentenceId;

    if (!matchesBySentence.has(key)) {
      matchesBySentence.set(key, []);
    }

    matchesBySentence.get(key).push(scoredTemplate);
  }

  return [...matchesBySentence.values()].map((sentenceMatches) => {
    const sortedMatches = sentenceMatches
      .slice()
      .sort((left, right) => right.score - left.score);
    const bestMatch = sortedMatches[0];
    const topScores = sortedMatches.slice(0, 3).map((item) => item.score);
    const averageTopScore =
      topScores.reduce((sum, score) => sum + score, 0) / Math.max(topScores.length, 1);
    const confirmedMatches = sentenceMatches
      .filter((item) => isConfirmedLearnedTemplate(item.template))
      .sort((left, right) => right.score - left.score);
    const confirmedTopScores = confirmedMatches.slice(0, 4).map((item) => item.score);
    const confirmedAverageScore =
      confirmedTopScores.reduce((sum, score) => sum + score, 0) /
      Math.max(confirmedTopScores.length, 1);
    const confirmedEvidenceScore = Math.min(
      confirmedMatches.length / CONFIRMED_LEARNED_EVIDENCE_TARGET,
      1
    );
    const confirmedScore =
      confirmedMatches.length && confirmedAverageScore >= CONFIRMED_LEARNED_MIN_SCORE
        ? confirmedAverageScore * 0.86 + confirmedEvidenceScore * 0.14
        : 0;
    const blendedScore = bestMatch.score * 0.72 + averageTopScore * 0.28;

    return {
      template: bestMatch.template,
      score: confirmedScore ? Math.max(blendedScore, confirmedScore) : blendedScore,
      bestTakeScore: bestMatch.score,
      takeCount: sentenceMatches.length,
      confirmedTakeCount: confirmedMatches.length,
      confirmedAverageScore
    };
  });
}

async function loadVoiceTemplates(speakerId) {
  if (VOICE_TEMPLATE_CACHE.has(speakerId)) {
    return VOICE_TEMPLATE_CACHE.get(speakerId);
  }

  const loadPromise = (async () => {
    const manifest = await loadVoiceManifest(speakerId);
    const templates = [];

    for (const sentence of manifest.sentences || []) {
      for (const take of sentence.takes || []) {
        const template = await loadVoiceTemplateFromTake(speakerId, sentence, take);
        if (template) {
          templates.push(template);
        }
      }
    }

    return templates;
  })();

  VOICE_TEMPLATE_CACHE.set(speakerId, loadPromise);

  try {
    const templates = await loadPromise;
    VOICE_TEMPLATE_CACHE.set(speakerId, templates);
    return templates;
  } catch (error) {
    VOICE_TEMPLATE_CACHE.delete(speakerId);
    throw error;
  }
}

async function loadVoiceManifest(speakerId) {
  if (VOICE_MANIFEST_CACHE.has(speakerId)) {
    return VOICE_MANIFEST_CACHE.get(speakerId);
  }

  const loadPromise = (async () => {
    const manifestResponse = await fetch(`dataset/manifest.${speakerId}.json`, { cache: "no-store" });
    if (!manifestResponse.ok) {
      throw new Error(`Không tìm thấy manifest cho ${speakerId}.`);
    }

    return manifestResponse.json();
  })();

  VOICE_MANIFEST_CACHE.set(speakerId, loadPromise);

  try {
    const manifest = await loadPromise;
    VOICE_MANIFEST_CACHE.set(speakerId, manifest);
    return manifest;
  } catch (error) {
    VOICE_MANIFEST_CACHE.delete(speakerId);
    throw error;
  }
}

async function loadVoiceTemplateFromTake(speakerId, sentence, take) {
  try {
    const audioResponse = await fetch(take.relative_path);
    if (!audioResponse.ok) {
      return null;
    }

    const blob = await audioResponse.blob();
    return {
      speakerId,
      sentenceId: sentence.sentence_id,
      sourceSentenceId: sentence.source_sentence_id || sentence.sentence_id,
      text: sentence.sentence_text,
      take: take.take,
      fileName: take.file_name,
      relativePath: take.relative_path,
      features: await extractVoiceFeatures(blob)
    };
  } catch (error) {
    return null;
  }
}

async function loadVoiceTemplatesForSentenceIds(speakerId, allowedSentenceIds) {
  const allowedIds = [...new Set(allowedSentenceIds || [])].filter(Boolean).sort();

  if (!allowedIds.length) {
    return loadVoiceTemplates(speakerId);
  }

  const cacheKey = `${speakerId}:${allowedIds.join("|")}`;
  if (VOICE_TEMPLATE_SUBSET_CACHE.has(cacheKey)) {
    return VOICE_TEMPLATE_SUBSET_CACHE.get(cacheKey);
  }

  const loadPromise = (async () => {
    const manifest = await loadVoiceManifest(speakerId);
    const allowedSet = new Set(allowedIds);
    const templates = [];

    for (const sentence of manifest.sentences || []) {
      if (
        !allowedSet.has(sentence.sentence_id) &&
        !allowedSet.has(sentence.source_sentence_id)
      ) {
        continue;
      }

      for (const take of sentence.takes || []) {
        const template = await loadVoiceTemplateFromTake(speakerId, sentence, take);
        if (template) {
          templates.push(template);
        }
      }
    }

    return templates;
  })();

  VOICE_TEMPLATE_SUBSET_CACHE.set(cacheKey, loadPromise);

  try {
    const templates = await loadPromise;
    VOICE_TEMPLATE_SUBSET_CACHE.set(cacheKey, templates);
    return templates;
  } catch (error) {
    VOICE_TEMPLATE_SUBSET_CACHE.delete(cacheKey);
    throw error;
  }
}

async function matchVoiceToTemplates(blob, speakerId, options = {}) {
  const allowedSentenceIds = new Set(options.allowedSentenceIds || []);
  const templates = allowedSentenceIds.size
    ? await loadVoiceTemplatesForSentenceIds(speakerId, allowedSentenceIds)
    : await loadVoiceTemplates(speakerId);
  const candidateTemplates = templates;

  if (!candidateTemplates.length) {
    return {
      originalAudioAvailable: true,
      correctedText: "",
      confidence: 0,
      templateCount: templates.length,
      candidateCount: 0,
      topMatches: [],
      match: null
    };
  }

  const startedAt = performance.now();
  const inputFeatures = await extractVoiceFeatures(blob);
  const scoredTemplates = scoreTemplateCandidates(inputFeatures, candidateTemplates);
  const scoredSentences = getSentenceLevelMatches(scoredTemplates);
  const topMatches = getTopMatches(scoredSentences);
  const bestScoredSentence = scoredSentences
    .slice()
    .sort((left, right) => right.score - left.score)[0] || null;

  if (!bestScoredSentence) {
    return {
      originalAudioAvailable: true,
      correctedText: "",
      confidence: 0,
      templateCount: templates.length,
      candidateCount: candidateTemplates.length,
      topMatches: [],
      match: null
    };
  }

  const secondBestScore =
    scoredSentences
      .filter((item) => item !== bestScoredSentence)
      .sort((left, right) => right.score - left.score)[0]?.score || 0;
  const margin = Math.max(bestScoredSentence.score - secondBestScore, 0);

  return {
    originalAudioAvailable: true,
    correctedText: bestScoredSentence.template.text,
    confidence: getConfirmedLearnedConfidence(
      bestScoredSentence.score,
      secondBestScore,
      bestScoredSentence.template,
      bestScoredSentence
    ),
    templateCount: templates.length,
    candidateCount: candidateTemplates.length,
    scoredTemplateCount: scoredTemplates.length,
    topMatches,
    timing: {
      audioMatchMs: performance.now() - startedAt
    },
    match: {
      sentenceId: bestScoredSentence.template.sentenceId,
      sourceSentenceId: bestScoredSentence.template.sourceSentenceId,
      take: bestScoredSentence.template.take,
      fileName: bestScoredSentence.template.fileName,
      relativePath: bestScoredSentence.template.relativePath,
      rawConfidence: bestScoredSentence.score,
      trustScore: getTemplateTrustRecord(bestScoredSentence.template)?.trustScore || null,
      bestTakeScore: bestScoredSentence.bestTakeScore,
      takeCount: bestScoredSentence.takeCount,
      confirmedTakeCount: bestScoredSentence.confirmedTakeCount,
      confirmedAverageScore: bestScoredSentence.confirmedAverageScore,
      secondBestScore
    }
  };
}

function filterTemplatesByExpectedSentence(templates, options = {}) {
  const expectedSentenceIds = new Set(options.expectedSentenceIds || []);
  const expectedTexts = new Set((options.expectedTexts || []).map(normalizeTemplateText).filter(Boolean));
  const allowedSentenceIds = new Set(options.allowedSentenceIds || []);

  if (expectedSentenceIds.size || expectedTexts.size) {
    return templates.filter(
      (template) =>
        expectedSentenceIds.has(template.sentenceId) ||
        expectedSentenceIds.has(template.sourceSentenceId) ||
        expectedTexts.has(normalizeTemplateText(template.text))
    );
  }

  if (allowedSentenceIds.size) {
    const filteredTemplates = templates.filter(
      (template) =>
        allowedSentenceIds.has(template.sentenceId) ||
        allowedSentenceIds.has(template.sourceSentenceId)
    );

    if (!filteredTemplates.length && options.allowOpenLearned) {
      return templates;
    }

    return filteredTemplates;
  }

  return templates;
}

async function matchLearnedVoiceSamples(blob, speakerId, options = {}) {
  const templates = await loadLearnedVoiceTemplates(speakerId);
  const candidateTemplates = filterTemplatesByExpectedSentence(templates, options);

  if (!candidateTemplates.length) {
    return {
      originalAudioAvailable: true,
      correctedText: "",
      confidence: 0,
      templateCount: templates.length,
      candidateCount: 0,
      topMatches: [],
      match: null,
      source: "learned-audio"
    };
  }

  const startedAt = performance.now();
  const inputFeatures = await extractVoiceFeatures(blob);
  const scoredTemplates = scoreTemplateCandidates(inputFeatures, candidateTemplates);
  const scoredSentences = getSentenceLevelMatches(scoredTemplates, { groupByText: true });
  const topMatches = getTopMatches(scoredSentences);
  const bestScoredSentence = scoredSentences
    .slice()
    .sort((left, right) => right.score - left.score)[0] || null;

  if (!bestScoredSentence) {
    return {
      originalAudioAvailable: true,
      correctedText: "",
      confidence: 0,
      templateCount: templates.length,
      candidateCount: candidateTemplates.length,
      topMatches: [],
      match: null,
      source: "learned-audio"
    };
  }

  const secondBestScore =
    scoredSentences
      .filter((item) => item !== bestScoredSentence)
      .sort((left, right) => right.score - left.score)[0]?.score || 0;
  const margin = Math.max(bestScoredSentence.score - secondBestScore, 0);

  return {
    originalAudioAvailable: true,
    correctedText: bestScoredSentence.template.text,
    confidence: getConfirmedLearnedConfidence(
      bestScoredSentence.score,
      secondBestScore,
      bestScoredSentence.template,
      bestScoredSentence
    ),
    templateCount: templates.length,
    candidateCount: candidateTemplates.length,
    scoredTemplateCount: scoredTemplates.length,
    topMatches,
    timing: {
      audioMatchMs: performance.now() - startedAt
    },
    match: {
      sentenceId: bestScoredSentence.template.sentenceId,
      sourceSentenceId: bestScoredSentence.template.sourceSentenceId,
      take: bestScoredSentence.template.take,
      fileName: bestScoredSentence.template.fileName,
      rawConfidence: bestScoredSentence.score,
      trustScore: getTemplateTrustRecord(bestScoredSentence.template)?.trustScore || null,
      bestTakeScore: bestScoredSentence.bestTakeScore,
      takeCount: bestScoredSentence.takeCount,
      confirmedTakeCount: bestScoredSentence.confirmedTakeCount,
      confirmedAverageScore: bestScoredSentence.confirmedAverageScore,
      secondBestScore,
      learned: true,
      confirmed: isConfirmedLearnedTemplate(bestScoredSentence.template)
    },
    source: "learned-audio"
  };
}

window.voiceTemplateMatcher = {
  loadVoiceTemplates,
  loadLearnedVoiceTemplates,
  matchVoiceToTemplates,
  matchLearnedVoiceSamples,
  saveLearnedVoiceSample,
  resetLearnedVoiceSamples,
  setSampleTrustStore
};
