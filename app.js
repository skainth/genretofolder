// Program to arrange mp3/wma file based upon their genre(s)

var _ = require('underscore');
var recursive = require('recursive-readdir');
var fs_extra = require('fs-extra');
var mkdirp = require('mkdirp');
var fs = require('fs');
var prompt = require('prompt');

var fsutils = require('./fsutils');
var processor = require('./Processor');
var DB = require('./db');
var config = require('./config');
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

var allFiles = [], db = null;

function startProcessing(){
    log("Processing started");
    db = new DB(config.dbfile, function(){
        // Get all files in the source folder
        recursive(config.lookUpFolder, function (err, files) {
            // Files is an array of filenames
            if(err){
                log("scan look up directory", config.lookUpFolder, "failed with error", err);
            }else{
                allFiles = files;
                handleFile(0);
            }
        });
    });
}
//Files/Directories to be ignored
function ignore(file){
    if(config.ignoredFolders) {
        for (var index = 0; index < config.ignoredFolders.length; index++) {
            var folderName = config.ignoredFolders[index].toLowerCase();
            if (file.toLowerCase().indexOf(folderName) > -1) {
                return true;
            }
        }
    }
    if(file.toLowerCase().indexOf('wma') > -1)
        return false;
    return !(file.toLowerCase().indexOf('mp3') > -1);
}

// Get the file to be processed and check if it is not be ignored
function handleFile(atIndex){
    var file = allFiles[atIndex];
    if(!file){ // no more files
        log("No more files to process");
        moveFilesToProperFolders(masterData);
        return;
    }
    if(ignore(file)){
        handleFile(atIndex + 1);
    }else{
        processor.process(file, onDataExtracted.bind({index: atIndex}))
    }
}

// Callback to handle data received from id3 handler lib
function onDataExtracted(err, data){
    if(err){	// Some error processing last file
        log("Error processing file", data.file, err);
    }else{
        //log(Date.parse(data.mtime));
        processFileData(data);
    }
    // process next file
    handleFile(this.index + 1);
}

// Process data actually
function processFileData(data){
    var file = data.file;
    var fileInfo = _.extend({file: data.file, metaData: {}}, data);
    config.metaDataAttrs.forEach(function(metaDataAttr){
        var metaDataObject = data.metadata[metaDataAttr.name];
        try {
            if(Array.isArray(metaDataObject)) {
                metaDataObject.forEach(function (metaData) {
                    parseMetaData(file, metaData, metaDataAttr, fileInfo);
                });
            } else {
                parseMetaData(file, metaDataObject, metaDataAttr, fileInfo);
            }
        }catch(e){
            log("EXCEPTION", e, metaDataAttr);
            throw e
        }
    });
    moveFiletoBuckets(fileInfo);
}
function moveFiletoBuckets(fileInfo){
    for(var index = 0; index < config.metaDataAttrs.length; index ++){
        var configMetaData = config.metaDataAttrs[index];
        if(fileInfo.metaData[configMetaData.name]){
            if(!masterData[configMetaData.name])
                masterData[configMetaData.name] = [];
            //masterData[configMetaData.name] =
            fileInfo.metaData[configMetaData.name].forEach(function(data){
                if(!masterData[configMetaData.name][data])
                    masterData[configMetaData.name][data] = [];
                masterData[configMetaData.name][data].push(fileInfo.file);
            })
        }
    }
    //if(fileInfo.metaData[config.metaDataAttrs])
}
function moveFilesToProperFolders(masterData){
    //log(masterData);
    //db.show();
    db.persist(function(err){
        if(err){
            log("Error saving", config.dbfile);
        }
        db.keys(checkFileMismatch, doneProcessing);
    });
}
function doneProcessing(){
    log("I'm Done!");
}
function checkFileMismatch(srcFilePaths, cb){
    var self = this;
    self.cb = cb;
    var filesToDelete = [];
    var sourceFilesNotAvailable = _.difference(srcFilePaths, allFiles);
    sourceFilesNotAvailable.forEach(function(srcFile){
        filesToDelete = filesToDelete.concat(db.get(srcFile).files)
    });
    if(filesToDelete.length > 0){
        log("Files to Delete");
        log(filesToDelete);
        prompt.get([{name: 'delNonExistentFiles', description: "Delete non-existent files? (YesSssSsS/n)"}],
            function(err, result){
                log("Self.cb", this.cb)
                if(result.delNonExistentFiles == "YesSssSsS") {
                    fsutils.deleteFiles(filesToDelete, function(){
                       log("HERE", this.cb);
                       db.delKeysSync(sourceFilesNotAvailable);
                        doneProcessing();
                       self.cb && self.cb();
               })
               }else{
                   cb && cb();
               }
            }.bind(self));
    }
}
function parseMetaData(file, metaData, metaDataAttr, fileInfo){
    metaData = metaData.trim();
    var processedFile = false;
    if(metaDataAttr.splitters) {
        metaDataAttr.splitters.forEach(function (splitter) {
            if (metaData.indexOf(splitter) > -1) {
                var metaDataSplit = metaData.split(splitter);
                metaDataSplit.forEach(function (mData) {
                    mData = mData.trim();
                    saveFileData(file, mData, metaDataAttr.name, fileInfo);
                    processedFile = true;
                });
            }
        });
        if (!processedFile)
            saveFileData(file, metaData, metaDataAttr.name, fileInfo);
    }else{
        saveFileData(file, metaData, metaDataAttr.name, fileInfo);
    }
}

