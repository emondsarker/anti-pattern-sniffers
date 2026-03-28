import React from 'react';

// Layout composition — distributes DIFFERENT prop subsets to different children.
// This is proper separation of concerns, NOT prop drilling.
const CategoryCard = ({
  stageNum,
  category,
  onAddRequirement,
  onEditRequirement,
  onDeleteRequirement,
  onEvaluateWithAI,
  isEvaluating,
  evaluationMap,
}) => {
  const requirements = category.requirements;

  return (
    <div>
      <CategoryCardHeader
        stageNum={stageNum}
        category={category}
        onAddRequirement={onAddRequirement}
        onEvaluateWithAI={onEvaluateWithAI}
        isEvaluating={isEvaluating}
        evaluationMap={evaluationMap}
      />
      <RequirementCardList
        requirements={requirements}
        onEditRequirement={onEditRequirement}
        onDeleteRequirement={onDeleteRequirement}
        evaluationMap={evaluationMap}
      />
    </div>
  );
};

// Radix UI composition — distributes props across multiple primitives.
const SourceSelectorPopover = ({
  open,
  defaultOpen,
  align,
  side,
  sideOffset,
  alignOffset,
  selectedSources,
  title,
  placeholder,
  maxHeight,
  folderTypes,
}) => (
  <Popover.Root open={open} defaultOpen={defaultOpen}>
    <Popover.Trigger>Open</Popover.Trigger>
    <Popover.Content side={side} align={align} sideOffset={sideOffset} alignOffset={alignOffset}>
      <SourceSelectorContent
        selectedSources={selectedSources}
        title={title}
        placeholder={placeholder}
        maxHeight={maxHeight}
        folderTypes={folderTypes}
      />
    </Popover.Content>
  </Popover.Root>
);

export { CategoryCard, SourceSelectorPopover };
