import React from 'react';

const Dashboard = () => {
  return (
    <div>
      <DataGrid
        rows={data}
        columns={cols}
        pageSize={10}
        rowsPerPage={[5, 10, 25]}
        checkboxSelection
        disableSelectionOnClick
        autoHeight
        sortModel={sortModel}
        filterModel={filterModel}
        onSortModelChange={handleSort}
      />
    </div>
  );
};

export default Dashboard;
