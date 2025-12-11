const express = require("express");
const nodemailer = require("nodemailer");

const router = express.Router();

// Configure your email service
const transporter = nodemailer.createTransport({
  service: "gmail",
  auth: {
    user: process.env.EMAIL_USER || "workerfacts@gmail.com",
    pass: process.env.EMAIL_PASSWORD,
  },
});

router.post("/", async (req, res) => {
  try {
    const { name, clinicName, email, phone, evaluationTypes, comments } =
      req.body;

    if (!name || !clinicName || !email) {
      return res.status(400).json({
        success: false,
        message: "Missing required fields",
      });
    }

    // Prepare the email content
    const evaluationTypesText = evaluationTypes
      .map((type) => {
        const typeMap = {
          functional:
            "Functional Abilities and Capacity Evaluation / Fit for Duties / Return to Work",
          "job-demands": "Job / Physical Demands Analysis (JDA / PDA)",
          "pre-employment": "Post Offer Pre-Employment Screening",
          rehab: "Rehab Baseline and Progress Evaluations",
        };
        return typeMap[type] || type;
      })
      .join("\n- ");

    const emailContent = `
New Contact Form Submission

Name: ${name}
Clinic Name: ${clinicName}
Email: ${email}
Phone: ${phone || "Not provided"}

Evaluation Types of Interest:
- ${evaluationTypesText || "None selected"}

Additional Comments:
${comments || "None"}

---
This message was submitted on: ${new Date().toLocaleString()}
    `;

    const htmlContent = `
<h2>New Contact Form Submission</h2>
<p><strong>Name:</strong> ${name}</p>
<p><strong>Clinic Name:</strong> ${clinicName}</p>
<p><strong>Email:</strong> ${email}</p>
<p><strong>Phone:</strong> ${phone || "Not provided"}</p>

<h3>Evaluation Types of Interest:</h3>
<ul>
  ${
    evaluationTypes.length > 0
      ? evaluationTypes
          .map((type) => {
            const typeMap = {
              functional:
                "Functional Abilities and Capacity Evaluation / Fit for Duties / Return to Work",
              "job-demands":
                "Job / Physical Demands Analysis (JDA / PDA)",
              "pre-employment": "Post Offer Pre-Employment Screening",
              rehab: "Rehab Baseline and Progress Evaluations",
            };
            return `<li>${typeMap[type] || type}</li>`;
          })
          .join("")
      : "<li>None selected</li>"
  }
</ul>

<h3>Additional Comments:</h3>
<p>${comments || "None"}</p>

<hr>
<p><small>Submitted on: ${new Date().toLocaleString()}</small></p>
    `;

    // Send to both emails
    const recipientEmails = [
      "workerfacts@gmail.com",
      "venkateshe511@gmail.com",
    ];

    const mailPromises = recipientEmails.map((recipientEmail) =>
      transporter.sendMail({
        from: process.env.EMAIL_USER || "workerfacts@gmail.com",
        to: recipientEmail,
        subject: `New Contact Form Submission from ${name}`,
        text: emailContent,
        html: htmlContent,
      })
    );

    // Also send a confirmation email to the user
    const confirmationPromise = transporter.sendMail({
      from: process.env.EMAIL_USER || "workerfacts@gmail.com",
      to: email,
      subject: "We received your contact form - WorkerFacts",
      text: `
Dear ${name},

Thank you for reaching out to WorkerFacts! We have received your contact form and will review your information shortly.

We will contact you at your provided email address or phone number to discuss your evaluation needs.

Best regards,
WorkerFacts Team
      `,
      html: `
<p>Dear ${name},</p>

<p>Thank you for reaching out to <strong>WorkerFacts</strong>! We have received your contact form and will review your information shortly.</p>

<p>We will contact you at your provided email address or phone number to discuss your evaluation needs.</p>

<p>Best regards,<br/>
WorkerFacts Team</p>
      `,
    });

    await Promise.all([...mailPromises, confirmationPromise]);

    res.status(200).json({
      success: true,
      message: "Emails sent successfully",
    });
  } catch (error) {
    console.error("Error sending email:", error);
    res.status(500).json({
      success: false,
      message: "Failed to send email",
      error: error.message,
    });
  }
});

module.exports = router;
