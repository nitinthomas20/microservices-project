const express = require('express');
const mongoose = require('mongoose');
const bodyParser = require('body-parser');
const cors = require('cors');
const nodemailer = require('nodemailer');
const schedule = require('node-schedule'); // For scheduling emails
require('dotenv').config(); // Load environment variables
const logger = require('./logger'); // Import Winston logger


// Initialize Express
const app = express();
app.use(bodyParser.json());
app.use(cors());



// Nodemailer Transporter (for sending emails)
const transporter = nodemailer.createTransport({
    service: 'gmail',
    auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASS,
    },
});



// In-memory storage for scheduled jobs (for simplicity)
const scheduledEmails = {};

// Route to handle ticket booking form submission
app.post('/api/bookings', async (req, res) => {
    const { name, email, tours } = req.body;

    logger.info('Received Notification request', { name, tours });


    // Save to database
    try {
        
        // Current date and time
        const now = new Date();

        // Schedule or send emails for each tour
        tours.forEach((tour) => {
            const eventDateTime = new Date(tour.date); // Assuming tour.date is a timestamp
            const emailDateTime = new Date(eventDateTime.getTime() - 24 * 60 * 60 * 1000); // 1 day before event

            // Generate the list of tours in HTML format
            const tourDetailsHTML = `
                <li><strong>${tour.title}</strong> - Date: ${eventDateTime.toDateString()}</li>
            `;

            // Check if the event is happening tomorrow or within 24 hours
            if (emailDateTime <= now) {
                // If the event is happening tomorrow or within 24 hours, send the email immediately
                const mailOptions = {
                    from: process.env.EMAIL_USER,
                    to: email,
                    subject: `Reminder: Upcoming event - ${tour.title}`,
                    html: `
                        <h2>Event Reminder</h2>
                        <p>This is a reminder that the event "<strong>${tour.title}</strong>" is happening tomorrow.</p>
                        <ul>
                            ${tourDetailsHTML}
                        </ul>
                        <p>We look forward to seeing you soon!</p>
                        <p>Best regards,<br>BookMyShow</p>
                    `,
                };

                transporter.sendMail(mailOptions, (error, info) => {
                    if (error) {
                        logger.error('Error sending immediate email', { error: error.message, tour: tour.title });
                        console.error(`Error sending immediate reminder email for tour: ${tour.title}`, error);
                    } else {
                        logger.info('Immediate email sent successfully', { tour: tour.title, emailInfo: info.response });
                        console.log(`Immediate email reminder sent for tour: ${tour.title}, info:`, info.response);
                    }
                });
            } else {
                // If the event is in the future, schedule the email for 1 day before the event
                const job = schedule.scheduleJob(emailDateTime, () => {
                    const mailOptions = {
                        from: process.env.EMAIL_USER,
                        to: email,
                        subject: `Reminder: Upcoming event - ${tour.title}`,
                        html: `
                            <h2>Event Reminder</h2>
                            <p>This is a reminder that the event "<strong>${tour.title}</strong>" is happening tomorrow.</p>
                            <ul>
                                ${tourDetailsHTML}
                            </ul>
                            <p>We look forward to seeing you soon!</p>
                            <p>Best regards,<br>BookMyShow</p>
                        `,
                    };

                    transporter.sendMail(mailOptions, (error, info) => {
                        if (error) {
                            logger.error('Error sending scheduled email', { error: error.message, tour: tour.title });
                            console.error(`Error sending scheduled reminder email for tour: ${tour.title}`, error);
                        } else {
                            logger.info('Scheduled email sent successfully', { tour: tour.title, emailInfo: info.response });
                            console.log(`Scheduled email reminder sent for tour: ${tour.title}, info:`, info.response);
                        }
                    });
                });

                // Save the job to the scheduled emails storage (Optional: to keep track)
                scheduledEmails[`${email}-${tour.id}`] = job;
                logger.info('Email scheduled', { email, tourId: tour.id, scheduleTime: emailDateTime });
            }
        });

        // Send response back to the client
        res.status(201).json({ message: 'Emails scheduled or sent!' });
    } catch (error) {
        logger.error('Error sending emails', { error: error.message });
        res.status(500).json({ error: 'Error sending email' });
    }
});

// Start the server
const PORT = process.env.PORT || 5003;
app.listen(PORT, () => {
    logger.info('Server started', { port: PORT });
    console.log(`Server is running on port ${PORT}`);
});
