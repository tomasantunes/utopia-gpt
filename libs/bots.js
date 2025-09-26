var {getMySQLConnections} = require('./database');

var { con, con2 } = getMySQLConnections();

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

module.exports = {
    getAuthorById,
    getBotById,
    default: {
        getAuthorById,
        getBotById
    }
};