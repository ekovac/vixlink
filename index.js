const jwt = require("express-jwt");
const express = require("express");
const mustache = require("mustache");

const PREFIX = "VIXLINK";
const config = {
  port: process.env[`${PREFIX}_PORT`] || "4816",
  host: process.env[`${PREFIX}_HOST`] || "0.0.0.0",
  dbPath: process.env[`${PREFIX}_DB_PATH`] || "/vixlink.json",
  publicKeyUrl: process.env["`${PREFIX}_PUBLIC_KEY_URL"] || "",
  validUsers: process.env[`${PREFIX}_VALID_USERS`] || "",
  allowAnySigned: process.env[`${PREFIX}_ALLOW_ANY_SIGNED`] || true,
};

const app = express();

app.use("/", (req, res, next) => {});

app.use(`/*`, (req, res, next) => {});

app.listen(Number(config.port), config.host, () =>
  console.info("Listening", config.host),
);
