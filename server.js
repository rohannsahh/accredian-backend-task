// server.js
const express = require('express');
const { PrismaClient } = require('@prisma/client');
const { google } = require('googleapis');
const cors = require('cors');

const nodemailer = require('nodemailer');
require('dotenv').config();

const app = express();
const prisma = new PrismaClient();
const PORT = process.env.PORT || 5000;

app.use(cors());
app.use(express.json());

app.post('/api/referrals', async (req, res) => {
  const { referrerName, referrerEmail, referrerMobile, refereeName, refereeEmail, refereeMobile } = req.body;

  if (!referrerName || !referrerEmail || !referrerMobile || !refereeName || !refereeEmail || !refereeMobile) {
    return res.status(400).json({ error: 'All fields are required' });
  }

  try {
    const referral = await prisma.referral.create({
      data: {
        referrerName,
        referrerEmail,
        referrerMobile,
        refereeName,
        refereeEmail,
        refereeMobile,
      },
    });

    await sendReferralEmail(referral);

    res.status(201).json(referral);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'An error occurred while processing your request' });
  }
});

// nodemailer and Google Mail Service API


const oauth2Client = new google.auth.OAuth2(
  process.env.GMAIL_CLIENT_ID,
  process.env.GMAIL_CLIENT_SECRET,
  'https://developers.google.com/oauthplayground'
);

oauth2Client.setCredentials({
  refresh_token: process.env.GMAIL_REFRESH_TOKEN,
});

async function sendReferralEmail(referral) {
  try {
    const accessToken = await oauth2Client.getAccessToken();

    const transporter = nodemailer.createTransport({
      service: 'gmail',
      auth: {
        type: 'OAuth2',
        user: process.env.GMAIL_USER,
        clientId: process.env.GMAIL_CLIENT_ID,
        clientSecret: process.env.GMAIL_CLIENT_SECRET,
        refreshToken: process.env.GMAIL_REFRESH_TOKEN,
        accessToken: accessToken.token,
      },
    });

    const mailOptions = {
      from: process.env.GMAIL_USER,
      to: referral.refereeEmail,
      subject: 'You have been referred!',
      text: `Hello ${referral.refereeName},\n\n${referral.referrerName} has referred you to our platform. Check it out!`,
    };

    await transporter.sendMail(mailOptions);
  } catch (error) {
    console.error('Error sending email:', error);
  }
}

app.listen(PORT, () => {
  console.log(`Server is running on http://localhost:${PORT}`);
});
