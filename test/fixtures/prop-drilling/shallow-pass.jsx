import React from 'react';

const Card = ({ title, content }) => {
  // Uses title directly, passes content to child — only 1 level, not drilling
  return (
    <div>
      <h2>{title}</h2>
      <CardBody content={content} />
    </div>
  );
};

const CardBody = ({ content }) => {
  return <p>{content}</p>;
};

export { Card, CardBody };
