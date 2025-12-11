const { onRequest } = require("firebase-functions/v2/https");
const express = require("express");
const cors = require("cors");

const generateDocxRoute = require("./routes/generateClaimantReport");
const createCheckoutSessionRoute = require("./routes/createCheckoutSession");
const stripeWebhookRoute = require("./routes/stripeWebhook");
const generateExecutiveSummaryClaimantReportRoute = require("./routes/generateExecutiveSummaryClaimantReport");

// Create separate apps
const app1 = express();
const app2 = express();
const app3 = express();
const app4 = express();

const corsOptions = {
  origin: true,
  methods: ["GET", "POST", "OPTIONS"],
  allowedHeaders: ["Content-Type", "Authorization"],
  credentials: true,
};

app1.use(cors(corsOptions));
app1.use(express.json({ limit: "400mb" }));
app1.use(express.urlencoded({ extended: true, limit: "400mb" }));
app1.use("/", generateDocxRoute);

app2.use(cors(corsOptions));
app2.use(express.json({ limit: "20mb" }));
app2.use(express.urlencoded({ extended: true, limit: "20mb" }));
app2.use("/", createCheckoutSessionRoute);

// Webhook app must NOT use express.json() before the route
app3.use(cors(corsOptions));
app3.use("/", stripeWebhookRoute);

app4.use(cors(corsOptions));
app4.use(express.json({ limit: "400mb" }));
app4.use(express.urlencoded({ extended: true, limit: "400mb" }));
app4.use("/", generateExecutiveSummaryClaimantReportRoute);


// Export Gen 2 functions
exports.generateClaimantReportApi = onRequest(
  {
    memory: "1GiB", // Note: Gen 2 uses "GiB" not "GB"
    timeoutSeconds: 540,
    cpu: 1, // Now you can set CPU (0.08 to 2)
    maxInstances: 100,
  },
  app1,
);

exports.createCheckoutSessionApi = onRequest(
  {
    memory: "256MiB",
    timeoutSeconds: 60,
  },
  app2,
);

exports.stripeWebhookApi = onRequest(
  {
    memory: "256MiB",
    timeoutSeconds: 60,
  },
  app3,
);

exports.generateExecutiveSummaryClaimantReportApi = onRequest(
  {
    memory: "1GiB", // Note: Gen 2 uses "GiB" not "GB"
    timeoutSeconds: 540,
    cpu: 1, // Now you can set CPU (0.08 to 2)
    maxInstances: 100,
  },
  app4,
);
