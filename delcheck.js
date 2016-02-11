/**
 * Created by z001hmj on 2/11/16.
 */
var fs = require('fs');

var fsutils =  require('./fsutils');
file = '/Users/z001hmj/out/Muzik/Others/Hindi/Mr-Jatt.com/temp.js';


fs.writeFile(file, "Hey there!", function(err) {
    if(err) {
        return console.log(err);
    }

    console.log("The file was saved!");
    /*fsutils.deleteFiles([file], function(){
        console.log("CB called");
    })*/
});

