const jwt = require("jsonwebtoken");
const fastify = require("fastify");
const mustache = require("mustache");
const level = require("level");
const { promisify } = require("util");
const fs = require("fs");

require.extensions[".html"] = function (module, filename) {
  module.exports = fs.readFileSync(filename, "utf8");
};

const manageTemplate = require("./manage.html");
// TODO: Add EC support to jwks-rsa
const jwksEc = require("jwks-ec");
require("dotenv").config();

const PREFIX = "VIXLINK";
const config = {
  port: process.env[`${PREFIX}_PORT`] || "4816",
  host: process.env[`${PREFIX}_HOST`] || "0.0.0.0",
  dbPath: process.env[`${PREFIX}_DB_PATH`] || "/vixlink.json",
  jwksUri: process.env[`${PREFIX}_JWKS_URI`],
  jwtHeader: process.env[`${PREFIX}_JWT_HEADER`],
};
let db;
let jwksClient;
const app = fastify();
app.register(require("fastify-formbody"));

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

app.addHook("onRequest", async (req, res) => {
  const token = req.headers[config.jwtHeader.toLowerCase()];
  let h;
  // Note to self, file bug with pomerium for not attaching the key ID to the token.
  const getKey = (header, callback) => {
    h = header;
    jwksClient.getSigningKeys((err, keys) => {
      // HAAAAACK, should read kid from header and do getSigningKey.
      const key = keys[0];
      callback(null, key.publicKey || key.rsaPublicKey);
    });
  };

  const verifyPromise = promisify((t, k, cb) => jwt.verify(t, k, cb));
  req.jwt = await verifyPromise(token, getKey);

  return;
});

const getLinks = async () => {
  return new Promise((resolve, reject) => {
    const links = [];
    db.createReadStream()
      .on("data", (data) => {
        links.push({ name: data.key, url: data.value });
      })
      .on("error", (err) => {
        reject(err);
      })
      .on("end", (err) => {
        resolve(links);
      });
  });
};

app.get("/", async (req, res) => {
  res
    .header("Content-Type", "text/html; charset=UTF-8")
    .send(mustache.render(manageTemplate, { links: await getLinks() }));
  if (!req.jwt.email) {
    res.status(403).send();
  }
});

app.post("/", async (req, res) => {
  if (!req.jwt.email) {
    res.status(403).send();
  }
  if (req.body.action == "delete") {
    const name = req.body.name;
    const url = req.body.url;
    await db.del(req.body.name);
  } else if (req.body.action == "create") {
    await db.put(req.body.name, req.body.url);
  }

  res.redirect("/");
});

app.get(`/*`, (req, res) => {
  res.send(req.raw.url);
});

initialize().then(() => {
  app.listen(Number(config.port), config.host, () =>
    console.info("Listening", config.host),
  );
});
