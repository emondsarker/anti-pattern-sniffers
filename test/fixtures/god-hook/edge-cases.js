import { useState, useEffect } from 'react';

// Commented out hooks should NOT be counted
function useWithComments() {
  const [a, setA] = useState(null);
  // const [b, setB] = useState(null);
  // const [c, setC] = useState(null);
  // const [d, setD] = useState(null);
  // const [e, setE] = useState(null);
  /* useEffect(() => {}, []); */
  /* useEffect(() => {}, []); */
  /* useEffect(() => {}, []); */
  /* useEffect(() => {}, []); */
  return { a };
}

// Hooks in strings should NOT be counted
function useStringRefs() {
  const [val, setVal] = useState(null);
  const description = "This hook uses useState and useEffect for many things";
  const template = `We call useState(${val}) and useEffect multiple times: useState useState useState useState`;
  return { val, description, template };
}

// NOT a hook (doesn't start with "use" followed by uppercase)
function useful() {
  const [a, setA] = useState(1);
  const [b, setB] = useState(2);
  const [c, setC] = useState(3);
  const [d, setD] = useState(4);
  const [e, setE] = useState(5);
  return { a, b, c, d, e };
}

export { useWithComments, useStringRefs, useful };
