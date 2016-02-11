/**
 * Created by z001hmj on 2/10/16.
 */

var _ = require('underscore');
var processor = require('../Processor');

var DB = require('../db');

var recursive = require('recursive-readdir');
var fs_extra = require('fs-extra');
var mkdirp = require('mkdirp');
var fs = require('fs');
var config = require('../config');
/*
 var loki = require('loki');
 var lokidb = new loki(config.dbfile);
 var children = lokidb.addCollection("music");
 */


var log = console.log;

/*process.on('uncaughtException', function (error) {
 log(error.stack);
 });*/

String.prototype.toProperCase = function () {
    return this.replace(/\w\S*/g, function(txt){return txt.charAt(0).toUpperCase() + txt.substr(1).toLowerCase();});
};


var masterData = [];

// Clean up target folder. TODO: Ask for confirmation
//deleteFolderRecursive(config.targetFolder);

var allFiles = [];

var db = new DB('data.json', function(){
    // Get all files in the source folder
    recursive(config.lookUpFolder, function (err, files) {
        // Files is an array of filenames
        if(err){
            log("scan look up directory", config.lookUpFolder, "failed with error", err);
        }else{
            allFiles = files;
            db.keys(function(allKeys){

            })
        }
    });
});