// Save file to path based upon its genre
function saveFileData(file, metaData, metaDataAttrName, fileInfo){
    if(!fileInfo.metaData[metaDataAttrName])
        fileInfo.metaData[metaDataAttrName] = [];
    fileInfo.metaData[metaDataAttrName].push(metaData);

  /*  var masterDataForPrimary = null;
    switch(metaDataAttrName){
        if() 'genre':{
            if(!masterData[metaDataAttrName])
                masterData[metaDataAttrName] = [];
            masterDataForPrimary = masterData[metaDataAttrName];
            break;
        }
        case 'artist':{
        }
    }*/
    if(metaDataAttrName == "genre") {
        if (!masterData[metaData])
            masterData[metaData] = [];
        copyToFolder(file, fileInfo, metaData);
    }
}

// Copy file to folder depending upon the file's genre
function copyToFolder(filePath, fileInfo, genre){
    var newPathToFolder = getFolderForGenre(genre);;
    var newFullPath = getPathForFile(newPathToFolder, filePath);;

    if(fs.exists(newPathToFolder)){
        doFileCopy(filePath, fileInfo, newFullPath);
    }else{
        mkdirp(newPathToFolder, function(err){
            if(!err) {
                doFileCopy(filePath, fileInfo, newFullPath);
            }
            else
                log(err, newFullPath);
        })
    }
}

function doFileCopy(filePath, fileInfo, newFullPath){
    //log(filePath, "TO", newFullPath, fileInfo.atime, fileInfo.mtime);

    var fileRecord = db.get(filePath);
    if(fileRecord){
        //log("FOUND", filePath);
        if(fileRecord.fileInfo.mtime != fileInfo.mtime) {
            log("UPDATED", filePath, fileRecord.fileInfo.mtime, fileInfo.mtime, fileRecord.fileInfo.mtime != fileInfo.mtime);
            db.save(filePath, {atime: fileInfo.atime, mtime: fileInfo.mtime, size: fileInfo.size}, newFullPath);
            fs_extra.copySync(filePath, newFullPath)
        }
        else {
            //log("NOT UPDATED", filePath);
        }
    }else{
        log("NEW", filePath)
        db.save(filePath, {atime: fileInfo.atime, mtime: fileInfo.mtime, size: fileInfo.size}, newFullPath);
        fs_extra.copySync(filePath, newFullPath)
    }
    //fs_extra.copySync(filePath, newFullPath)
}

function getFolderForGenre(genre){
    genre = genre.trim();
    var newPathToFolder = "";
    if(!config.genreToFolder[genre]){
        newPathToFolder = config.targetFolder + "/" +  config.genreToFolder["Others"] + "/" + genre;
    }
    else
        newPathToFolder = config.targetFolder + "/" +  config.genreToFolder[genre];
    return newPathToFolder;
}

function getPathForFile(newPathToFolder, filePath){
    var pathTokens = filePath.split('/');
    var fileName = pathTokens[pathTokens.length - 1];
    var newFullPath = newPathToFolder + "/" + fileName;
    return newFullPath;
}

function deleteFolderRecursive(path) {
    if( fs.existsSync(path) ) {
        fs.readdirSync(path).forEach(function(file,index){
            var curPath = path + "/" + file;
            if(fs.lstatSync(curPath).isDirectory()) { // recurse
                deleteFolderRecursive(curPath);
            } else { // delete file
                fs.unlinkSync(curPath);
            }
        });
        fs.rmdirSync(path);
    }
};


if(config.clearTargetFolder) {
    prompt.start();
    prompt.get(
        [
            {name: "clearTarget",
                "description": "Really clear target folder? (YeSsSsS/n)"}
        ],
        function (err, result) {
            if (result.clearTarget == "YeSsSsS"){
                log("CLEARING", config.targetFolder);
                deleteFolderRecursive(config.targetFolder);
                log("CLEARED", config.targetFolder);
            }else{
                log("Target folder " + config.targetFolder + " will NOT be cleared")
            }
            startProcessing();
        });
}else{
    startProcessing();
}