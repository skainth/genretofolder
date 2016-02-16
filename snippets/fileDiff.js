/**
 * Created by z001hmj on 2/16/16.
 */
//List files which are not in source but in target

var config = require('../config');

var fsextra = require('fs-extra');
var recursive = require('recursive-readdir');
var fs = require('fs');
var _ = require('underscore');

var items = [];
fsextra.walk(config.lookUpFolder)
    .on('data', function (item) {

        items.push(item.path)
    })
    .on('end', function () {
        //console.dir(items) // => [ ... array of files]
        console.log(items.length);
        recursive(config.lookUpFolder, function (err, files) {
            // Files is an array of filenames
            if(err){
                log("scan look up directory", config.lookUpFolder, "failed with error", err);
            }else{
                console.log("RECUR", files.length);
                console.log(_.difference(items, files));
            }
        });
    });

