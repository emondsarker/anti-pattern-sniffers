import React from 'react';

// True positive: 6 non-handler data props passed through without local usage.
const ComplianceContent = ({ requirements, framework, evaluationMap, evaluatingCategory, evaluatingIds, expandedRowIds }) => {
  return (
    <StageTabsView
      requirements={requirements}
      framework={framework}
      evaluationMap={evaluationMap}
      evaluatingCategory={evaluatingCategory}
      evaluatingIds={evaluatingIds}
      expandedRowIds={expandedRowIds}
    />
  );
};

export { ComplianceContent };
