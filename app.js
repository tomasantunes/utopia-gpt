var createError = require('http-errors');
var express = require('express');
var path = require('path');
var cookieParser = require('cookie-parser');
var logger = require('morgan');
var mysql = require('mysql2');
var mysql2 = require('mysql2/promise');
var secretConfig = require('./secret-config.json');
var session = require('express-session');
const OpenAI = require("openai");
var cron = require('node-cron');
const AWS = require('aws-sdk');
const fs = require('fs');
var cors = require('cors');
var axios = require('axios');
var crypto = require('crypto');
var nodemailer = require('nodemailer');

var app = express();

// view engine setup
app.set('views', path.join(__dirname, 'views'));
app.set('view engine', 'ejs');

app.use(logger('dev'));
app.use(express.json());
app.use(express.urlencoded({ extended: false }));
app.use(cookieParser());
app.use(express.static(path.join(__dirname, 'public')));
app.use(cors());

app.use(session({
  secret: secretConfig.SESSION_KEY,
  resave: false,
  saveUninitialized: true
}));

var con;
var con2;

if (secretConfig.ENVIRONMENT == "WINDOWS" || secretConfig.ENVIRONMENT == "MACOS") {
  con = mysql.createPool({
    connectionLimit : 90,
    connectTimeout: 1000000,
    host: secretConfig.DB_HOST,
    user: secretConfig.DB_USER,
    password: secretConfig.DB_PASSWORD,
    database: secretConfig.DB_NAME,
    timezone: '+00:00',
    port: 3306
  });

  con2 = mysql2.createPool({
    connectionLimit : 90,
    connectTimeout: 1000000,
    host: secretConfig.DB_HOST,
    user: secretConfig.DB_USER,
    password: secretConfig.DB_PASSWORD,
    database: secretConfig.DB_NAME,
    timezone: '+00:00',
    port: 3306
  });
}
else if (secretConfig.ENVIRONMENT == "UBUNTU") {
  con = mysql.createPool({
    connectionLimit : 90,
    connectTimeout: 1000000,
    host: secretConfig.DB_HOST,
    user: secretConfig.DB_USER,
    password: secretConfig.DB_PASSWORD,
    database: secretConfig.DB_NAME,
    socketPath: '/var/run/mysqld/mysqld.sock',
    timezone: '+00:00'
  });

  con2 = mysql2.createPool({
    connectionLimit : 90,
    connectTimeout: 1000000,
    host: secretConfig.DB_HOST,
    user: secretConfig.DB_USER,
    password: secretConfig.DB_PASSWORD,
    database: secretConfig.DB_NAME,
    socketPath: '/var/run/mysqld/mysqld.sock',
    timezone: '+00:00'
  });
}

const configuration = {
  apiKey: secretConfig.OPENAI_API_KEY,
};

const openai = new OpenAI(configuration);
var cron_jobs = [];
var cron_is_running = false;

AWS.config = new AWS.Config();
AWS.config.accessKeyId = secretConfig.AWS_ACCESS_KEY_ID;
AWS.config.secretAccessKey = secretConfig.AWS_SECRET_ACCESS_KEY;
AWS.config.region = "eu-north-1";

const Polly = new AWS.Polly();

async function getAuthorById(id) {
  var sql = "SELECT * FROM bots WHERE id = ?;";
  var params = [id];
  var result = await con2.query(sql, params);
  return result[0][0].author;
}

async function getBotById(id) {
  var sql = "SELECT * FROM bots WHERE id = ?;";
  var params = [id];
  var result = await con2.query(sql, params);
  return result[0][0];
}

