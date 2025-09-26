var express = require('express');
var router = express.Router();
var {getMySQLConnections} = require('../libs/database');
var {getAnswer} = require('../libs/openai');

var {con} = getMySQLConnections();

router.post("/api/create-bot", async (req, res) => {
  if (!req.session.isLoggedIn) {
    res.json({status: "NOK", error: "Invalid Authorization."});
    return;
  }

  var author = req.body.author;
  var prompt = req.body.prompt;

  var messages = [
    {role: "user", content: prompt}
  ];

  var answer = await getAnswer(messages);

  var sql = "INSERT INTO bots (author, initial_prompt, initial_answer, role) VALUES (?, ?, ?, 'assistant')";
  var params = [author, prompt, answer];
  con.query(sql, params, function(err, result) {
    if (err) {
      console.log(err);
      res.json({status: "NOK", error: err.message});
      return;
    }
    res.json({status: "OK", data: "Bot created successfully."});
  });
});

router.get("/api/get-bots", (req, res) => {
  if (!req.session.isLoggedIn) {
    res.json({status: "NOK", error: "Invalid Authorization."});
    return;
  }

  var sql = "SELECT * FROM bots ORDER BY id DESC;";
  con.query(sql, function(err, result) {
    if (err) {
      console.log(err);
      res.json({status: "NOK", error: err.message});
      return;
    }
    res.json({status: "OK", data: result});
  });
});

module.exports = router;