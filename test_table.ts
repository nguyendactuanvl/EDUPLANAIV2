import { convertBbtTableToSvg, parseMarkdownBbtTable, generateBbtSvg } from './src/lib/bbtRenderer';

// In the screenshot:
// | $x$ | $-\infty$ | | $-1$ | | $2$ | | $+\infty$ |
// |---|---|---|---|---|---|---|---|
// | $y'$ | | $+$ | $0$ | $-$ | $\|$ | $-$ | |
// | $y$ | $3$ | $\nearrow$ | $5$ | $\searrow$ | $-\infty$ | $\|$ | $+\infty$ | $\searrow$ | $1$ |

// Note: In markdown, \|| or \| in LaTeX:
const table1 = `| $x$ | $-\\infty$ | | $-1$ | | $2$ | | $+\\infty$ |
|---|---|---|---|---|---|---|---|
| $y'$ | | $+$ | $0$ | $-$ | $\\|$ | $-$ | |
| $y$ | $3$ | $\\nearrow$ | $5$ | $\\searrow$ | $-\\infty$ | $\\|$ | $+\\infty$ | $\\searrow$ | $1$ |`;

console.log('--- table1 ---');
console.log(table1);
const parsed1 = parseMarkdownBbtTable(table1);
console.log('parsed1:', JSON.stringify(parsed1, null, 2));
console.log('svg1:', convertBbtTableToSvg(table1) ? 'OK' : 'NULL');

// What if the table in Markdown has double bar like || or $\|$:
const table2 = `| $x$ | $-\\infty$ | | $-1$ | | $2$ | | $+\\infty$ |
|---|---|---|---|---|---|---|---|
| $y'$ | | $+$ | $0$ | $-$ | || | $-$ | |
| $y$ | $3$ | $\\nearrow$ | $5$ | $\\searrow$ | $-\\infty$ | || | $+\\infty$ | $\\searrow$ | $1$ |`;
console.log('svg2:', convertBbtTableToSvg(table2) ? 'OK' : 'NULL');