async function createTextPost(bot_id, prompt) {
  console.log("Creating text post...");

  var author = await getAuthorById(bot_id);
  var bot = await getBotById(bot_id);

  var messages = [
    {role: "user", content: bot.initial_prompt},
    {role: "assistant", content: bot.initial_answer},
    {role: "user", content: prompt}
  ];

  var answer = await getAnswer(messages);

  var sql = "INSERT INTO posts (parent_id, bot_id, author, content, is_user) VALUES (0, ?, ?, ?, 0)";
  var params = [bot_id, author, answer];
  con.query(sql, params, function(err, result) {
    if (err) {
      console.log(err);
      return;
    }
    console.log("Post created successfully.");
  });
}

async function createImagePost(bot_id, prompt) {
  console.log("Creating images post...");

  var image = await openai.images.generate({
    prompt: prompt,
    n: 1,
    size: "512x512",
    response_format: 'url'
  });

  var url = image.data[0].url;
  var author = await getAuthorById(bot_id);
  var image_stamp = crypto.randomBytes(8).toString("hex");
  var image_path = "images/"+image_stamp+".png";

  downloadImage(url, image_path)
  .then(() => {
    console.log('Image downloaded successfully!');
    var sql = "INSERT INTO images (bot_id, author, filename) VALUES (?, ?, ?)";
    var params = [bot_id, author, image_stamp + '.png'];
    con.query(sql, params, function(err, result) {
      if (err) {
        console.log(err);
        return;
      }
      console.log("Image created successfully.");
    });
  })
  .catch((error) => {
    console.error('Error downloading the image:', error);
    res.json({status: "NOK", error: "Error downloading the image."});
  });
}

const downloadImage = async (imageUrl, outputPath) => {
  try {
    const response = await axios.get(imageUrl, { responseType: 'stream' });
    response.data.pipe(fs.createWriteStream(outputPath));

    return new Promise((resolve, reject) => {
      response.data.on('end', () => {
        resolve();
      });

      response.data.on('error', (err) => {
        reject(err);
      });
    });
  } catch (error) {
    throw new Error(`Error downloading the image: ${error}`);
  }
};

function loadCronJobs() {
  var sql = "SELECT * FROM scheduled_tasks";
  con.query(sql, function(err, result) {
    if (err) {
      console.log(err);
      return;
    }
    for (var i = 0; i < result.length; i++) {
      scheduleCronJob(result[i].type, result[i].bot_id, result[i].prompt, result[i].cron_string);
    }
  });
}

function scheduleCronJob(type, bot_id, prompt, cron_string) {
  console.log("Task is being scheduled.");
  var task = cron.schedule(cron_string, function() {
    console.log("Task is being executed.");
    if (cron_is_running == false) {
      cron_is_running = true;
      if (type == "text_post") {
        createTextPost(bot_id, prompt);
      }
      else if (type == "image_post") {
        createImagePost(bot_id, prompt);
      }
      else if (type == "email") {
        createEmail(bot_id, prompt);
      }
      else if (type == "us_news_post") {
        createUSNewsPost(bot_id, task.prompt);
      }
      else if (type == "pt_news_post") {
        createPTNewsPost(bot_id, task.prompt);
      }
      else if (type == "tech_news_post") {
        createTechNewsPost(bot_id, task.prompt);
      }
      setTimeout(function() {
        cron_is_running = false;
      }, 1000);
    }
    else {
      console.log("Task is already running.");
    }
  });
  cron_jobs.push(task);
}

async function doTaskNow(id) {
  var sql = "SELECT * FROM scheduled_tasks WHERE id = ?";
  var params = [id];
  var result = await con2.query(sql, params);
  var task = result[0][0];

  if (task.type == "text_post") {
    createTextPost(task.bot_id, task.prompt);
  }
  else if (task.type == "image_post") {
    createImagePost(task.bot_id, task.prompt);
  }
  else if (task.type == "email") {
    createEmail(task.bot_id, task.prompt);
  }
  else if (task.type == "us_news_post") {
    createUSNewsPost(task.bot_id, task.prompt);
  }
  else if (task.type == "pt_news_post") {
    createPTNewsPost(task.bot_id, task.prompt);
  }
  else if (task.type == "tech_news_post") {
    createTechNewsPost(task.bot_id, task.prompt);
  }
}

