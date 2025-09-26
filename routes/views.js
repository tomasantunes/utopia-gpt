var express = require('express');
var router = express.Router();
var path = require('path');

router.get('/login', (req, res) => {
  res.sendFile(path.join(__dirname, '../frontend/dist/index.html'));
});

router.get('/home', (req, res) => {
  if(req.session.isLoggedIn) {
    res.sendFile(path.join(__dirname, '../frontend/dist/index.html'));
  }
  else {
    res.redirect('/login');
  }
});

router.get('/create-bot', (req, res) => {
  if(req.session.isLoggedIn) {
    res.sendFile(path.join(__dirname, '../frontend/dist/index.html'));
  }
  else {
    res.redirect('/login');
  }
});

router.get('/scheduled-tasks', (req, res) => {
  if(req.session.isLoggedIn) {
    res.sendFile(path.join(__dirname, '../frontend/dist/index.html'));
  }
  else {
    res.redirect('/login');
  }
});

router.get('/email/:id', (req, res) => {
  if(req.session.isLoggedIn) {
    res.sendFile(path.join(__dirname, '../frontend/dist/index.html'));
  }
  else {
    res.redirect('/login');
  }
});

module.exports = router;