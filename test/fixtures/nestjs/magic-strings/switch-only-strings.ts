function handleEvent(event: any) {
  switch (event.type) {
    case 'click': handleClick(event); break;
    case 'hover': handleHover(event); break;
    case 'click': logClick(event); break;
    case 'hover': logHover(event); break;
    case 'click': trackClick(event); break;
  }
}

function getIcon(status: string) {
  switch (status) {
    case 'waiting': return 'clock';
    case 'extracting': return 'loader';
    case 'complete': return 'check';
    case 'waiting': return 'clock-alt';
    case 'extracting': return 'loader-alt';
    case 'complete': return 'check-alt';
    case 'waiting': return 'clock-sm';
  }
}
