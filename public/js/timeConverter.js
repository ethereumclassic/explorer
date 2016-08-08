/*
  Convert milliseconds to something that doesn't suck
*/
var getDuration = function(timestamp){
    var millis = Date.now() - timestamp*1000;
    var dur = [];
    var units = [
        {label:"millis",    mod:1000},
        {label:"seconds",   mod:60},
        {label:"mins",   mod:60},
        {label:"hours",     mod:24},
        {label:"days",      mod:31}
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