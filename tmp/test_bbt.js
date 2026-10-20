const { unflattenMarkdownTables, embedBbtSvgsInText, parseMarkdownBbtTable, convertBbtTableToSvg } = require('./src/lib/bbtRenderer.ts');

const sampleExamQuestion = `Cho hàm số $y = f(x)$ có bảng biến thiên như sau:

| x | -\\infty | 1 | +\\infty |
|---|---|---|---|
| y' | | - | || | - | |
| y | 2 | ↘ | -\\infty || +\\infty | ↘ | 2 |

Mệnh đề nào dưới đây đúng?`;

console.log("=== ORIGINAL INPUT ===");
console.log(sampleExamQuestion);

console.log("\n=== UNFLATTENED ===");
const unflat = unflattenMarkdownTables(sampleExamQuestion);
console.log(unflat);

console.log("\n=== PARSED BBT ===");
const parsed = parseMarkdownBbtTable(unflat);
console.log(JSON.stringify(parsed, null, 2));

console.log("\n=== EMBEDDED BBT ===");
const embedded = embedBbtSvgsInText(sampleExamQuestion);
console.log(embedded);
