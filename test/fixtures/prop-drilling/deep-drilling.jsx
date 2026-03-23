import React from 'react';

const Wrapper = ({ theme, locale, userId, children }) => {
  // Only uses children — theme, locale, userId are just passed through
  return (
    <div className="wrapper">
      <Header theme={theme} locale={locale} userId={userId} />
      {children}
    </div>
  );
};

const Header = ({ theme, locale, userId }) => {
  // Does NOT use any of these props directly, just passes them
  return (
    <nav>
      <UserMenu theme={theme} locale={locale} userId={userId} />
    </nav>
  );
};

const UserMenu = ({ theme, locale, userId }) => {
  // Actually uses the props
  return (
    <div style={{ background: theme.primary }}>
      <span>{locale.greeting}</span>
      <span>User: {userId}</span>
    </div>
  );
};

export { Wrapper, Header, UserMenu };
