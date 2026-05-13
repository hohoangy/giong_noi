const http = require("http");
const fs = require("fs");
const path = require("path");
const os = require("os");
const { spawn } = require("child_process");

const rootDir = __dirname;
let port = Number(process.env.PORT) || 3000;
const maxUploadBytes = 25 * 1024 * 1024;
const learnedRootDir = path.join(rootDir, "learned");
const learnedDbPath = path.join(learnedRootDir, "voicecoach.sqlite");
const maxLearnedServerSamples = 500;
let learnedDb = null;
let transcriberWorker = null;
let transcriberWorkerStartPromise = null;
let transcriberRequestId = 0;

const contentTypes = {
  ".css": "text/css; charset=utf-8",
  ".html": "text/html; charset=utf-8",
  ".js": "application/javascript; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".webm": "audio/webm",
  ".ogg": "audio/ogg",
  ".m4a": "audio/mp4",
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".svg": "image/svg+xml",
  ".ico": "image/x-icon"
};

function sendJson(response, statusCode, payload) {
  response.writeHead(statusCode, {
    "Content-Type": "application/json; charset=utf-8"
  });
  response.end(JSON.stringify(payload));
}

function sendFile(filePath, response) {
  const ext = path.extname(filePath).toLowerCase();
  const contentType = contentTypes[ext] || "application/octet-stream";

  fs.readFile(filePath, (error, data) => {
    if (error) {
      response.writeHead(error.code === "ENOENT" ? 404 : 500, {
        "Content-Type": "text/plain; charset=utf-8"
      });
      response.end(error.code === "ENOENT" ? "404 Not Found" : "500 Server Error");
      return;
    }

    response.writeHead(200, { "Content-Type": contentType });
    response.end(data);
  });
}

function getAudioExtension(contentType) {
  if (contentType.includes("ogg")) {
    return ".ogg";
  }

  if (contentType.includes("mp4")) {
    return ".m4a";
  }

  return ".webm";
}

function readRequestBody(request) {
  return new Promise((resolve, reject) => {
    const chunks = [];
    let totalBytes = 0;

    request.on("data", (chunk) => {
      totalBytes += chunk.length;

      if (totalBytes > maxUploadBytes) {
        reject(new Error("Audio upload is too large."));
        request.destroy();
        return;
      }

      chunks.push(chunk);
    });

    request.on("end", () => resolve(Buffer.concat(chunks)));
    request.on("error", reject);
  });
}

function sanitizeId(value, fallback) {
  const sanitized = String(value || "")
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9_-]/g, "");

  return sanitized || fallback;
}

function sanitizeText(value, maxLength = 1000) {
  return String(value || "").trim().slice(0, maxLength);
}

function getAudioExtensionFromMimeType(mimeType) {
  if (String(mimeType).includes("ogg")) {
    return "ogg";
  }

  if (String(mimeType).includes("mp4")) {
    return "m4a";
  }

  return "webm";
}

async function readJsonRequest(request) {
  const body = await readRequestBody(request);

  if (!body.length) {
    throw new Error("Request body is empty.");
  }

  return JSON.parse(body.toString("utf8"));
}

async function readJsonFile(filePath, fallback) {
  try {
    const raw = await fs.promises.readFile(filePath, "utf8");
    return JSON.parse(raw);
  } catch (error) {
    if (error.code === "ENOENT") {
      return fallback;
    }

    throw error;
  }
}

function createLearnedSampleId() {
  return `learned_${Date.now()}_${Math.random().toString(16).slice(2, 10)}`;
}

async function getLearnedDb() {
  if (learnedDb) {
    return learnedDb;
  }

  await fs.promises.mkdir(learnedRootDir, { recursive: true });

  let Database;
  try {
    Database = require("better-sqlite3");
  } catch (error) {
    const installError = new Error(
      "SQLite dependency is not installed. Run npm install, then restart the server."
    );
    installError.cause = error;
    throw installError;
  }

  learnedDb = new Database(learnedDbPath);
  learnedDb.pragma("journal_mode = WAL");
  learnedDb.exec(`
    CREATE TABLE IF NOT EXISTS learned_samples (
      id TEXT PRIMARY KEY,
      speaker_id TEXT NOT NULL,
      sentence_id TEXT NOT NULL,
      source_sentence_id TEXT NOT NULL,
      corrected_text TEXT NOT NULL,
      heard_text TEXT NOT NULL DEFAULT '',
      take TEXT NOT NULL DEFAULT 'review-wrong',
      file_name TEXT NOT NULL,
      relative_path TEXT NOT NULL,
      mime_type TEXT NOT NULL,
      bytes INTEGER NOT NULL DEFAULT 0,
      created_at TEXT NOT NULL
    );
    CREATE INDEX IF NOT EXISTS idx_learned_samples_speaker_created
      ON learned_samples (speaker_id, created_at);
  `);
  migrateLegacyLearnedManifests(learnedDb);

  return learnedDb;
}

