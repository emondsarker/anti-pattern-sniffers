import React from 'react';
import ReactMarkdown from 'react-markdown';

// Render slot injection — props passed into component override callbacks.
// ReactMarkdown controls instantiation; parent must inject context data.
const CustomReactMarkdown = ({
  content,
  style,
  annotations,
  files,
  chatMessageSources,
  hideScore,
  searchTerm,
}) => {
  const processedContent = content;

  return (
    <ReactMarkdown
      className={style}
      components={{
        a: (props) => (
          <CustomLink
            {...props}
            annotations={annotations}
            files={files}
            chatMessageSources={chatMessageSources}
            hideScore={hideScore}
          />
        ),
      }}
    >
      {processedContent}
    </ReactMarkdown>
  );
};

export default CustomReactMarkdown;
