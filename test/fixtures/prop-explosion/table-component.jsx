import React from 'react';

const DataTable = ({ columns, rows, sortBy, sortOrder, onSort, pageSize, currentPage, onPageChange, selectedRows }) => {
  return <table><tbody>{rows.map(r => <tr key={r.id}><td>{r.name}</td></tr>)}</tbody></table>;
};

export default DataTable;
