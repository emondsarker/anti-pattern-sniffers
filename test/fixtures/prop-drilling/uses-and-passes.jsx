import React from 'react';

const Container = ({ theme, data, onAction, title }) => {
  // Uses theme and title locally, passes data and onAction
  const style = { background: theme.bg, color: theme.fg };
  return (
    <div style={style}>
      <h1>{title}</h1>
      <Content data={data} onAction={onAction} />
    </div>
  );
};

const Content = ({ data, onAction }) => {
  return (
    <div>
      {data.map(item => (
        <button key={item.id} onClick={() => onAction(item)}>
          {item.name}
        </button>
      ))}
    </div>
  );
};

export { Container, Content };