function mapLearnedSampleRow(row) {
  return {
    id: row.id,
    speaker_id: row.speaker_id,
    sentence_id: row.sentence_id,
    source_sentence_id: row.source_sentence_id,
    corrected_text: row.corrected_text,
    heard_text: row.heard_text,
    take: row.take,
    file_name: row.file_name,
    relative_path: row.relative_path,
    mime_type: row.mime_type,
    bytes: row.bytes,
    created_at: row.created_at
  };
}

function migrateLegacyLearnedManifests(db) {
  if (!fs.existsSync(learnedRootDir)) {
    return;
  }

  const insertStatement = db.prepare(
    `INSERT OR IGNORE INTO learned_samples (
      id,
      speaker_id,
      sentence_id,
      source_sentence_id,
      corrected_text,
      heard_text,
      take,
      file_name,
      relative_path,
      mime_type,
      bytes,
      created_at
    ) VALUES (
      @id,
      @speaker_id,
      @sentence_id,
      @source_sentence_id,
      @corrected_text,
      @heard_text,
      @take,
      @file_name,
      @relative_path,
      @mime_type,
      @bytes,
      @created_at
    )`
  );
  const importSamples = db.transaction((samples) => {
    for (const sample of samples) {
      insertStatement.run(sample);
    }
  });

  for (const fileName of fs.readdirSync(learnedRootDir)) {
    const match = fileName.match(/^manifest\.([a-z0-9_-]+)\.json$/);
    if (!match) {
      continue;
    }

    const speakerId = match[1];
    const manifestPath = path.join(learnedRootDir, fileName);

    try {
      const manifest = JSON.parse(fs.readFileSync(manifestPath, "utf8"));
      const samples = (manifest.samples || [])
        .filter((sample) => sample.id && sample.corrected_text && sample.relative_path)
        .map((sample) => ({
          id: sample.id,
          speaker_id: sanitizeId(sample.speaker_id || speakerId, speakerId),
          sentence_id: sanitizeId(sample.sentence_id || sample.id, sample.id),
          source_sentence_id: sanitizeText(sample.source_sentence_id, 120) || "learned-audio",
          corrected_text: sanitizeText(sample.corrected_text),
          heard_text: sanitizeText(sample.heard_text),
          take: sanitizeText(sample.take, 80) || "review-wrong",
          file_name: sanitizeText(sample.file_name, 240) || path.basename(sample.relative_path),
          relative_path: sanitizeText(sample.relative_path, 500),
          mime_type: sanitizeText(sample.mime_type, 120) || "audio/webm",
          bytes: Number(sample.bytes || 0),
          created_at: sample.created_at || manifest.generated_at || new Date().toISOString()
        }));

      importSamples(samples);
    } catch (error) {
      console.warn(`Unable to migrate ${fileName}: ${error.message}`);
    }
  }
}

async function pruneLearnedSamples(db, speakerId) {
  const staleSamples = db
    .prepare(
      `SELECT id, relative_path
       FROM learned_samples
       WHERE speaker_id = ?
       ORDER BY created_at DESC
       LIMIT -1 OFFSET ?`
    )
    .all(speakerId, maxLearnedServerSamples);

  if (!staleSamples.length) {
    return;
  }

  const deleteStatement = db.prepare("DELETE FROM learned_samples WHERE id = ?");
  const deleteRows = db.transaction((samples) => {
    for (const sample of samples) {
      deleteStatement.run(sample.id);
    }
  });
  deleteRows(staleSamples);

  await Promise.all(
    staleSamples.map((sample) =>
      fs.promises.rm(path.join(rootDir, sample.relative_path), { force: true }).catch(() => {})
    )
  );
}

async function handleGetLearnedSamplesRequest(request, response) {
  try {
    const requestUrl = new URL(request.url, `http://${request.headers.host || "localhost"}`);
    const speakerId = sanitizeId(
      requestUrl.searchParams.get("speakerId") || requestUrl.searchParams.get("speaker_id"),
      "user01"
    );
    const db = await getLearnedDb();
    const samples = db
      .prepare(
        `SELECT *
         FROM learned_samples
         WHERE speaker_id = ?
         ORDER BY created_at ASC`
      )
      .all(speakerId)
      .map(mapLearnedSampleRow);

    sendJson(response, 200, {
      version: 1,
      speaker_id: speakerId,
      audio_root: `learned/audio/${speakerId}`,
      total_samples: samples.length,
      samples
    });
  } catch (error) {
    sendJson(response, 500, {
      error: error.message || "Unable to load learned samples."
    });
  }
}

