"use strict";

const express = require("express");
const mongo = require("mongodb");
const mongoose = require("mongoose");
const bodyParser = require("body-parser");
const cors = require("cors");
const dns = require("dns");
const app = express();
const morgan = require("morgan");

// Basic Configuration
const port = process.env.PORT || 3000;

const Schema = mongoose.Schema;

const shortlinkSchema = new Schema({
  original_url: {
    type: String,
    required: true
  },
  short_url: {
    type: Number,
    required: true
  }
});

const Shortlink = mongoose.model("Shortlink", shortlinkSchema);

function createAndSaveAShortlink(link, newURL, done) {
  const newLink = new Shortlink({
    original_url: link,
    short_url: newURL
  });

  newLink.save(function(err, data) {
    if (err) {
      return done(err);
    }
    done(null, data);
  });
}

function findOneByIndex(index, done) {
  Shortlink.findOne({ short_url: index }, (err, data) => {
    if (err) {
      return done(err);
    }
    done(null, data);
  });
}

/** this project needs a db !! **/

mongoose
  .connect(process.env.MONGO_URI, {
    useNewUrlParser: true,
    useUnifiedTopology: true,
    useCreateIndex: true
  })
  .then(() => {
    console.info("DB connected");
  });

app.use(cors());
app.use(morgan(":method :url :status "));
app.use(bodyParser.urlencoded({ extended: false }));

// middleware to validate url
const validateURL = function(req, res, next) {
  const userURL = new URL(req.body.url);
  const hostname = userURL.host;
  dns.lookup(hostname, err => {
    if (err) {
      return res.json({
        error: "invalid url"
      });
    }
    next();
  });
};

app.use("/api/shorturl/new", validateURL);

app.use("/public", express.static(process.cwd() + "/public"));

app.get("/", function(req, res) {
  res.sendFile(process.cwd() + "/views/index.html");
});

// I can POST a URL to [project_url]/api/shorturl/new
app.post("/api/shorturl/new", (req, res) => {
  let originalURL = req.body.url;
  Shortlink.countDocuments({}, (err, count) => {
    if (err) {
      res.json({
        message: "oops! an error occured"
      });
    }
    createAndSaveAShortlink(originalURL, count, (err, data) => {
      if (err) {
        return res.json({
          error: "oops! your url could not be saved"
        });
      }

      return res.json({
        original_url: data.original_url,
        short_url: data.short_url
      });
    });
  });
});

// I can visit the shortened URL (e.g. [this_project_url]/api/shorturl/3),
// and it will redirect me to my original link.

app.get("/api/shorturl/:index", (req, res) => {
  const index = req.params.index;

  const data = findOneByIndex(index, function(err, data) {
    if (err) {
      return res.json({ error: "Sorry, no such link" });
    }
    res.redirect(data.original_url);
  });
});

app.listen(port, function() {
  console.log("Node.js listening ...");
});
