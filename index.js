const express = require('express');
const app = express();
const cors = require('cors');
const morgan = require('morgan');
require('dotenv').config();
const port = process.env.PORT || 5000;


//  middleware 

app.use(cors());
app.use(express.json());
app.use(morgan('dev'));


app.get('/', async (req, res) => {
    res.send('server is Running');
});
app.listen(port, () => {
    console.log(`Server listening on ${port}`);
});