async function handleLearnedSampleRequest(request, response) {
  try {
    const payload = await readJsonRequest(request);
    const speakerId = sanitizeId(payload.speakerId, "user01");
    const correctedText = sanitizeText(payload.correctedText);
    const heardText = sanitizeText(payload.heardText);
    const sourceSentenceId = sanitizeText(payload.sourceSentenceId, 120) || "learned-audio";
    const sentenceId = sanitizeId(payload.sentenceId, sourceSentenceId || "learned-audio");
    const mimeType = sanitizeText(payload.mimeType, 120) || "audio/webm";
    const audioBase64 = String(payload.audioBase64 || "").replace(/^data:.*?;base64,/, "");

    if (!correctedText) {
      sendJson(response, 400, { error: "correctedText is required." });
      return;
    }

    if (!audioBase64) {
      sendJson(response, 400, { error: "audioBase64 is required." });
      return;
    }

    const audioBuffer = Buffer.from(audioBase64, "base64");
    if (!audioBuffer.length) {
      sendJson(response, 400, { error: "audioBase64 is invalid." });
      return;
    }

    const extension = getAudioExtensionFromMimeType(mimeType);
    const sampleId = createLearnedSampleId();
    const audioDir = path.join(learnedRootDir, "audio", speakerId);
    const fileName = `${sampleId}.${extension}`;
    const relativePath = `learned/audio/${speakerId}/${fileName}`;
    const createdAt = new Date().toISOString();

    await fs.promises.mkdir(audioDir, { recursive: true });
    await fs.promises.writeFile(path.join(audioDir, fileName), audioBuffer);

    const db = await getLearnedDb();
    const sample = {
      id: sampleId,
      speaker_id: speakerId,
      sentence_id: sentenceId,
      source_sentence_id: sourceSentenceId,
      corrected_text: correctedText,
      heard_text: heardText,
      take: sanitizeText(payload.take, 80) || "review-wrong",
      file_name: fileName,
      relative_path: relativePath,
      mime_type: mimeType,
      bytes: audioBuffer.length,
      created_at: createdAt
    };

    db.prepare(
      `INSERT INTO learned_samples (
        id,
        speaker_id,
        sentence_id,
        source_sentence_id,
        corrected_text,
        heard_text,
        take,
        file_name,
        relative_path,
        mime_type,
        bytes,
        created_at
      ) VALUES (
        @id,
        @speaker_id,
        @sentence_id,
        @source_sentence_id,
        @corrected_text,
        @heard_text,
        @take,
        @file_name,
        @relative_path,
        @mime_type,
        @bytes,
        @created_at
      )`
    ).run(sample);
    await pruneLearnedSamples(db, speakerId);

    sendJson(response, 200, {
      ok: true,
      sample
    });
  } catch (error) {
    sendJson(response, 500, {
      error: error.message || "Unable to save learned sample."
    });
  }
}

function getPythonCandidates() {
  if (process.env.PYTHON) {
    return [{ command: process.env.PYTHON, args: [] }];
  }

  return process.platform === "win32"
    ? [
        { command: "py", args: ["-3"] },
        { command: "python", args: [] },
        { command: "python3", args: [] }
      ]
    : [
        { command: "python3", args: [] },
        { command: "python", args: [] }
      ];
}

function createTranscriberWorker(command, args) {
  const scriptPath = path.join(rootDir, "scripts", "transcribe-worker.py");
  const child = spawn(command, [...args, scriptPath], {
    cwd: rootDir,
    env: process.env,
    windowsHide: true
  });
  const pendingRequests = new Map();
  let lineBuffer = "";
  let readyResolve;
  let readyReject;
  const ready = new Promise((resolve, reject) => {
    readyResolve = resolve;
    readyReject = reject;
  });

  child.stdout.on("data", (chunk) => {
    lineBuffer += chunk.toString("utf8");
    const lines = lineBuffer.split(/\r?\n/);
    lineBuffer = lines.pop() || "";

    for (const line of lines) {
      if (!line.trim()) {
        continue;
      }

      let message;
      try {
        message = JSON.parse(line);
      } catch (error) {
        continue;
      }

      if (message.type === "ready") {
        worker.modelLoadMs = message.model_load_ms || 0;
        readyResolve(worker);
        continue;
      }

      if (message.type === "error") {
        readyReject(new Error(message.error || "Transcriber worker failed to start."));
        continue;
      }

      if (message.type === "result") {
        const pending = pendingRequests.get(message.id);

        if (!pending) {
          continue;
        }

        clearTimeout(pending.timeout);
        pendingRequests.delete(message.id);

        if (message.error) {
          pending.reject(new Error(message.error));
        } else {
          pending.resolve(message.result);
        }
      }
    }
  });

  child.stderr.on("data", (chunk) => {
    process.stderr.write(`[transcriber] ${chunk}`);
  });

  child.on("error", (error) => {
    readyReject(error);

    for (const pending of pendingRequests.values()) {
      clearTimeout(pending.timeout);
      pending.reject(error);
    }

    pendingRequests.clear();
  });

  child.on("close", (code) => {
    transcriberWorker = null;
    transcriberWorkerStartPromise = null;
    const error = new Error(`Transcriber worker exited with code ${code}.`);
    readyReject(error);

    for (const pending of pendingRequests.values()) {
      clearTimeout(pending.timeout);
      pending.reject(error);
    }

    pendingRequests.clear();
  });

  const worker = {
    child,
    ready,
    transcribe(audioPath) {
      const id = String(++transcriberRequestId);

      return new Promise((resolve, reject) => {
        const timeout = setTimeout(() => {
          pendingRequests.delete(id);
          reject(new Error("Local transcription timed out."));
        }, 120000);

        pendingRequests.set(id, { resolve, reject, timeout });
        child.stdin.write(`${JSON.stringify({ id, audioPath })}\n`, "utf8");
      });
    }
  };

  return worker;
}

