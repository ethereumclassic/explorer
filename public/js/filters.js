var getDifficulty = function(hashes) {
  /*
    borrowed from https://github.com/cubedro/eth-netstats :D
  */

  var result = 0;
  var unit = '';

  if(hashes !== 0 && hashes < 1000) {
    result = hashes;
    unit = '';
  }

  if(hashes >= 1000 && hashes < Math.pow(1000, 2)) {
    result = hashes / 1000;
    unit = 'K';
  }

  if(hashes >= Math.pow(1000, 2) && hashes < Math.pow(1000, 3)) {
    result = hashes / Math.pow(1000, 2);
    unit = 'M';
  }

  if(hashes >= Math.pow(1000, 3) && hashes < Math.pow(1000, 4)) {
    result = hashes / Math.pow(1000, 3);
    unit = 'G';
  }

  if(hashes >= Math.pow(1000, 4) ) {
    result = hashes / Math.pow(1000, 4);
    unit = 'T';
  }
  return result.toFixed(2) + ' ' + unit + 'H';
}

/*
  Convert unix timestamp to something that doesn't suck
*/
var getDuration = function(timestamp){
    var millis = Date.now() - timestamp*1000;
    var dur = [];
    var units = [
        {label:"millis",    mod:1000},
        {label:"seconds",   mod:60},
        {label:"mins",   mod:60},
        {label:"hours",     mod:24},
        {label:"days",      mod:365},
        {label:"years",      mod:1000}
    ];
    // calculate the individual unit values
    units.forEach(function(u){
        var val = millis % u.mod;
        millis = (millis - val) / u.mod;
        if (u.label == "millis")
            return;
        if (val > 0)
            dur.push({"label": u.label, "val": val});
    });
    // convert object to string representation
    dur.toString = function(){
        return dur.reverse().slice(0,2).map(function(d){
            return d.val + " " + (d.val==1?d.label.slice(0,-1):d.label);
        }).join(', ');
    };
    return dur;
};