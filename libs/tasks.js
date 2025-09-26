var {getOpenAI} = require('./openai');
var {getMySQLConnections} = require('./database');
var {getAuthorById, getBotById} = require('./bots');
var {downloadImage} = require('./download');
var cron = require('node-cron');
var crypto = require('crypto');

var { con, con2 } = getMySQLConnections();
var cron_jobs = [];
var cron_is_running = false;

var openai = getOpenAI();

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

module.exports = {
    createTextPost,
    createImagePost,
    scheduleCronJob,
    doTaskNow,
    loadCronJobs,
    stopAllCronJobs,
    default: {
      createTextPost,
      createImagePost,
      scheduleCronJob,
      doTaskNow,
      loadCronJobs,
      stopAllCronJobs
    }
};