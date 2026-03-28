import React from 'react';

// True negative: Adapter that mixes pass-through with local usage
const FormField = ({ label, value, onChange, error }) => {
  const id = Math.random().toString(36);
  return (
    <div className="field">
      <label htmlFor={id}>{label}</label>
      <Input id={id} value={value} onChange={onChange} />
      {error && <span className="error">{error}</span>}
    </div>
  );
};

export { FormField };
