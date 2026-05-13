const fs = require("fs");
const path = require("path");
const vm = require("vm");

const workspaceRoot = process.cwd();
const speakerId = process.argv[2] || "user01";
const datasetRoot = path.join(workspaceRoot, "dataset");
const audioDir = path.join(datasetRoot, "audio", speakerId);
const month2CorpusPath = path.join(workspaceRoot, "month2-corpus.js");
const sampleSentencesPath = path.join(workspaceRoot, "sample-sentences.js");
const phrasesPath = path.join(workspaceRoot, "data", "phrases", "phrases.json");
const outputPath = path.join(datasetRoot, `manifest.${speakerId}.json`);
const EXPECTED_TAKES = [1, 2];

function loadSentenceCorpus() {
  if (fs.existsSync(month2CorpusPath)) {
    const source = fs.readFileSync(month2CorpusPath, "utf8");
    const sandbox = { window: {} };
    vm.runInNewContext(source, sandbox, { filename: "month2-corpus.js" });

    if (Array.isArray(sandbox.window.MONTH2_CORPUS)) {
      return {
        source: "month2-corpus.js",
        entries: sandbox.window.MONTH2_CORPUS,
      };
    }
  }

  const source = fs.readFileSync(filePath, "utf8");
  const sandbox = { window: {} };
  vm.runInNewContext(source, sandbox, { filename: "sample-sentences.js" });

  if (!Array.isArray(sandbox.window.SAMPLE_SENTENCES)) {
    throw new Error("window.SAMPLE_SENTENCES was not found in sample-sentences.js");
  }

  return {
    source: "sample-sentences.js",
    entries: sandbox.window.SAMPLE_SENTENCES.map((text, index) => ({
      id: `S${String(index + 1).padStart(3, "0")}`,
      sentenceNumber: index + 1,
      text,
    })),
  };
}

function loadPhraseCorpus(sentenceOffset) {
  if (!fs.existsSync(phrasesPath)) {
    return [];
  }

  const payload = JSON.parse(fs.readFileSync(phrasesPath, "utf8"));
  const phrases = Array.isArray(payload) ? payload : payload.phrases || [];

  return phrases
    .map((phrase, index) => {
      const text = typeof phrase === "string" ? phrase : phrase.text || "";
      const id = typeof phrase === "object" && phrase.id ? phrase.id : `P${String(index + 1).padStart(3, "0")}`;
      const tokenCount = text.trim().split(/\s+/).filter(Boolean).length;
      const isShortPhrase = tokenCount <= 3;

      return {
        id,
        originalId: id,
        sentenceNumber: sentenceOffset + index + 1,
        groupId: isShortPhrase ? "PHRASE_SHORT" : "PHRASE_LONG",
        groupName: isShortPhrase ? "Cụm ngắn" : "Cụm dài",
        partId: "A",
        priority: true,
        text,
      };
    })
    .filter((entry) => entry.text);
}

function parseFileName(fileName, currentSpeakerId) {
  const pattern = new RegExp(
    `^${currentSpeakerId.replace(/[.*+?^${}()|[\\]\\\\]/g, "\\$&")}_p(\\d{2})_([sp])(\\d{3})_t(\\d{2})\\.webm$`
  );
  const match = fileName.match(pattern);

  if (!match) {
    return null;
  }

  const [, packRaw, idPrefix, idRaw, takeRaw] = match;
  const sentenceId = `${idPrefix.toUpperCase()}${idRaw}`;
  return {
    pack: Number(packRaw),
    sentenceId,
    sentenceNumber: Number(idRaw),
    take: Number(takeRaw),
  };
}

function groupCounts(items, keyName) {
  const counts = new Map();

  for (const item of items) {
    const key = item[keyName];
    counts.set(key, (counts.get(key) || 0) + 1);
  }

  return [...counts.entries()]
    .sort((left, right) => left[0] - right[0])
    .map(([key, count]) => ({ [keyName]: key, count }));
}

if (!fs.existsSync(audioDir)) {
  throw new Error(`Audio directory was not found: ${audioDir}`);
}

const sentenceCorpus = loadSentenceCorpus(sampleSentencesPath);
const phraseEntries = loadPhraseCorpus(sentenceCorpus.entries.length);
sentenceCorpus.entries = [...sentenceCorpus.entries, ...phraseEntries];
sentenceCorpus.source = phraseEntries.length
  ? `${sentenceCorpus.source} + data/phrases/phrases.json`
  : sentenceCorpus.source;
