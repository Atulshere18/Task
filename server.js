const express = require('express');
const transactionRoutes = require('./routes/transactionRoutes'); // Import your transaction routes
const mongoose = require('mongoose');
const bodyParser = require('body-parser');
const cors = require('cors');

const app = express();
app.use(bodyParser.json());
app.use(cors());
app.use('/api', transactionRoutes);
// MongoDB Connection
mongoose.connect('mongodb://localhost:27017/transactions')
    .then(() => console.log("MongoDB Connected"))
    .catch(err => console.log(err));

// Use transaction routes as middleware
 // Ensure you're using the router correctly

// Start server
app.listen(5000, () => {
    console.log("Server running on port 5000");
});