async function createUSNewsPost(bot_id, prompt) {
  var news = await getUSNews();
  var news_content = "";

  for (var i in news) {
    news_content += news[i].title + "\n\n";
  }

  var intro = "Here are the news: \n\n";
  prompt = intro + news_content + "\n\n" + prompt;

  var author = await getAuthorById(bot_id);
  var bot = await getBotById(bot_id);

  var messages = [
    {role: "user", content: bot.initial_prompt},
    {role: "assistant", content: bot.initial_answer},
    {role: "user", content: prompt}
  ];

  var answer = await getAnswer(messages);

  var sql = "INSERT INTO posts (parent_id, bot_id, author, content, is_user) VALUES (0, ?, ?, ?, 0)";
  var params = [bot_id, author, answer];
  con.query(sql, params, function(err, result) {
    if (err) {
      console.log(err);
      return;
    }
    console.log("Post created successfully.");
  });
}

async function createPTNewsPost(bot_id, prompt) {
  var news = await getPTNews();
  var news_content = "";

  for (var i in news) {
    news_content += news[i].title + "\n\n";
  }

  var intro = "Here are the news: \n\n";
  prompt = intro + news_content + "\n\n" + prompt;

  var author = await getAuthorById(bot_id);
  var bot = await getBotById(bot_id);

  var messages = [
    {role: "user", content: bot.initial_prompt},
    {role: "assistant", content: bot.initial_answer},
    {role: "user", content: prompt}
  ];

  var answer = await getAnswer(messages);

  var sql = "INSERT INTO posts (parent_id, bot_id, author, content, is_user) VALUES (0, ?, ?, ?, 0)";
  var params = [bot_id, author, answer];
  con.query(sql, params, function(err, result) {
    if (err) {
      console.log(err);
      return;
    }
    console.log("Post created successfully.");
  });
}

async function createTechNewsPost(bot_id, prompt) {
  var news = await getTechNews();
  var news_content = "";

  for (var i in news) {
    news_content += news[i].title + "\n\n";
  }

  var intro = "Here are the news: \n\n";
  prompt = intro + news_content + "\n\n" + prompt;

  var author = await getAuthorById(bot_id);
  var bot = await getBotById(bot_id);

  var messages = [
    {role: "user", content: bot.initial_prompt},
    {role: "assistant", content: bot.initial_answer},
    {role: "user", content: prompt}
  ];

  var answer = await getAnswer(messages);

  var sql = "INSERT INTO posts (parent_id, bot_id, author, content, is_user) VALUES (0, ?, ?, ?, 0)";
  var params = [bot_id, author, answer];
  con.query(sql, params, function(err, result) {
    if (err) {
      console.log(err);
      return;
    }
    console.log("Post created successfully.");
  });
}

async function getUSNews() {
  var news = await axios.get("https://newsapi.org/v2/top-headlines?country=us&apiKey=" + secretConfig.NEWSAPI_KEY);
  return news.data.articles;
}

async function getPTNews() {
  var news = await axios.get("https://newsapi.org/v2/top-headlines?country=pt&apiKey=" + secretConfig.NEWSAPI_KEY);
  return news.data.articles;
}

async function getTechNews() {
  var news = await axios.get("https://newsapi.org/v2/top-headlines?country=us&category=technology&apiKey=" + secretConfig.NEWSAPI_KEY);
  return news.data.articles;
}

loadCronJobs();

