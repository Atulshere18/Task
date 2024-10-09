
const express = require('express');
const router = express.Router();
const Transaction = require('../models/Transaction');
const axios = require('axios');

// API to initialize the database with seed data
router.get('/init', async (req, res) => {
    try {
        const response = await axios.get('https://s3.amazonaws.com/roxiler.com/product_transaction.json');
        let transactions = response.data;

        // Convert `dateOfSale` strings to Date objects
        transactions = transactions.map(transaction => ({
            ...transaction,
            dateOfSale: new Date(transaction.dateOfSale)  // Ensure this is a Date object
        }));

        await Transaction.deleteMany({});  // Clear existing data
        await Transaction.insertMany(transactions);  // Insert new data

        console.log(`Initialized database with ${transactions.length} records.`);
        res.send("Database initialized with seed data");
    } catch (error) {
        console.error('Error initializing database:', error);
        res.status(500).send('Failed to initialize database');
    }
});




// API to list transactions with search and pagination
router.get('/transactions', async (req, res) => {
    const { search = '', page = 1, perPage = 10, month } = req.query;

    if (!month) {
        return res.status(400).json({ error: "Month is required" });
    }

    const year = new Date().getFullYear(); 
    const startDate = new Date(year, month - 1, 1); 
    const endDate = new Date(year, month, 0, 23, 59, 59, 999); 

    const query = {
        dateOfSale: { $gte: startDate, $lte: endDate },
    };

    if (search) {
        query.$or = [
            { title: { $regex: search, $options: 'i' } },
            { description: { $regex: search, $options: 'i' } },
            { price: { $regex: search, $options: 'i' } },
        ];
    }

    try {
        const transactions = await Transaction.find(query)
            .skip((page - 1) * perPage)
            .limit(Number(perPage));
        const count = await Transaction.countDocuments(query);

        res.json({ transactions, count });
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: "Failed to fetch transactions" });
    }
});

// API for statistics
router.get('/statistics', async (req, res) => {
    const { month, year } = req.query;

    if (!month || !year) {
        return res.status(400).json({ error: "Month and year are required" });
    }

    const startDate = new Date(year, month - 1, 1);
    const endDate = new Date(year, month, 0, 23, 59, 59, 999);

    console.log('Start Date:', startDate);
    console.log('End Date:', endDate);

    try {
        const soldItems = await Transaction.countDocuments({
            sold: true,
            dateOfSale: { $gte: startDate, $lte: endDate }
        });
        const notSoldItems = await Transaction.countDocuments({
            sold: false,
            dateOfSale: { $gte: startDate, $lte: endDate }
        });

        const totalSaleAmount = await Transaction.aggregate([
            { $match: { sold: true, dateOfSale: { $gte: startDate, $lte: endDate } } },
            { $group: { _id: null, total: { $sum: '$price' } } }
        ]);

        console.log('Total Sale Amount:', totalSaleAmount);
        console.log('Sold Items:', soldItems);
        console.log('Not Sold Items:', notSoldItems);

        res.json({
            totalSaleAmount: totalSaleAmount[0]?.total || 0,
            soldItems,
            notSoldItems,
        });
    } catch (error) {
        console.error('Error fetching statistics:', error);
        res.status(500).json({ error: "Failed to fetch statistics" });
    }
});

// API for bar chart data
// API for bar chart data
router.get('/bar-chart', async (req, res) => {
    const { month, year } = req.query;

    if (!month || !year) {
        return res.status(400).json({ error: "Month and year are required" });
    }

    const startDate = new Date(year, month - 1, 1); // First day of the month
    const endDate = new Date(year, month, 0, 23, 59, 59, 999); // Last day of the month

    console.log('Start Date:', startDate);
    console.log('End Date:', endDate);

    try {
        const ranges = [0, 100, 200, 300, 400, 500, 600, 700, 800, 900];
        const counts = await Promise.all(
            ranges.map(async (range, index) => {
                const min = range;
                const max = (index === ranges.length - 1) ? Infinity : ranges[index + 1];
                return Transaction.countDocuments({
                    price: { $gte: min, $lt: max },
                    dateOfSale: { $gte: startDate, $lte: endDate }
                });
            })
        );

        const responseData = ranges.map((range, index) => ({
            range: index === ranges.length - 1 ? `${range}+` : `${range}-${ranges[index + 1] - 1}`,
            count: counts[index],
        }));

        res.json({ priceRanges: responseData });
    } catch (error) {
        console.error('Error fetching bar chart data:', error);
        res.status(500).json({ error: 'Failed to fetch bar chart data' });
    }
});

// API for pie chart data
router.get('/pie-chart', async (req, res) => {
    const { month, year } = req.query;

    if (!month || !year) {
        return res.status(400).json({ error: "Month and year are required" });
    }

    const startDate = new Date(year, month - 1, 1); // First day of the month
    const endDate = new Date(year, month, 0, 23, 59, 59, 999); // Last day of the month

    console.log('Start Date:', startDate);
    console.log('End Date:', endDate);

    try {
        const categories = await Transaction.aggregate([
            { $match: { dateOfSale: { $gte: startDate, $lte: endDate } } },
            { $group: { _id: '$category', count: { $sum: 1 } } },
        ]);

        console.log('Categories found:', categories);

        res.json(categories);
    } catch (error) {
        console.error('Error fetching pie chart data:', error);
        res.status(500).json({ error: 'Failed to fetch pie chart data' });
    }
});

// Combined API to fetch data from all three APIs
router.get('/combined', async (req, res) => {
    const { month } = req.query;

    if (!month) {
        return res.status(400).json({ error: "Month is required" });
    }

    try {
        const [statistics, barChart, pieChart] = await Promise.all([
            axios.get(`http://localhost:5000/api/statistics?month=${month}`),
            axios.get(`http://localhost:5000/api/bar-chart?month=${month}`),
            axios.get(`http://localhost:5000/api/pie-chart?month=${month}`)
        ]);

        res.json({
            statistics: statistics.data,
            barChart: barChart.data,
            pieChart: pieChart.data,
        });
    } catch (error) {
        console.error('Error fetching combined data:', error);
        res.status(500).json({ error: 'Failed to fetch combined data' });
    }
});

module.exports = router;
