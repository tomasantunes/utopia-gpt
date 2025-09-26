var express = require('express');
var router = express.Router();
var {getPolly} = require('../libs/polly');
var fs = require('fs');
var path = require('path');
var {con} = require('../libs/database');
var {doTaskNow, scheduleCronJob, stopAllCronJobs, loadCronJobs, cron_jobs} = require('../libs/tasks');
var {removeTags} = require('../libs/utils');
var path = require('path');
var {getMySQLConnections} = require('../libs/database');
var {sendEmail} = require('../libs/email');
var {createTextPost, createImagePost, createEmail} = require('../libs/tasks');

var {con, con2} = getMySQLConnections();

var Polly = getPolly();

router.get("/api/get-audio", (req, res) => {
  if (!req.session.isLoggedIn) {
    res.json({status: "NOK", error: "Invalid Authorization."});
    return;
  }

  var id = req.query.id;

  res.sendFile(path.resolve(__dirname) + "/speech/"+id+".mp3");
});

router.get("/api/emails/get-audio", (req, res) => {
  if (!req.session.isLoggedIn) {
    res.json({status: "NOK", error: "Invalid Authorization."});
    return;
  }

  var id = req.query.id;

  res.sendFile(path.resolve(__dirname) + "/email-speech/"+id+".mp3");
});

router.get("/api/get-image", (req, res) => {
  if (!req.session.isLoggedIn) {
    res.json({status: "NOK", error: "Invalid Authorization."});
    return;
  }

  var filename = req.query.filename;

  res.sendFile(path.resolve(__dirname) + "/images/"+filename);
});

router.post("/api/do-task-now", (req, res) => {
  if (!req.session.isLoggedIn) {
    res.json({status: "NOK", error: "Invalid Authorization."});
    return;
  }

  var id = req.body.id;
  doTaskNow(id);
  res.json({status: "OK", data: "Task is being processed."});
});

router.get("/api/text-to-speech", (req, res) => {
  if (!req.session.isLoggedIn) {
    res.json({status: "NOK", error: "Invalid Authorization."});
    return;
  }

  var id = req.query.id;

  if (fs.existsSync("speech/"+id+".mp3")) {
    res.json({status: "OK", data: "Audio file exists."});
    return;
  }

  var sql = "SELECT * FROM posts WHERE id = ?;";
  var params = [id];
  con.query(sql, params, function(err, result) {
    if (err) {
      console.log(err);
      res.json({status: "NOK", error: err.message});
      return;
    }
    var content = result[0].content;
    if (content.length > 3000) {
      content = content.substring(0, 3000);
    }
    var params = {
      OutputFormat: "mp3",
      Text: content,
      VoiceId: "Emma"
    };
    Polly.synthesizeSpeech(params, function(err, data) {
      if (err) {
        console.log(err);
        res.json({status: "NOK", error: err.message});
        return;
      }
      fs.writeFile("speech/"+id+".mp3", data.AudioStream, function(err) {
        if (err) {
          console.log(err);
          res.json({status: "NOK", error: err.message});
          return;
        }
        res.json({status: "OK", data: "Audio file created successfully."});
      });
    });
  });
});

router.get("/api/emails/text-to-speech", (req, res) => {
  if (!req.session.isLoggedIn) {
    res.json({status: "NOK", error: "Invalid Authorization."});
    return;
  }

  var id = req.query.id;

  console.log("Email Text to Speech.");

  if (fs.existsSync("email-speech/"+id+".mp3")) {
    console.log("Audio file exists");
    res.json({status: "OK", data: "Audio file exists."});
    return;
  }

  var sql = "SELECT * FROM emails WHERE id = ?;";
  var params = [id];
  con.query(sql, params, function(err, result) {
    if (err) {
      console.log(err);
      res.json({status: "NOK", error: err.message});
      return;
    }
    var content = result[0].content;
    console.log(content);
    if (content.length > 3000) {
      content = content.substring(0, 3000);
    }
    content = removeTags(content);
    console.log(content);
    var params = {
      OutputFormat: "mp3",
      Text: content,
      VoiceId: "Emma"
    };
    Polly.synthesizeSpeech(params, function(err, data) {
      if (err) {
        console.log(err);
        res.json({status: "NOK", error: err.message});
        return;
      }
      fs.writeFile("email-speech/"+id+".mp3", data.AudioStream, function(err) {
        if (err) {
          console.log(err);
          res.json({status: "NOK", error: err.message});
          return;
        }
        res.json({status: "OK", data: "Audio file created successfully."});
      });
    });
  });
});

router.get("/api/get-email", (req, res) => {
  if (!req.session.isLoggedIn) {
    res.json({status: "NOK", error: "Invalid Authorization."});
    return;
  }

  var id = req.query.id;

  var sql = "SELECT * FROM emails WHERE id = ?;";
  var params = [id];
  con.query(sql, params, function(err, result) {
    if (err) {
      console.log(err);
      res.json({status: "NOK", error: err.message});
      return;
    }
    res.json({status: "OK", data: result[0]});
  });
});

router.get("/api/get-current-cron-jobs", (req, res) =>  {
  if (!req.session.isLoggedIn) {
    res.json({status: "NOK", error: "Invalid Authorization."});
    return;
  }

  res.json({status: "OK", data: "There are a total of " + cron_jobs.length + " cron jobs running."});
});

router.post("/api/create-scheduled-task", (req, res) => {
  if (!req.session.isLoggedIn) {
    res.json({status: "NOK", error: "Invalid Authorization."});
    return;
  }

  var bot_id = req.body.bot_id;
  var prompt = req.body.prompt;
  var cron_string = req.body.cron_string;
  var type = req.body.type;

  var sql = "INSERT INTO scheduled_tasks (bot_id, prompt, cron_string, type) VALUES (?, ?, ?, ?)";
  var params = [bot_id, prompt, cron_string, type];
  con.query(sql, params, function(err, result) {
    if (err) {
      console.log(err);
      res.json({status: "NOK", error: err.message});
      return;
    }
    scheduleCronJob(type, bot_id, prompt, cron_string);
    res.json({status: "OK", data: "Scheduled task created successfully."});
  });
});

router.get("/api/get-scheduled-tasks", (req, res) => {
  if (!req.session.isLoggedIn) {
    res.json({status: "NOK", error: "Invalid Authorization."});
    return;
  }

  var sql = "SELECT st.*, b.author FROM scheduled_tasks st INNER JOIN bots b ON st.bot_id = b.id ORDER BY st.id DESC";
  con.query(sql, function(err, result) {
    if (err) {
      console.log(err);
      res.json({status: "NOK", error: err.message});
      return;
    }
    res.json({status: "OK", data: result});
  });
});

router.post("/api/delete-scheduled-task", (req, res) => {
  if (!req.session.isLoggedIn) {
    res.json({status: "NOK", error: "Invalid Authorization."});
    return;
  }

  var id = req.body.id;

  var sql = "DELETE FROM scheduled_tasks WHERE id = ?;";
  var params = [id];
  con.query(sql, params, function(err, result) {
    if (err) {
      console.log(err);
      res.json({status: "NOK", error: err.message});
      return;
    }

    stopAllCronJobs();
    loadCronJobs();

    res.json({status: "OK", data: "Scheduled task deleted successfully."});
  });
});

module.exports = router;