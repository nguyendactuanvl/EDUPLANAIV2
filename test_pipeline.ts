import { cleanQuestionStem } from './src/lib/utils';
import { unflattenMarkdownTables, convertBbtTableToSvg } from './src/lib/bbtRenderer';
import fs from 'fs';

const rawContent = `Cho hàm số $y = f(x)$ có bảng biến thiên như sau:

| $x$ | $-\\infty$ | | $-1$ | | $2$ | | $+\\infty$ |
|---|---|---|---|---|---|---|---|
| $y'$ | | $+$ | $0$ | $-$ | $\\|$ | $-$ | |
| $y$ | $3$ | $\\nearrow$ | $5$ | $\\searrow$ | $-\\infty$ | $\\|$ | $+\\infty$ | $\\searrow$ | $1$ |

Tổng số đường tiệm cận đứng và tiệm cận ngang của đồ thị hàm số đã cho là:`;

const options = ['4 .', '3 .', '2 .', '1 .'];

console.log('1. Raw content:');
console.log(rawContent);

const cleaned = cleanQuestionStem(rawContent, options);
console.log('\n2. After cleanQuestionStem:');
console.log(cleaned);

// Now let's trace MarkdownRenderer logic on cleaned:
let processedContent = unflattenMarkdownTables(cleaned || '');
console.log('\n3. After unflattenMarkdownTables:');
console.log(processedContent);

console.log('\n4. Testing convertBbtTableToSvg directly on table:');
const tableMatch = processedContent.match(/((?:^[ \t]*\|[^\n]+\|[ \t]*(?:\n|$))+)/m);
console.log('tableMatch found?', !!tableMatch);
if (tableMatch) {
  console.log('tableMatch[0]:', tableMatch[0]);
  try {
    const svg = convertBbtTableToSvg(tableMatch[0]);
    console.log('convertBbtTableToSvg result:', svg ? 'OK' : 'NULL');
  } catch (e) {
    console.log('convertBbtTableToSvg error:', e);
  }
}
