import React from 'react';

const EnhancedInput = ({ label, error, helperText, isRequired, validation, onChange, onBlur, onFocus, ...inputProps }) => {
  return (
    <div>
      <label>{label}{isRequired && '*'}</label>
      <input {...inputProps} onChange={onChange} onBlur={onBlur} onFocus={onFocus} />
      {error && <span>{error}</span>}
      {helperText && <p>{helperText}</p>}
    </div>
  );
};

export default EnhancedInput;
