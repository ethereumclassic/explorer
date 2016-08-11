var http = require('http');
var etherUnits = require(__lib + "etherUnits.js")

module.exports = function(req, res) {
  var addr = req.body.addr;
  if (typeof addr !== "undefined")
    addr = addr.toLowerCase();
  else 
    res.sendStatus(400);

  var options = {
    host: 'api.blockcypher.com',
    port: '80',
    path: '/v1/eth/main/addrs/' + addr + '/balance',
    method: 'GET'
  };

  var balance = 0;
  http.request(options, function(bcRes) {
    bcRes.on('data', function (data) {
      try {
        balance = JSON.parse(data).balance;
        balance = etherUnits.toEther( balance, "wei");
      } catch (e) {
        console.error("BC err, probably invalid addr");
      }
      res.write(JSON.stringify({"balance": balance}));
      res.end();
    })
  }).end();

}

