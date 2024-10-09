const mongoose = require('mongoose');

// Define the Transaction schema
const transactionSchema = new mongoose.Schema({
    title: {
        type: String,
        required: true,
    },
    description: {
        type: String,
        required: true,
    },
    price: {
        type: Number,
        required: true,
    },
    dateOfSale: {
        type: Date,
        required: true,
    },
    sold: {
        type: Boolean,
        required: true,
    },
    category: {
        type: String,
        required: true,
    },
});

// Create the Transaction model, ensuring it is only defined once
const Transaction = mongoose.models.Transaction || mongoose.model('Transaction', transactionSchema);

module.exports = Transaction;
