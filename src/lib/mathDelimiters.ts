const FENCE_PATTERN = /^\s{0,3}(?:`{3,}|~{3,})/;

const DISPLAY = '\n$$\n';

function replaceDelimiters(segment: string): string {
  return segment
    .replace(/(?<!\\)\$\$/g, () => DISPLAY)
    .replace(/(?<!\\)\\\[/g, () => DISPLAY)
    .replace(/(?<!\\)\\\]/g, () => DISPLAY)
    .replace(/(?<!\\)\\\(/g, () => '$')
    .replace(/(?<!\\)\\\)/g, () => '$');
}

function transformOutsideInlineCode(line: string): string {
  let result = '';
  let index = 0;
  const pattern = /(`+)[\s\S]*?\1/g;
  let match = pattern.exec(line);
  while (match !== null) {
    result += replaceDelimiters(line.slice(index, match.index));
    result += match[0];
    index = match.index + match[0].length;
    match = pattern.exec(line);
  }
  result += replaceDelimiters(line.slice(index));
  return result;
}

export function normalizeMathDelimiters(markdown: string): string {
  const lines = markdown.split('\n');
  let inFence = false;
  return lines
    .map((line) => {
      if (FENCE_PATTERN.test(line)) {
        inFence = !inFence;
        return line;
      }
      if (inFence) {
        return line;
      }
      return transformOutsideInlineCode(line);
    })
    .join('\n');
}