async function createEmail(bot_id, prompt) {

  var author = await getAuthorById(bot_id);
  var bot = await getBotById(bot_id);

  var messages = [
    {role: "user", content: bot.initial_prompt},
    {role: "assistant", content: bot.initial_answer},
    {role: "user", content: prompt}
  ];

  var answer = await getAnswer(messages);
  answer = answer.replace(/(?:\r\n|\r|\n)/g, '<br>');
  answer += "<br><br> by " + author;

  var sql = "INSERT INTO emails (bot_id, author, content) VALUES (?, ?, ?)";
  var params = [bot_id, author, answer];

  con.query(sql, params, function(err, result) {
    if (err) {
      console.log(err);
      return;
    }
    answer += "<br><br><a href='https://utopiagpt.paken.xyz/email/" + result.insertId + "'>Click here to view the email.</a>";
    sendEmail(answer);
  });


  
}

function stopAllCronJobs() {
  console.log("Stopping all cron jobs.");
  for (var i = 0; i < cron_jobs.length; i++) {
    cron_jobs[i].stop();
  }
  cron_jobs = [];
}

app.get("/api/get-audio", (req, res) => {
  if (!req.session.isLoggedIn) {
    res.json({status: "NOK", error: "Invalid Authorization."});
    return;
  }

  var id = req.query.id;

  res.sendFile(path.resolve(__dirname) + "/speech/"+id+".mp3");
});

app.get("/api/emails/get-audio", (req, res) => {
  if (!req.session.isLoggedIn) {
    res.json({status: "NOK", error: "Invalid Authorization."});
    return;
  }

  var id = req.query.id;

  res.sendFile(path.resolve(__dirname) + "/email-speech/"+id+".mp3");
});

app.get("/api/get-image", (req, res) => {
  if (!req.session.isLoggedIn) {
    res.json({status: "NOK", error: "Invalid Authorization."});
    return;
  }

  var filename = req.query.filename;

  res.sendFile(path.resolve(__dirname) + "/images/"+filename);
});

app.post("/api/do-task-now", (req, res) => {
  if (!req.session.isLoggedIn) {
    res.json({status: "NOK", error: "Invalid Authorization."});
    return;
  }

  var id = req.body.id;
  doTaskNow(id);
  res.json({status: "OK", data: "Task is being processed."});
});

