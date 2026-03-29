import React from 'react';

// SVG positioning component — x/y/width/height are independent SVG values
// used in separate arithmetic calculations. Cannot be grouped.
const GanttTaskBar = ({
  task,
  x,
  width,
  y,
  height,
  columnWidth,
  onClick,
  isClipped,
  isClippedStart,
  isClippedEnd,
}) => {
  return (
    <g onClick={() => onClick?.(task)}>
      <rect x={x} y={y} width={width} height={height} rx={4} />
      <text x={x + width / 2} y={y + height / 2}>
        {task.name}
      </text>
      {isClipped && isClippedStart && <polygon points={`${x},${y + height / 2}`} />}
      {isClipped && isClippedEnd && <polygon points={`${x + width},${y + height / 2}`} />}
    </g>
  );
};

export default GanttTaskBar;
