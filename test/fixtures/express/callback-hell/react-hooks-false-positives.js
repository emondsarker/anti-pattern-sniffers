// Pattern A: useEffect with async init + try/catch
useEffect(() => {
  const initializeContent = async () => {
    if (initialMarkdown && initialMarkdown.trim()) {
      try {
        const blocks = await editor.tryParseMarkdownToBlocks(initialMarkdown);
        editor.replaceBlocks(editor.document, blocks);
      } catch (error) {
        console.error('Failed to parse initial markdown:', error);
      }
    }
  };
  initializeContent();
}, [editor, initialMarkdown]);

// Pattern C: IIFE inside useEffect (third-party script injection)
useEffect(() => {
  (function (e, t, n) {
    function a() {
      const s = t.getElementsByTagName('script')[0],
        r = t.createElement('script');
      r.type = 'text/javascript';
      r.async = true;
      r.src = n;
      s.parentNode.insertBefore(r, s);
    }
    if (t.readyState === 'complete') {
      a();
    } else {
      e.addEventListener('load', a);
    }
  })(window, document, 'https://beacon-v2.helpscout.net');
}, []);

// Pattern D: State updater with forEach
setExpandedTopics((prev) => {
  const newExpanded = [...prev];
  streamingTopicIds.forEach((id) => {
    if (!newExpanded.includes(id)) {
      newExpanded.push(id);
    }
  });
  return newExpanded;
});

// Pattern E: useEffect cleanup
useEffect(
  () => () => {
    clearTransitionTimers();
  },
  [clearTransitionTimers]
);

// Pattern H: useCallback with array method
const showToast = useCallback(
  (toast) => {
    const isDuplicate = state.toasts.some(
      (t) =>
        t.open &&
        getTextContent(t.title) === getTextContent(toast.title) &&
        getTextContent(t.description) === getTextContent(toast.description)
    );
    if (isDuplicate) return;
    const id = genId();
    dispatch({ type: 'ADD_TOAST', toast: { ...toast, id } });
  },
  [state.toasts, getTextContent]
);
