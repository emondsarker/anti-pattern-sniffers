import React from 'react';

const Wrapper = ({ theme, locale, userId, permissions, notifications, children }) => {
  // Only uses children — theme, locale, userId, permissions, notifications are just passed through
  return (
    <div className="wrapper">
      <Header theme={theme} locale={locale} userId={userId} permissions={permissions} notifications={notifications} />
      {children}
    </div>
  );
};

const Header = ({ theme, locale, userId, permissions, notifications }) => {
  // Does NOT use any of these props directly, just passes them
  return (
    <nav>
      <UserMenu theme={theme} locale={locale} userId={userId} permissions={permissions} notifications={notifications} />
    </nav>
  );
};

const UserMenu = ({ theme, locale, userId, permissions, notifications }) => {
  // Actually uses the props
  return (
    <div style={{ background: theme.primary }}>
      <span>{locale.greeting}</span>
      <span>User: {userId}</span>
      <span>{permissions.join(', ')}</span>
      <span>{notifications.length} notifications</span>
    </div>
  );
};

export { Wrapper, Header, UserMenu };
