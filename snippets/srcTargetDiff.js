/**
 * Created by z001hmj on 2/26/16.
 */
    "use strict"
var _ = require('underscore');
var config = require('../config');
var recursive = require('recursive-readdir');
var utils = require('../utils');
var path = require('path');
var fs = require('fs');

config.dbfile = utils.getUniqueDBFileName(config);

var DB = require('../db');

var log = console.log;
var l = log;

var db = new DB(config.dbfile, dbLoaded);
l(config.dbfile)
function dbLoaded(){
    db.keys(function(sourceFilePaths){
        if(sourceFilePaths.length){
            recursive(config.lookUpFolder, function (err, files) {
                // Files is an array of filenames
                if(err){
                    log("scan look up directory", config.lookUpFolder, "failed with error", err);
                }else{
                    var filesData = getDiff(sourceFilePaths, files);
                    var targetFilestoDelete = new Set();;
                    for(let fileSrc in filesData){
                        let targetFiles = filesData[fileSrc];
                        for(let targetFile of targetFiles){
                            targetFilestoDelete.add(targetFile);
                        }
                    }
                    delFiles(targetFilestoDelete);
                }
            });
        }else{
            l("DB empty");
        }
    });
}

function getDiff(sourceFilePaths, allFiles){
    var obj = {};
    var missingSourceFiles =  _.difference(sourceFilePaths, allFiles);
    for(var srcFile of missingSourceFiles){
        var fileRec = db.get(srcFile);
        obj[srcFile] = fileRec.targets;
        /*if(fileRec)
            l(srcFile, "\n", fileRec.targets)*/
    }
    return obj;
}

function delFiles(targetFilesToDelete){
    for(let file of targetFilesToDelete){
        //fs.unlinkSync(file);
        let dir = path.dirname(file);
        if((dir, fs.readdirSync(dir).length) == 0){
            l("DELETE folder", dir);
        }
    }
}