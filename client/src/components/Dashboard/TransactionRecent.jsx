import { DataGrid } from "@mui/x-data-grid";
import Paper from "@mui/material/Paper";
import { useEffect, useState } from "react";

const columns = [
  { field: "id", headerName: "ID", flex: 1 },
  { field: "type", headerName: "Transaction Type", flex: 2 },
  { field: "amount", headerName: "Transaction Amount", flex: 2 },
  {
    field: "status",
    headerName: "Status",
    flex: 1,
    align: "right",
    headerAlign: "right",
  },
  {
    field: "createdAt",
    headerName: "Date",
    flex: 2,
    align: "right",
    sortable: false,
    headerAlign: "right",
    valueFormatter: (params) => {
      const date = new Date(params);
      return date.toLocaleDateString();
    },
  },
];

const TransactionRecent = () => {
  const [data, setData] = useState([]);

  useEffect(() => {
    const eventSource = new EventSource(import.meta.env.VITE_EVENT_URL);

    eventSource.onmessage = (event) => {
      const newData = JSON.parse(event.data);
      setData((prevData) => [...prevData, newData]);
    };

    eventSource.onerror = (error) => {
      console.error("Error receiving SSE data:", error);
    };

    return () => {
      eventSource.close();
    };
  }, []);

  console.log("Received data:", data);

  return (
    <div className="flex flex-col gap-2 flex-1">
      <Paper
        sx={{ backgroundColor: "#f5f5f5", width: "100%", padding: "10px" }}
      >
        <h2>Transaction Recent</h2>
      </Paper>
      <Paper
        sx={{ backgroundColor: "#f5f5f5", width: "100%", padding: "10px" }}
      >
        <DataGrid
          rows={data}
          columns={columns}
          pagination
          pageSize={5}
          // onPageChange={(newPage) => setPage(newPage + 1)}
          initialState={{
            pagination: { paginationModel: { page: 0, pageSize: 5 } },
          }}
          pageSizeOptions={[3, 5]}
          sx={{ border: 0 }}
          autoHeight
        />
      </Paper>
    </div>
  );
};

export default TransactionRecent;
