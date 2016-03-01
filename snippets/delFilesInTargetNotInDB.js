/**
 * Created by z001hmj on 3/1/16.
 */

"use strict"

var _ = require('underscore');
var recursive = require('recursive-readdir');
var config = require('../config');
var utils = require('../utils');
var fsutils = require('../fsutils');
var DB = new require('../DB');

var l = console.log;

var dbFileName = utils.getUniqueDBFileName(config);

var targets = [];

var db = new DB(dbFileName, function(){
    db.keys(function(sourceFiles){
        for(let srcFile of sourceFiles){
            targets = _.union(targets, db.get(srcFile).targets);
        }
        l(targets);
        recursive(config.targetFolder, function (err, physicalTargetFiles) {
            if(err){
                l(err)
            }else{
                l("Files which are not in DB but present on disk");
                let filesNotInDBButOnDisk = _.difference(physicalTargetFiles, targets);
                l(filesNotInDBButOnDisk);
                fsutils.delFilesSync(filesNotInDBButOnDisk);
            }
        });
    })
});

