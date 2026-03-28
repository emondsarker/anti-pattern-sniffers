import React from 'react';

// True negative: Dialog wrapper forwarding only 2 props (below minPassThroughProps threshold)
const DialogWrapper = ({ open, onOpenChange, title }) => {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <h2>{title}</h2>
      </DialogContent>
    </Dialog>
  );
};

export { DialogWrapper };
