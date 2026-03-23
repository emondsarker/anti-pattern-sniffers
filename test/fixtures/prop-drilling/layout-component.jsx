import React from 'react';

const PageLayout = ({ className, style, children, id }) => {
  return (
    <div className={className} style={style} id={id}>
      <Sidebar className={className} style={style}>
        {children}
      </Sidebar>
    </div>
  );
};

const Sidebar = ({ className, style, children }) => {
  return (
    <aside className={className} style={style}>
      {children}
    </aside>
  );
};

export { PageLayout, Sidebar };
