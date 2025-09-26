var express = require('express');
var router = express.Router();
var {getMySQLConnections} = require('../libs/database');

var {con} = getMySQLConnections();

router.get("/api/get-posts", (req, res) => {
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

router.get("/api/get-images", (req, res) => {
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

module.exports = router;