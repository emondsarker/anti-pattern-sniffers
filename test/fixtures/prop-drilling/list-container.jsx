import React from 'react';

// List container — maps over folders and renders a TreeNode for each.
// Passing shared props to each item is inherent to the list pattern.
const TreeView = ({
  folders,
  isLoading,
  expandedFolders,
  selectedSources,
  searchTerm,
  disabledIds,
  canSelect,
}) => {
  if (isLoading) return <div>Loading...</div>;
  if (folders.length === 0) return <div>No sources found</div>;

  return (
    <div>
      {folders.map((folder) => (
        <TreeNode
          key={folder.id}
          item={folder}
          isExpanded={expandedFolders.has(folder.id)}
          selectedSources={selectedSources}
          searchTerm={searchTerm}
          disabledIds={disabledIds}
          canSelect={canSelect}
        />
      ))}
    </div>
  );
};

export { TreeView };