async function getTranscriberWorker() {
  if (transcriberWorker) {
    return transcriberWorker.ready;
  }

  if (transcriberWorkerStartPromise) {
    return transcriberWorkerStartPromise;
  }

  const candidates = getPythonCandidates();
  const errors = [];

  transcriberWorkerStartPromise = (async () => {
    for (const candidate of candidates) {
      try {
        const worker = createTranscriberWorker(candidate.command, candidate.args);
        transcriberWorker = worker;
        await worker.ready;
        console.log(
          `Transcriber worker ready via ${candidate.command}${
            worker.modelLoadMs ? ` in ${worker.modelLoadMs}ms` : ""
          }.`
        );
        return worker;
      } catch (error) {
        errors.push(`${candidate.command}: ${error.message}`);
        transcriberWorker = null;
      }
    }

    transcriberWorkerStartPromise = null;
    throw new Error(errors.join(" | "));
  })();

  return transcriberWorkerStartPromise;
}

async function runLocalTranscriber(audioPath) {
  const worker = await getTranscriberWorker();
  return worker.transcribe(audioPath);
}

async function handleTranscribeRequest(request, response) {
  const startedAt = Date.now();
  const contentType = request.headers["content-type"] || "";
  const tempDir = await fs.promises.mkdtemp(path.join(os.tmpdir(), "voice-coach-"));
  const audioPath = path.join(tempDir, `input${getAudioExtension(contentType)}`);

  try {
    const readStartedAt = Date.now();
    const audioBuffer = await readRequestBody(request);
    const readMs = Date.now() - readStartedAt;

    if (!audioBuffer.length) {
      sendJson(response, 400, { error: "Audio body is empty." });
      return;
    }

    const writeStartedAt = Date.now();
    await fs.promises.writeFile(audioPath, audioBuffer);
    const writeMs = Date.now() - writeStartedAt;
    const transcribeStartedAt = Date.now();
    const result = await runLocalTranscriber(audioPath);
    const transcribeMs = Date.now() - transcribeStartedAt;
    sendJson(response, 200, {
      ...result,
      timing: {
        read_ms: readMs,
        write_ms: writeMs,
        transcribe_ms: transcribeMs,
        total_ms: Date.now() - startedAt,
        bytes: audioBuffer.length
      }
    });
  } catch (error) {
    sendJson(response, 503, {
      error: error.message,
      hint:
        "Install faster-whisper or openai-whisper locally, then restart the server. See scripts/transcribe-local.py."
    });
  } finally {
    fs.rm(tempDir, { recursive: true, force: true }, () => {});
  }
}

const server = http.createServer((request, response) => {
  if (request.method === "POST" && request.url.startsWith("/api/transcribe")) {
    handleTranscribeRequest(request, response);
    return;
  }

  if (request.method === "POST" && request.url.startsWith("/api/learned-samples")) {
    handleLearnedSampleRequest(request, response);
    return;
  }

  if (request.method === "GET" && request.url.startsWith("/api/learned-samples")) {
    handleGetLearnedSamplesRequest(request, response);
    return;
  }

  const urlPath = request.url === "/" ? "/index.html" : request.url;
  const safePath = path.normalize(urlPath).replace(/^(\.\.[\\/])+/, "");
  const filePath = path.join(rootDir, safePath);

  sendFile(filePath, response);
});

server.on("error", (error) => {
  if (error.code === "EADDRINUSE") {
    port += 1;
    server.listen(port);
    return;
  }

  console.error("Unable to start server:", error.message);
  process.exit(1);
});

server.listen(port, () => {
  console.log(`Server is running at http://localhost:${port}`);
  getTranscriberWorker().catch((error) => {
    console.warn(`Transcriber worker is not ready: ${error.message}`);
  });
});
