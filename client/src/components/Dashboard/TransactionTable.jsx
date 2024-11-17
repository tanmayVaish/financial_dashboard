import * as React from "react";
import { DataGrid } from "@mui/x-data-grid";
import Paper from "@mui/material/Paper";
import InputLabel from "@mui/material/InputLabel";
import TextField from "@mui/material/TextField";
import MenuItem from "@mui/material/MenuItem";
import Button from "@mui/material/Button";
import Select from "@mui/material/Select";
import { useNavigate } from "react-router-dom";
import axios from "axios";

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

const DataTable = () => {
  const [page, setPage] = React.useState(1);
  const [limit, setLimit] = React.useState(10);
  const [type, setType] = React.useState("");
  const [status, setStatus] = React.useState("");
  const [startDate, setStartDate] = React.useState("");
  const [endDate, setEndDate] = React.useState("");
  const [id, setId] = React.useState("");

  const navigate = useNavigate();

  const [transactions, setTransactions] = React.useState([]);

  React.useEffect(() => {
    fetchTransactions();
  }, [page, limit, type, status, startDate, endDate, id]);

  const fetchTransactions = async () => {
    try {
      const response = await axios.get(
        `${import.meta.env.VITE_API_URL}/transactions`,
        {
          params: {
            page,
            limit,
            type,
            status,
            startDate,
            endDate,
            id,
          },
          headers: {
            Authorization: `Bearer ${localStorage.getItem("authToken")}`,
          },
        }
      );

      setTransactions(response.data);
    } catch (error) {
      if (error.response.status === 401) {
        localStorage.removeItem("authToken");
        navigate("/signin");
        return;
      }

      console.error("Error fetching transactions:", error);
    }
  };

  const handleStartDateChange = (event) => {
    setStartDate(event.target.value);
  };

  const handleEndDateChange = (event) => {
    setEndDate(event.target.value);
  };

  const handleTypeChange = (event) => {
    setType(event.target.value);
  };

  const handleStatusChange = (event) => {
    setStatus(event.target.value);
  };

  return (
    <div className="flex flex-col gap-2">
      <Paper
        sx={{ backgroundColor: "#f5f5f5", width: "100%", padding: "10px" }}
      >
        <h2>Transaction Table</h2>
      </Paper>
      <div className="flex flex-col gap-2">
        <Paper
          sx={{ backgroundColor: "#f5f5f5", width: "100%" }}
          className="flex items-center flex-wrap justify-end gap-5 p-4"
        >
          <div className="flex flex-1 gap-2 items-center justify-between pr-10 border-r-2">
            <TextField
              onChange={(e) => setId(e.target.value)}
              fullWidth
              id="id"
              placeholder="Search By ID..."
            />
            {/* Will add it later */}
            {/* <Button variant="contained" color="secondary">
              Search
            </Button> */}
          </div>

          <div className="flex gap-2 items-center justify-center pr-10 border-r-2">
            <InputLabel htmlFor="start-date">Start Date</InputLabel>
            <TextField
              id="start-date"
              type="date"
              InputLabelProps={{ shrink: true }}
              onChange={handleStartDateChange}
            />
          </div>
          <div className="flex gap-2 items-center justify-center pr-10 border-r-2">
            <InputLabel htmlFor="end-date">End Date</InputLabel>
            <TextField
              id="end-date"
              type="date"
              InputLabelProps={{ shrink: true }}
              onChange={handleEndDateChange}
            />
          </div>
          <div className="flex gap-2 items-center justify-center pr-10 border-r-2">
            <Select
              defaultValue={""}
              label="Transaction Type"
              onChange={handleTypeChange}
            >
              <MenuItem value="credit">Credit</MenuItem>
              <MenuItem value="debit">Debit</MenuItem>
              <MenuItem value="">None</MenuItem>
            </Select>
          </div>
          <div className="flex gap-2 items-center justify-center ">
            <Select
              defaultValue=""
              label="Status"
              onChange={handleStatusChange}
            >
              <MenuItem value="successful">Successful</MenuItem>
              <MenuItem value="pending">Pending</MenuItem>
              <MenuItem value="failed">Failed</MenuItem>
              <MenuItem value="">None</MenuItem>
            </Select>
          </div>
        </Paper>
        <Paper
          sx={{ backgroundColor: "#f5f5f5", width: "100%", padding: "10px" }}
        >
          <DataGrid
            rows={transactions}
            columns={columns}
            pagination
            pageSize={limit}
            onPageChange={(newPage) => setPage(newPage + 1)}
            initialState={{
              pagination: { paginationModel: { page: 0, pageSize: 5 } },
            }}
            pageSizeOptions={[5, 10]}
            sx={{ border: 0 }}
            autoHeight
          />
        </Paper>
      </div>
    </div>
  );
};

export default DataTable;
