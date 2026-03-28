// This file has strings used in both case labels and === comparisons.
// Because they appear as case labels, they are discriminated values and
// should NOT be flagged as magic strings.

function getIcon(blockType: string) {
  switch (blockType) {
    case 'heading': return 'H1';
    case 'subheading': return 'H2';
    case 'content': return 'paragraph';
  }
}

function getClassName(blockType: string) {
  if (blockType === 'heading') return 'text-xl font-bold';
  if (blockType === 'heading') return 'mt-4';
  if (blockType === 'subheading') return 'text-lg font-semibold';
  if (blockType === 'subheading') return 'mt-2';
  if (blockType === 'content') return 'text-base';
  if (blockType === 'content') return 'mt-1';
  return '';
}
