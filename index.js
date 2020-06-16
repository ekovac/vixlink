const jwt = require("jsonwebtoken");
const fastify = require("fastify");
const mustache = require("mustache");
const level = require("level");
const { promisify } = require("util");
// TODO: Add EC support to jwks-rsa
const jwksEc = require("jwks-ec");
require("dotenv").config();

const PREFIX = "VIXLINK";
const config = {
  port: process.env[`${PREFIX}_PORT`] || "4816",
  host: process.env[`${PREFIX}_HOST`] || "0.0.0.0",
  dbPath: process.env[`${PREFIX}_DB_PATH`] || "/vixlink.json",
  jwksUri: process.env[`${PREFIX}_JWKS_URI`],
  jwtHeader: process.env[`${PREFIX}_JWT_HEADER`] || "X-Pomerium-Jwt-Assertion",
  trustProxy: process.env[`${PREFIX}_TRUST_PROXY`] || false,
};
let db;
let jwksClient;
const app = fastify();

const initialize = async () => {
  try {
    db = level(config.dbPath);
  } catch (e) {
    console.error("Unable to open database!");
    throw e;
  }

  try {
    jwksClient = jwksEc({ jwksUri: config.jwksUri });
  } catch (e) {
    console.error("Unable to retrieve JWKS info!");
    throw e;
  }
};

app.get("/", async (req, res) => {
  const token = req.headers[config.jwtHeader.toLowerCase()];
  // Note to self, file bug with pomerium for not attaching the key ID to the token.
  const getKey = (header, callback) => {
    jwksClient.getSigningKeys((err, keys) => {
      // HAAAAACK, should read kid from header and do getSigningKey.
      const key = keys[0];
      callback(null, key.publicKey || key.rsaPublicKey);
    });
  };

  const verifyPromise = promisify((t, k, cb) => jwt.verify(t, k, cb));
  const authInfo = await verifyPromise(token, getKey);
  res.send(authInfo);
});

app.use(`/*`, (req, res) => {});

initialize().then(() => {
  app.listen(Number(config.port), config.host, () =>
    console.info("Listening", config.host),
  );
});
