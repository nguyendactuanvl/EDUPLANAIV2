import fs from 'fs';
import { fixMath, polishMathText, sanitizeExamQuestion, sanitizeLatexString } from './src/lib/utils';

const rawCRLF = `PHÂ\`N II: CÂU HỎI TRĂ´C NGHIỆM

Câu 1. Cho hàm số´ $y = f(x)$ có bảng biê´n thiên như sau:

| $x$ | $-\\infty$ | | $-1$ | | $2$ | | $+\\infty$ |
|---|---|---|---|---|---|---|---|
| $y'$ | | $+$ | $0$ | $-$ | $\\|$ | $-$ | |
| $y$ | $3$ | $\\nearrow$ | $5$ | $\\searrow$ | $-\\infty$ | $\\|$ | $+\\infty$ | $\\searrow$ | $1$ |

Tổng số´ đường tiệm cận đứng và tiệm cận ngang của đồ\` thị hàm số´ đã cho là:`.replace(/\n/g, '\r\n');

let content = rawCRLF;
content = sanitizeLatexString(content);
content = sanitizeExamQuestion(content);
content = polishMathText(content);
content = fixMath(content);

console.log('--- OUTPUT AFTER PIPELINE ---');
console.log(content);