const invalidFiles = [];
const corpusById = new Map(sentenceCorpus.entries.map((entry) => [entry.id, entry]));

const utterances = fs
  .readdirSync(audioDir)
  .filter((fileName) => fileName.toLowerCase().endsWith(".webm"))
  .sort((left, right) => left.localeCompare(right))
  .map((fileName) => {
    const parsed = parseFileName(fileName, speakerId);

    if (!parsed) {
      invalidFiles.push(fileName);
      return null;
    }

    const fullPath = path.join(audioDir, fileName);
    const stats = fs.statSync(fullPath);
    const sentenceEntry = corpusById.get(parsed.sentenceId) || sentenceCorpus.entries[parsed.sentenceNumber - 1] || null;
    const sentenceText = sentenceEntry?.text || null;

    return {
      file_name: fileName,
      relative_path: `dataset/audio/${speakerId}/${fileName}`,
      bytes: stats.size,
      pack: parsed.pack,
      sentence_id: parsed.sentenceId,
      sentence_number: sentenceEntry?.sentenceNumber || parsed.sentenceNumber,
      sentence_text: sentenceText,
      source_sentence_id: sentenceEntry?.originalId || sentenceEntry?.id || parsed.sentenceId,
      group_id: sentenceEntry?.groupId || null,
      group_name: sentenceEntry?.groupName || null,
      part_id: sentenceEntry?.partId || null,
      priority: Boolean(sentenceEntry?.priority),
      speaker_id: speakerId,
      take: parsed.take,
    };
  })
  .filter(Boolean);

const sentencesById = new Map();

for (const utterance of utterances) {
  if (!sentencesById.has(utterance.sentence_id)) {
    sentencesById.set(utterance.sentence_id, {
      sentence_id: utterance.sentence_id,
      sentence_number: utterance.sentence_number,
      sentence_text: utterance.sentence_text,
      source_sentence_id: utterance.source_sentence_id,
      group_id: utterance.group_id,
      group_name: utterance.group_name,
      part_id: utterance.part_id,
      priority: utterance.priority,
      pack: utterance.pack,
      takes: [],
    });
  }

  sentencesById.get(utterance.sentence_id).takes.push({
    take: utterance.take,
    file_name: utterance.file_name,
    relative_path: utterance.relative_path,
    bytes: utterance.bytes,
  });
}

const sentences = [...sentencesById.values()]
  .sort((left, right) => left.sentence_number - right.sentence_number)
  .map((sentence) => ({
    ...sentence,
    takes: sentence.takes.sort((left, right) => left.take - right.take),
  }));

const duplicateKeys = new Map();
for (const utterance of utterances) {
  const key = `${utterance.pack}-${utterance.sentence_number}-${utterance.take}`;
  duplicateKeys.set(key, (duplicateKeys.get(key) || 0) + 1);
}

const duplicateEntries = [...duplicateKeys.entries()]
  .filter(([, count]) => count > 1)
  .map(([key, count]) => ({ key, count }));

const missingExpectedTakes = [];
for (const sentence of sentences) {
  const takeSet = new Set(sentence.takes.map((item) => item.take));
  for (const expectedTake of EXPECTED_TAKES) {
    if (!takeSet.has(expectedTake)) {
      missingExpectedTakes.push({
        sentence_id: sentence.sentence_id,
        sentence_number: sentence.sentence_number,
        pack: sentence.pack,
        missing_take: expectedTake,
      });
    }
  }
}

const manifest = {
  version: 1,
  generated_at: new Date().toISOString(),
  speaker_id: speakerId,
  audio_root: `dataset/audio/${speakerId}`,
  sample_sentences_source: sentenceCorpus.source,
  summary: {
    total_files: utterances.length,
    total_sentences: sentences.length,
    unique_packs: groupCounts(utterances, "pack").length,
    packs: groupCounts(utterances, "pack"),
    takes: groupCounts(utterances, "take"),
    duplicate_entries: duplicateEntries,
    invalid_files: invalidFiles,
    missing_expected_takes: missingExpectedTakes,
  },
  sentences,
};

fs.writeFileSync(outputPath, `${JSON.stringify(manifest, null, 2)}\n`, "utf8");
console.log(`Wrote ${path.relative(workspaceRoot, outputPath)}`);
