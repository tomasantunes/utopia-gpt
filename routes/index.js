var express = require('express');
var router = express.Router();

router.get('/', (req, res) => {
  if(req.session.isLoggedIn) {
    res.redirect('/home');
  }
  else {
    res.redirect('/login');
  }
});

module.exports = router;
