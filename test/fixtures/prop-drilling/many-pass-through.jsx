import React from 'react';

// True positive: God component intermediary with 6 pass-through props
const SettingsPanel = ({ theme, locale, userId, permissions, notifications, onSave }) => {
  return (
    <SettingsForm
      theme={theme}
      locale={locale}
      userId={userId}
      permissions={permissions}
      notifications={notifications}
      onSave={onSave}
    />
  );
};

// True negative: Only 2 pass-through props (below default threshold of 3)
const SmallWrapper = ({ data, onAction }) => {
  return <Content data={data} onAction={onAction} />;
};

export { SettingsPanel, SmallWrapper };
