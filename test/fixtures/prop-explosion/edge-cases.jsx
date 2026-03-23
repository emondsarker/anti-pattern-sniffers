import React from 'react';

// Arrow function with default values — should trigger (8 props)
const WithDefaults = ({ a = 1, b = 'hello', c = true, d = null, e = [], f = {}, g = () => {}, h }) => {
  return <div>{a}{b}{String(c)}{d}{e}{JSON.stringify(f)}{h}</div>;
};

// React.memo wrapped — should trigger (8 props)
const MemoComponent = React.memo(({ name, age, email, phone, avatar, role, department, isAdmin }) => {
  return <div>{name} {age} {email}</div>;
});

// React.forwardRef — should trigger (8 props)
const ForwardRefComponent = React.forwardRef(({ title, subtitle, icon, color, size, variant, disabled, loading }, ref) => {
  return <div ref={ref}>{title}</div>;
});

// Non-component function (lowercase) — should NOT trigger
function processData({ a, b, c, d, e, f, g, h, i, j }) {
  return a + b + c + d + e + f + g + h + i + j;
}

// Component with rest params — should count named props only (7 named)
const WithRest = ({ p1, p2, p3, p4, p5, p6, p7, ...rest }) => {
  return <div {...rest}>{p1}</div>;
};

export { WithDefaults, MemoComponent, ForwardRefComponent, processData, WithRest };
