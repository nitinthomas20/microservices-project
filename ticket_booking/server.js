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

// Set up Winston for logging
const logger = winston.createLogger({
    level: 'info', // Set the level to 'info' (can be 'error', 'warn', etc.)
    format: winston.format.combine(
        winston.format.timestamp(),
        winston.format.printf(({ timestamp, level, message }) => {
            return `${timestamp} [${level.toUpperCase()}]: ${message}`;
        })
    ),
    transports: [
        new winston.transports.Console(), // Log to console
        new winston.transports.File({ filename: 'combined.log' }) // Log to a file
    ]
});

// Set up Morgan for HTTP request logging
app.use(morgan('combined', { stream: { write: (message) => logger.info(message.trim()) } }));

// MongoDB Atlas Connection
const mongoURI = process.env.MONGO_URI;
mongoose.connect(mongoURI, {
    useNewUrlParser: true,
    useUnifiedTopology: true,
})
    .then(() => logger.info('MongoDB connected successfully'))
    .catch(err => logger.error('MongoDB connection error: ' + err));

// Nodemailer Transporter (for sending emails)
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
    ticketType: { type: String, required: true },
    ticketQuantity: { type: Number, required: true },
    totalPrice: { type: Number, required: true },
    bookingDate: { type: Date, default: Date.now },
});

// Create a model from the schema
const Ticket = mongoose.model('Ticket', ticketSchema);

// Route to handle ticket booking form submission
app.post('/api/bookings', async (req, res) => {
    const { name, email, phone, ticketType, ticketQuantity } = req.body;

    // Log incoming request data
    logger.info(`Received booking request: Name=${name}, Email=${email}, Phone=${phone}, TicketType=${ticketType}, Quantity=${ticketQuantity}`);

    // Calculate total price based on ticket type
    let ticketPrice = 0;
    if (ticketType === 'standard') {
        ticketPrice = 10;
    } else if (ticketType === 'vip') {
        ticketPrice = 25;
    } else if (ticketType === 'premium') {
        ticketPrice = 50;
    }

    const totalPrice = ticketPrice * ticketQuantity;

    // Create a new ticket booking
    const newBooking = new Ticket({
        name,
        email,
        phone,
        ticketType,
        ticketQuantity,
        totalPrice,
    });

    // Save to database
    try {
        await newBooking.save();

        // Send Confirmation Email
        const mailOptions = {
            from: process.env.EMAIL_USER,
            to: email, // recipient's email
            subject: 'Booking Confirmation',
            html: `
                <h2>Booking Confirmation</h2>
                <p>Dear ${name},</p>
                <p>Thank you for booking your ticket with us. Here are your booking details:</p>
                <ul>
                    <li><strong>Ticket Type:</strong> ${ticketType}</li>
                    <li><strong>Quantity:</strong> ${ticketQuantity}</li>
                    <li><strong>Total Price:</strong> $${totalPrice}</li>
                </ul>
                <p>We look forward to seeing you soon!</p>
                <p>Best regards,<br>BookMyTicket</p>
            `,
        };

        // Send the email
        transporter.sendMail(mailOptions, (error, info) => {
            if (error) {
                logger.error(`Error sending email to ${email}: ${error.message}`);
                return res.status(500).json({ error: 'Error sending confirmation email' });
            }
            logger.info(`Email sent to ${email}: ${info.response}`);
        });

        logger.info(`Booking saved successfully for ${name}`);
        res.status(201).json({ message: 'Booking successfully saved!' });
    } catch (error) {
        logger.error(`Error saving booking for ${name}: ${error.message}`);
        res.status(500).json({ error: 'Error saving booking, please try again.' });
    }
});

// Start the server
const PORT = process.env.PORT || 5002;
app.listen(PORT, () => {
    logger.info(`Server is running on port ${PORT}`);
});
