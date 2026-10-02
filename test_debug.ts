import { convertBbtTableToSvg } from './src/lib/bbtRenderer';
import { fixMath, cleanVietnameseUnicode } from './src/lib/utils';

// Exact text from user:
const raw = `PHÂ\`N II: CÂU HỎI TRĂ´C NGHIỆM

Câu 1. Cho hàm số´ $y = f(x)$ có bảng biê´n thiên như sau:

| $x$ | $-\\infty$ | | $-1$ | | $2$ | | $+\\infty$ |
|---|---|---|---|---|---|---|---|
| $y'$ | | $+$ | $0$ | $-$ | $\\|$ | $-$ | |
| $y$ | $3$ | $\\nearrow$ | $5$ | $\\searrow$ | $-\\infty$ | $\\|$ | $+\\infty$ | $\\searrow$ | $1$ |

Tổng số´ đường tiệm cận đứng và tiệm cận ngang của đồ\` thị hàm số´ đã cho là:`;

console.log('--- TEST 1: Regex in MarkdownRenderer line 265 ---');
const regexOld = /((?:^[ \t]*\|[^\n]+\|[ \t]*(?:\n|$))+)/gm;
let m;
while ((m = regexOld.exec(raw)) !== null) {
  console.log('Found match len:', m[0].split('\n').length);
  console.log('Match content:\n', m[0]);
  console.log('convertBbtTableToSvg result:', convertBbtTableToSvg(m[0]) ? 'SUCCESS' : 'FAIL');
}

console.log('\n--- TEST 2: What if raw has \\r\\n? ---');
const rawCRLF = raw.replace(/\n/g, '\r\n');
while ((m = regexOld.exec(rawCRLF)) !== null) {
  console.log('CRLF match len:', m[0].split(/\r?\n/).length);
  console.log('convertBbtTableToSvg result:', convertBbtTableToSvg(m[0]) ? 'SUCCESS' : 'FAIL');
}
