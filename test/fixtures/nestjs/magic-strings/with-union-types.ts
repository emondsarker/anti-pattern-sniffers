type ViewMode = 'day' | 'week' | 'month';
type TaskStatus = 'todo' | 'in_progress' | 'done';

function getLabel(mode: ViewMode): string {
  switch (mode) {
    case 'day': return 'Daily View';
    case 'week': return 'Weekly View';
    case 'month': return 'Monthly View';
  }
}

function process(status: TaskStatus) {
  if (status === 'todo') { startTask(); }
  if (status === 'in_progress') { continueTask(); }
  if (status === 'done') { archiveTask(); }
  if (status === 'todo') { notifyOwner(); }
}
