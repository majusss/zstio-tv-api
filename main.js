const fastify = require("fastify")({logger: false});
const axios = require("axios");
const querystring = require("querystring");
const {Keystore, AccountTools, VulcanHebe} = require('vulcan-api-js');
const cheerio = require("cheerio")
const https = require("https")

require("dotenv").config();

const generateRandomString = (length) => {
  let text = "";
  const possible =
    "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";

  for (var i = 0; i < length; i++) {
    text += possible.charAt(Math.floor(Math.random() * possible.length));
  }
  return text;
};

const delay = (delay) => {
  return new Promise((resolve) => {
    setTimeout(resolve, delay);
  });
};

fastify.get("*", async (req, reply) => {
  reply.send({message: "ZSTiO TV API"});
});

fastify.get("/api/getLuckyNumber", async (req, reply) => {
  try {
    const keystore = new Keystore();
    keystore.loadFromObject(JSON.parse(Buffer.from(req.query.keystore, "base64").toString("utf8")));
    const account = AccountTools.loadFromObject(JSON.parse(Buffer.from(req.query.account, "base64").toString("utf8")));
    const client = new VulcanHebe(keystore, account);
    await client.selectStudent();
    const luckyNumber = (await client.getLuckyNumber()).number;
    return reply.send({
      success: true,
      luckyNumber
    });
  } catch (e) {
    console.log(e)
    return reply.send({
      success: false,
      luckyNumber: -1
    });
  }
});

fastify.get("/api/getCytat", async (req, reply) => {
  const res = await axios.get("https://www.kalendarzswiat.pl/cytat_dnia", {
    httpsAgent: new https.Agent({
      rejectUnauthorized: false
    })
  });

  const $ = cheerio.load(res.data);

  const match = $(".quote-of-the-day").first().text().trim().match(/„([^”]+)”\s+([^\n]+)/);

  if (match) {
    const content = match[1].trim();
    const author = match[2].trim();
    return reply.send({
      success: true, cytat: {
        content: content,
        author: author
      }
    });
  } else {
    return {success: false, cytat: {content: "Brak cytatu na dziś", author: "~"}};
  }
})

fastify.get("/spoti", (req, reply) => {
  reply.redirect(
    "https://accounts.spotify.com/authorize?" +
    querystring.stringify({
      response_type: "code",
      client_id: process.env.SPOTI_ID,
      scope: "user-read-playback-state",
      redirect_uri: process.env.SERVER_URL + "/api/auth_spoti",
      state: generateRandomString(16),
    })
  );
});

fastify.get("/api/auth_spoti", async (req, reply) => {
  const data = {
    client_id: process.env.SPOTI_ID,
    client_secret: process.env.SPOTI_SECRET,
    grant_type: "authorization_code",
    code: req.query.code,
    redirect_uri: process.env.SERVER_URL + "/api/auth_spoti",
  };

  const reqRefresh = await axios.post(
    "https://accounts.spotify.com/api/token",
    null,
    {
      params: data,
    }
  );

  reply.send({success: true, data: reqRefresh.data});
});

fastify.get("/api/spoti_current", async (req, reply) => {
  try {
    if (!req.query.refresh_token) return reply.send({success: false});
    const authHeader = `Basic ${Buffer.from(
      `${process.env.SPOTI_ID}:${process.env.SPOTI_SECRET}`
    ).toString("base64")}`;

    const data = new URLSearchParams();
    data.append("grant_type", "refresh_token");
    data.append("refresh_token", req.query.refresh_token);

    const accessReq = await axios.post(
      "https://accounts.spotify.com/api/token",
      data,
      {
        headers: {
          Authorization: authHeader,
          "Content-Type": "application/x-www-form-urlencoded",
        },
      }
    );

    const playerReq = await axios.get("https://api.spotify.com/v1/me/player", {
      headers: {Authorization: `Bearer ${accessReq.data.access_token}`},
    });

    reply.send({success: true, data: playerReq.data});
  } catch (error) {
    console.log(error);
  }
});

fastify.listen({port: process.env.SERVER_URL.split(":")[process.env.SERVER_URL.split(":").length - 1]}, (err, address) => {
  if (err) {
    fastify.log.error(err);
    process.exit(1);
  }
  console.log(`Server listening on ${process.env.SERVER_URL}`);
});
