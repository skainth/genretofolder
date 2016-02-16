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

var Stats = require('./stats');
var myStats = new Stats(["filesToDelete", "updated", "new", "filesWithError"]);
var log = console.log;

optimist = require('optimist')

// set the overrides
prompt.override = optimist.argv;

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
        //stats.filesWithError.push({file: data.file, errorMsg: err.message});
        myStats.add("filesWithError", data.file);

    }else{
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
function moveFilesToProperFolders(masterData) {
    db.keys(checkFileMismatch);
}
function doneProcessing() {
    db.persist(function () {
        showStats();
        //Copy database file to output folder
        fs_extra.copy(config.dbfile, config.targetFolder + "/" + config.dbfile);
    });
}
function showStats(){
    log("I'm Done!\nStats");
    Object.keys(myStats.getAll()).forEach(function(label){
        var stats = myStats.get(label)
        log(label, stats.length);
        if(stats.length){
            if(stats.length > config.maxLog){
                log(stats.splice(0, config.maxLog), "and more...");
            }else
                log(stats)
        }
    });
}
function checkFileMismatch(srcFilePaths){
    var filesToDelete = [];
    var sourceFilesNotAvailable = _.difference(srcFilePaths, allFiles);
    sourceFilesNotAvailable.forEach(function(srcFile){
        filesToDelete = filesToDelete.concat(db.get(srcFile).files)
    });
    if(filesToDelete.length)
        myStats.add("filesToDelete", filesToDelete);
    if(filesToDelete.length > 0){
        log("Files to Delete", filesToDelete.length);
        log(filesToDelete)
        prompt.get([{name: 'delNonExistentFiles', description: "Delete non-existent files? (YesSssSsS/n)"}],
            function(err, result){
                if(result.delNonExistentFiles == "YesSssSsS") {
                    fsutils.deleteFiles(filesToDelete, function(){
                        db.delKeysSync(sourceFilesNotAvailable);
                        doneProcessing();
                   })
               }else{
                    doneProcessing();
               }
            });
    }else{
        doneProcessing()
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
    var newFullPath = fsutils.getPathForFile(newPathToFolder, filePath);;
    fs_extra.ensureDirSync(newPathToFolder);
    doFileCopy(filePath, fileInfo, newFullPath);
}

function isUpdated(filePath, fileInfo){
    var fileRecord = db.get(filePath);
    if(fileRecord){
        return fileRecord.fileInfo.mtime != fileInfo.mtime;
    }else
        return false;
}
function doFileCopy(sourceFilePath, fileInfo, newFullPath){
    var fileRecord = db.get(sourceFilePath);
    if(fileRecord){
        if(isUpdated(sourceFilePath, fileInfo)){            // Updated
            myStats.add("updated", sourceFilePath);
            //stats.updated.push({filePath: sourceFilePath, fileInfoMTime: fileInfo.mtime, fileRecordMTime: fileRecord.mtime});
            fs_extra.copySync(sourceFilePath, newFullPath); // Copy it
        }else{
            myStats.add("unmodified", sourceFilePath);
        }
    }else{                                                  // New file
        var key = sourceFilePath;
        var value = {fileInfo: {mtime: fileInfo.mtime}, files: [newFullPath]};
        db.save(key, value);
        fileRecord = db.get(key);
        myStats.add("newFiles", sourceFilePath);
        fs_extra.copySync(sourceFilePath, newFullPath);     // Copy it
    }
    if(fileRecord.files.indexOf(newFullPath) == -1){        // Update fileRecord
        fileRecord.files.push(newFullPath);
    }
}
function saveFileInfoToDb(filePath, fileInfo, newFullPath){
    db.save(filePath, {mtime: fileInfo.mtime, size: fileInfo.size}, newFullPath);
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

log("DB file:\t", config.dbfile);
log("Source:\t\t", config.lookUpFolder);
log("Target:\t\t", config.targetFolder);
db = new DB(config.dbfile, function(){
    if(config.clearTargetFolder) {
        prompt.start();
        prompt.get(
            [{name: "clearTarget",
                "description": "Really clear target folder? (YeSsSsS/n)"}],
            function (err, result) {
                if (result.clearTarget == "YeSsSsS"){
                    log("CLEARING", config.targetFolder);
                    fsutils.deleteFolderRecursive(config.targetFolder);
                    db.clear();
                    db.persist(function(){
                        log("CLEARED", config.targetFolder);
                    });
                }else{
                    log("Target folder " + config.targetFolder + " will NOT be cleared")
                }
                startProcessing();
            });
    }else{
        startProcessing();
    }
});
