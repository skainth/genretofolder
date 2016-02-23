/**
 * Created by z001hmj on 2/16/16.
 */
//Check if the count(keys) in DB == count of all data[key].files

var recursive = require('recursive-readdir');
var config = require('../config')
var data = require("../" + config.dbfile);

var sourceFiles = Object.keys(data);
var uniqueTargetFiles = [];

for(src in data){
    var files = data[src].files;
    if(files.length == 0)
        console.log(src, "has no target file");
    files.forEach(function(filePath){
        var file = extractFileName(filePath)
        if(uniqueTargetFiles.indexOf(file) == -1){
            uniqueTargetFiles.push(file);
        }else{
            //console.log(file, "already exists")
        }
    });
}

function extractFileName(filePath){
    var tokens = filePath.split('/');
    return tokens[tokens.length - 1];
}
//console.log("uniqueTargetFiles", uniqueTargetFiles.length)

console.log("Total source files", sourceFiles.length);