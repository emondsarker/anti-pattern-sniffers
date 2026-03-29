import React from 'react';

// Tree node component — inherently needs: data + level + expand/collapse + selection + actions.
// These are all independent concerns that cannot be meaningfully grouped.
const TreeNode = ({
  item,
  level,
  isExpanded,
  onToggle,
  selectedSources,
  onAddSource,
  onRemoveSource,
  expandedFolders,
  searchTerm,
  disabledIds,
  canSelect,
}) => {
  return (
    <div style={{ paddingLeft: level * 16 }}>
      <span onClick={() => onToggle(item.id)}>
        {isExpanded ? '▼' : '▶'} {item.name}
      </span>
      {canSelect && !disabledIds?.has(item.id) && (
        <button onClick={() => onAddSource(item)}>Select</button>
      )}
      {isExpanded && item.children?.map((child) => (
        <TreeNode
          key={child.id}
          item={child}
          level={level + 1}
          isExpanded={expandedFolders.has(child.id)}
          onToggle={onToggle}
          selectedSources={selectedSources}
          onAddSource={onAddSource}
          onRemoveSource={onRemoveSource}
          expandedFolders={expandedFolders}
          searchTerm={searchTerm}
          disabledIds={disabledIds}
          canSelect={canSelect}
        />
      ))}
    </div>
  );
};

export default TreeNode;