app.get("/api/text-to-speech", (req, res) => {
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

function removeTags(str) { 
  if ((str===null) || (str==='')) 
      return false; 
  else
      str = str.toString(); 
  return str.replace( /(<([^>]+)>)/ig, ''); 
} 

app.get("/api/emails/text-to-speech", (req, res) => {
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

app.get("/api/get-email", (req, res) => {
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

app.get("/api/get-posts", (req, res) => {
  if (!req.session.isLoggedIn) {
    res.json({status: "NOK", error: "Invalid Authorization."});
    return;
  }

  var dt = req.query.dt;

  var sql = "SELECT * FROM posts WHERE DATE(created_at) = ? ORDER BY id DESC;";
  con.query(sql, [dt], function(err, result) {
    if (err) {
      console.log(err);
      res.json({status: "NOK", error: err.message});
      return;
    }
    res.json({status: "OK", data: result});
  });
});

app.get("/api/get-images", (req, res) => {
  if (!req.session.isLoggedIn) {
    res.json({status: "NOK", error: "Invalid Authorization."});
    return;
  }

  var dt = req.query.dt;

  var sql = "SELECT * FROM images WHERE DATE(created_at) = ? ORDER BY id DESC;";
  con.query(sql, [dt], function(err, result) {
    if (err) {
      console.log(err);
      res.json({status: "NOK", error: err.message});
      return;
    }
    res.json({status: "OK", data: result});
  });
});

app.get("/api/get-current-cron-jobs", (req, res) =>  {
  if (!req.session.isLoggedIn) {
    res.json({status: "NOK", error: "Invalid Authorization."});
    return;
  }

  res.json({status: "OK", data: "There are a total of " + cron_jobs.length + " cron jobs running."});
});


app.post("/api/create-scheduled-task", (req, res) => {
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

app.post("/api/check-login", (req, res) => {
  var user = req.body.user;
  var pass = req.body.pass;

  var sql = "SELECT * FROM logins WHERE is_valid = 0 AND created_at > (NOW() - INTERVAL 1 HOUR);";

  con.query(sql, function (err, result) {
    if (err) {
      console.log(err);
      res.json({status: "NOK", error: err.message});
      return;
    }
    console.log("x3");
    if (result.length <= 5) {
      if (user == secretConfig.USER && pass == secretConfig.PASS) {
        req.session.isLoggedIn = true;
        var sql2 = "INSERT INTO logins (is_valid) VALUES (1);";
        con.query(sql2, function(err2, result2) {
          if (err2) {
            console.log(err2);
            res.json({status: "NOK", error: err2.message});
            return;
          }
          res.json({status: "OK", data: "Login successful."});
        });
      }
      else {
        var sql2 = "INSERT INTO logins (is_valid) VALUES (0);";
        con.query(sql2, function(err2, result2) {
          if (err2) {
            console.log(err2);
            res.json({status: "NOK", error: err2.message});
            return;
          }
          res.json({status: "NOK", error: "Wrong username/password."});
        });
      }
    }
    else {
      res.json({status: "NOK", error: "Too many login attempts."});
    }
  });
  
  
});

async function getAnswer(messages) {
  const completion = await openai.chat.completions.create({
    model: "gpt-4",
    messages: messages,
  });
  console.log(completion.choices[0].message);
  var message = completion.choices[0].message;
  return message.content;
}

app.post("/api/create-bot", async (req, res) => {
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

app.get("/api/get-bots", (req, res) => {
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

app.get("/api/get-scheduled-tasks", (req, res) => {
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

app.post("/api/delete-scheduled-task", (req, res) => {
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

function sendEmail(text) {
  var transport = nodemailer.createTransport({
    host: secretConfig.SMTP_HOST,
    port: secretConfig.SMTP_PORT,
    auth: {
      user: secretConfig.SMTP_EMAIL,
      pass: secretConfig.SMTP_PASSWORD
    }
  });

  var mailOptions = {
    from: secretConfig.SMTP_EMAIL,
    to: secretConfig.RECIPIENT_EMAIL,
    subject: "Message From Utopia GPT",
    html: text
  };

  transport.sendMail(mailOptions, function(error, info){
    if (error) {
      console.log(error);
    } else {
      console.log('Email sent: ' + info.response);
    }
  }); 
}

app.get('/', (req, res) => {
  if(req.session.isLoggedIn) {
    res.redirect('/home');
  }
  else {
    res.redirect('/login');
  }
});

app.use(express.static(path.resolve(__dirname) + '/frontend/build'));

app.get('/login', (req, res) => {
  res.sendFile(path.resolve(__dirname) + '/frontend/build/index.html');
});

app.get('/home', (req, res) => {
  if(req.session.isLoggedIn) {
    res.sendFile(path.resolve(__dirname) + '/frontend/build/index.html');
  }
  else {
    res.redirect('/login');
  }
});

app.get('/create-bot', (req, res) => {
  if(req.session.isLoggedIn) {
    res.sendFile(path.resolve(__dirname) + '/frontend/build/index.html');
  }
  else {
    res.redirect('/login');
  }
});

app.get('/scheduled-tasks', (req, res) => {
  if(req.session.isLoggedIn) {
    res.sendFile(path.resolve(__dirname) + '/frontend/build/index.html');
  }
  else {
    res.redirect('/login');
  }
});

app.get('/email/:id', (req, res) => {
  if(req.session.isLoggedIn) {
    res.sendFile(path.resolve(__dirname) + '/frontend/build/index.html');
  }
  else {
    res.redirect('/login');
  }
});

// catch 404 and forward to error handler
app.use(function(req, res, next) {
  next(createError(404));
});

// error handler
app.use(function(err, req, res, next) {
  // set locals, only providing error in development
  res.locals.message = err.message;
  res.locals.error = req.app.get('env') === 'development' ? err : {};

  // render the error page
  res.status(err.status || 500);
  res.render('error');
});

module.exports = app;
