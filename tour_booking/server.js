const express = require('express');
const mongoose = require('mongoose');
const bodyParser = require('body-parser');
const cors = require('cors');
const nodemailer = require('nodemailer');
const morgan = require('morgan');
const winston = require('winston');
require('dotenv').config(); // Load environment variables

// Initialize Express
const app = express();
app.use(bodyParser.json());
app.use(cors());

// Setup Winston Logger
const logger = winston.createLogger({
    level: 'debug', // Setting level to 'debug' to log detailed information
    format: winston.format.combine(
        winston.format.timestamp(),
        winston.format.json(), // Logging in JSON format for better structure
        winston.format.printf(({ timestamp, level, message, ...metadata }) => {
            let msg = `${timestamp} [${level}]: ${message} `;
            if (Object.keys(metadata).length) {
                msg += JSON.stringify(metadata);
            }
            return msg;
        })
    ),
    transports: [
        new winston.transports.Console(),  // Log to console
        new winston.transports.File({ filename: 'app.log' }) // Log to file
    ],
});

// Custom Morgan token to log response time and method details
morgan.token('id', (req) => req.id);
morgan.token('remote-addr', (req) => req.ip);
morgan.token('req-headers', (req) => JSON.stringify(req.headers));
morgan.token('res-headers', (req, res) => JSON.stringify(res.getHeaders()));

// Morgan middleware to log detailed HTTP requests
app.use(morgan((tokens, req, res) => {
    return [
        `ID: ${tokens.id(req)}`,
        tokens['remote-addr'](req, res),
        tokens.method(req, res),
        tokens.url(req, res),
        `Status: ${tokens.status(req, res)}`,
        `Response Time: ${tokens['response-time'](req, res)} ms`,
        `Req Headers: ${tokens['req-headers'](req)}`,
        `Res Headers: ${tokens['res-headers'](req, res)}`
    ].join(' | ');
}, { stream: { write: (message) => logger.info(message) } }));

// MongoDB Atlas Connection with logging
const mongoURI = process.env.MONGO_URI;
mongoose.connect(mongoURI, {
    useNewUrlParser: true,
    useUnifiedTopology: true,
})
    .then(() => logger.info('MongoDB connected successfully'))
    .catch(err => logger.error('Error connecting to MongoDB:', { error: err.message, stack: err.stack }));

mongoose.connection.on('error', (err) => {
    logger.error('MongoDB Error:', { error: err.message, stack: err.stack });
});

mongoose.connection.on('disconnected', () => {
    logger.warn('MongoDB disconnected');
});

// Nodemailer Transporter (for sending emails) with logging
const transporter = nodemailer.createTransport({
    service: 'gmail',
    auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASS,
    },
});

// Define a Schema for ticket bookings
const ticketSchema = new mongoose.Schema({
    name: { type: String, required: true },
    email: { type: String, required: true },
    phone: { type: String, required: true },
    tours: [
        {
            id: { type: String, required: true },
            title: { type: String, required: true },
            price: { type: Number, required: true }
        }
    ],
    bookingDate: { type: Date, default: Date.now },
});

// Create a model from the schema
const Ticket = mongoose.model('Tickeety', ticketSchema);

// Route to handle ticket booking form submission with detailed logging
app.post('/api/bookings', async (req, res) => {
    const { name, email, phone, tours } = req.body;
    
    logger.debug('Booking request received', { name, email, phone, tours });

    // Calculate total price based on selected tours
    let totalPrice = 0;
    tours.forEach(tour => {
        totalPrice += tour.price * tour.quantity;
    });

    // Create a new ticket booking
    const newBooking = new Ticket({
        name,
        email,
        phone,
        tours,
        totalPrice,
    });

    // Save to database
    try {
        await newBooking.save();
        logger.info(`New booking saved for ${name} with total price $${totalPrice}`, { email, tours });

        // Generate the list of tours in HTML format
        const toursListHTML = tours.map(tour => `
            <li><strong>${tour.title}</strong> - Quantity: ${tour.quantity}, Price per Ticket: $${tour.price}, Total: $${tour.price * tour.quantity}</li>
        `).join('');

        // Send Confirmation Email
        const mailOptions = {
            from: process.env.EMAIL_USER,
            to: email, // recipient's email
            subject: 'Booking Confirmation',
            html: `
                <h2>Booking Confirmation</h2>
                <p>Dear ${name},</p>
                <p>Thank you for booking your tour(s) with us. Here are your booking details:</p>
                <ul>
                    ${toursListHTML}
                </ul>
                <p>We look forward to seeing you soon!</p>
                <p>Best regards,<br>BookMyShow</p>
            `,
        };

        // Send the email
        transporter.sendMail(mailOptions, (error, info) => {
            if (error) {
                logger.error(`Error sending email to ${email}`, { error: error.message });
                return res.status(500).json({ error: 'Error sending confirmation email' });
            }
            logger.info(`Email sent to ${email}`, { response: info.response });
            res.status(201).json({ message: 'Booking successfully saved and email sent!' });
        });
    } catch (error) {
        logger.error('Error saving booking', { error: error.message, stack: error.stack });
        res.status(500).json({ error: 'Error saving booking, please try again.' });
    }
});

// Error handling middleware
app.use((err, req, res, next) => {
    logger.error('Unhandled error', { error: err.message, stack: err.stack });
    res.status(500).send('Something broke!');
});

// Start the server
const PORT = process.env.PORT || 5002;
app.listen(PORT, () => {
    logger.info(`Server is running on port ${PORT}`);
});
