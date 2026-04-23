export function renderLineDiff(
  previousContent: string,
  nextContent: string,
  previousLabel = "current",
  nextLabel = "next"
): string {
  const previousLines = previousContent.split("\n");
  const nextLines = nextContent.split("\n");
  const table = buildLcsTable(previousLines, nextLines);

  return [
    `--- ${previousLabel}`,
    `+++ ${nextLabel}`,
    ...renderDiffRows(previousLines, nextLines, table)
  ].join("\n");
}

function buildLcsTable(left: string[], right: string[]): number[][] {
  const table: number[][] = Array.from({ length: left.length + 1 }, () =>
    Array<number>(right.length + 1).fill(0)
  );

  for (let leftIndex = left.length - 1; leftIndex >= 0; leftIndex -= 1) {
    for (let rightIndex = right.length - 1; rightIndex >= 0; rightIndex -= 1) {
      if (left[leftIndex] === right[rightIndex]) {
        table[leftIndex]![rightIndex] = (table[leftIndex + 1]![rightIndex + 1] ?? 0) + 1;
      } else {
        table[leftIndex]![rightIndex] = Math.max(
          table[leftIndex + 1]![rightIndex] ?? 0,
          table[leftIndex]![rightIndex + 1] ?? 0
        );
      }
    }
  }

  return table;
}

function renderDiffRows(left: string[], right: string[], table: number[][]): string[] {
  const rows: string[] = [];
  let leftIndex = 0;
  let rightIndex = 0;

  while (leftIndex < left.length && rightIndex < right.length) {
    if (left[leftIndex] === right[rightIndex]) {
      rows.push(` ${left[leftIndex]}`);
      leftIndex += 1;
      rightIndex += 1;
      continue;
    }

    const skipLeft = table[leftIndex + 1]?.[rightIndex] ?? 0;
    const skipRight = table[leftIndex]?.[rightIndex + 1] ?? 0;

    if (skipLeft >= skipRight) {
      rows.push(`-${left[leftIndex]}`);
      leftIndex += 1;
    } else {
      rows.push(`+${right[rightIndex]}`);
      rightIndex += 1;
    }
  }

  while (leftIndex < left.length) {
    rows.push(`-${left[leftIndex]}`);
    leftIndex += 1;
  }

  while (rightIndex < right.length) {
    rows.push(`+${right[rightIndex]}`);
    rightIndex += 1;
  }

  return rows;
}
