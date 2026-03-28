import React from 'react';

// True negative: all pass-through props are event handlers (on[A-Z] pattern)
// which are auto-whitelisted. Only 2 non-handler data props passed through.
const EventList = ({ items, label, onEdit, onDelete, onToggle, onSelect, onRemove }) => {
  return (
    <div>
      <ListRenderer
        items={items}
        label={label}
        onEdit={onEdit}
        onDelete={onDelete}
        onToggle={onToggle}
        onSelect={onSelect}
        onRemove={onRemove}
      />
    </div>
  );
};

export { EventList };
