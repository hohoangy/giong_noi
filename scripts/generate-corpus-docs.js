const fs = require("fs");
const path = require("path");
const vm = require("vm");

const rootDir = path.resolve(__dirname, "..");
const corpusPath = path.join(rootDir, "month2-corpus.js");
const docsDir = path.join(rootDir, "docs");
const outputPath = path.join(docsDir, "personal-voice-training-corpus.md");

const source = fs.readFileSync(corpusPath, "utf8");
const sandbox = { window: {} };
vm.createContext(sandbox);
vm.runInContext(source, sandbox);

const corpus = sandbox.window.MONTH2_CORPUS || [];

function escapeMarkdownTable(text) {
  return String(text).replace(/\|/g, "\\|");
}

function localPackNumber(item) {
  const offset = item.utteranceType === "long" ? 200 : 0;
  return Math.floor((item.sentenceNumber - 1 - offset) / 10) + 1;
}

function localPackName(item) {
  const typeLabel = item.utteranceType === "long" ? "Câu dài" : "Câu ngắn";
  return `${typeLabel} ${String(localPackNumber(item)).padStart(2, "0")}`;
}

function rangeLabel(items) {
  return `${items[0].id}-${items[items.length - 1].id}`;
}

function renderType(title, description, type) {
  const items = corpus.filter((item) => item.utteranceType === type);
  const categories = [
    ...new Map(items.map((item) => [item.categoryId, item.categoryName])).entries(),
  ];
  const lines = [];

  lines.push(`## ${title}`);
  lines.push("");
  lines.push(description);
  lines.push("");
  lines.push(`Tổng cộng: ${items.length} mẫu.`);
  lines.push("");

  for (const [categoryId, categoryName] of categories) {
    const categoryItems = items.filter((item) => item.categoryId === categoryId);
    lines.push(`### ${categoryId}. ${categoryName}`);
    lines.push("");
    lines.push("| ID | Câu mẫu | Pack thu âm |");
    lines.push("| --- | --- | --- |");
    for (const item of categoryItems) {
      lines.push(
        `| ${item.id} | ${escapeMarkdownTable(item.text)} | ${localPackName(item)} |`,
      );
    }
    lines.push("");
  }

  return lines;
}

const shortItems = corpus.filter((item) => item.utteranceType === "short");
const longItems = corpus.filter((item) => item.utteranceType === "long");
const packs = [];

for (const type of ["short", "long"]) {
  const typeItems = corpus.filter((item) => item.utteranceType === type);
  for (let index = 0; index < typeItems.length; index += 10) {
    const chunk = typeItems.slice(index, index + 10);
    const first = chunk[0];
    packs.push({
      name: localPackName(first),
      range: rangeLabel(chunk),
      topic: first.categoryName,
    });
  }
}

const lines = [];

lines.push("# Bộ câu huấn luyện giọng nói cá nhân");
lines.push("");
lines.push(
  "Tài liệu này mô tả bộ dữ liệu câu mẫu đang được app sử dụng để thu âm, học phát âm cá nhân và nhận diện lại giọng nói theo hướng phrase-first. Nội dung được đồng bộ từ `month2-corpus.js`.",
);
lines.push("");
lines.push("## Mục tiêu");
lines.push("");
lines.push("- Thu âm từng mẫu để tạo bộ giọng cá nhân sạch và nhất quán.");
lines.push("- Dạy app hiểu cụm ngắn trước, sau đó mới ghép với câu dài để giảm đoán sai.");
lines.push(
  "- Giữ đủ độ rộng về nhu cầu, sức khỏe, ăn uống, giao tiếp, gia đình, công việc, công nghệ, di chuyển, cảm xúc và tình huống khẩn cấp.",
);
lines.push("- Chia nhỏ theo pack 10 câu để dễ thu, dễ kiểm tra và dễ thu lại khi cần.");
lines.push("");
lines.push("## Cấu trúc bộ dữ liệu");
lines.push("");
lines.push(`- Tổng số mẫu: ${corpus.length}.`);
lines.push(`- Câu ngắn: ${shortItems.length} mẫu, dùng để học phát âm theo từ/cụm và sửa phrase.`);
lines.push(
  `- Câu dài: ${longItems.length} mẫu, đã rút còn khoảng 5-7 từ để học ngữ cảnh và sentence matching ổn định hơn.`,
);
lines.push("- Mỗi pack trong giao diện gồm 10 câu để điều hướng nhanh.");
lines.push("- Mỗi câu nên thu 1 file riêng, đọc đúng nội dung đang hiển thị.");
lines.push("");
lines.push("## Quy tắc thu âm");
lines.push("");
lines.push("- Giữ im lặng khoảng nửa giây trước khi nói.");
lines.push("- Đọc đúng một câu hoặc một cụm, tốc độ tự nhiên, không cần cố đọc quá nhanh.");
lines.push("- Nếu nói sai, thu lại take mới thay vì cắt ghép file.");
lines.push("- Ưu tiên hoàn thành câu ngắn trước để app học phát âm nền.");
lines.push("- Sau khi có đủ câu ngắn, tiếp tục thu câu dài để app học ngữ cảnh.");
lines.push("");
lines.push("## Bảng pack thu âm");
lines.push("");
lines.push("| Pack | Dải ID | Chủ đề |");
lines.push("| --- | --- | --- |");
for (const pack of packs) {
  lines.push(`| ${pack.name} | ${pack.range} | ${escapeMarkdownTable(pack.topic)} |`);
}
lines.push("");
lines.push(
  ...renderType(
    "Danh sách 200 câu ngắn",
    "Câu ngắn dùng để học phát âm theo cụm, token, bigram và trigram. Đây là lớp nền cho phrase correction.",
    "short",
  ),
);
lines.push(
  ...renderType(
    "Danh sách 200 câu dài",
    "Câu dài dùng để học ngữ cảnh giao tiếp, nhưng được giữ ở khoảng 5-7 từ để dễ thu âm, dễ khớp mẫu và giảm sai lệch nhịp đọc.",
    "long",
  ),
);

fs.mkdirSync(docsDir, { recursive: true });
fs.writeFileSync(outputPath, `${lines.join("\n")}\n`, "utf8");
console.log(`Generated ${path.relative(rootDir, outputPath)} from month2-corpus.js`);
