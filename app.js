// Program to arrange mp3/wma file based upon their genre(s)

"use strict"

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
var utils = require('./utils');

var Stats = require('./stats');
var myStats = new Stats(["filesToDelete", "updated", "new", "filesWithError"]);
var log = console.log;
var l = log;

var minimist = require('minimist')

// set the overrides
prompt.override = minimist(process.argv.slice(2));

String.prototype.toProperCase = function () {
    return this.replace(/\w\S*/g, function(txt){return txt.charAt(0).toUpperCase() + txt.substr(1).toLowerCase();});
};

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
            db.keys(function(sourceFilePaths){
                if(sourceFilePaths.length){
                    var filesData = getDiff(sourceFilePaths, files);
                    var targetFilestoDelete = new Set();
                    for(let fileSrc in filesData){
                        let targetFiles = filesData[fileSrc];
                        db.remove(fileSrc);
                        for(let targetFile of targetFiles){
                            targetFilestoDelete.add(targetFile);
                        }
                        db.persist();
                    }
                    l("Files to delete from target", targetFilestoDelete);
                    fsutils.delFilesSync(targetFilestoDelete)
                }
                handleFile(0);
            });
        }
    });
}
function getDiff(sourceFilePaths, allFiles){
    var obj = {};
    var missingSourceFiles =  _.difference(sourceFilePaths, allFiles);
    for(var srcFile of missingSourceFiles){
        var fileRec = db.get(srcFile);
        obj[srcFile] = fileRec.targets;
    }
    return obj;
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
        moveFilesToProperFolders(dataStore);
        db.persist(function(){
            l("DB Saved");
            doneProcessing();
        });
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
    //var fileInfo = _.extend({file: data.file, metaData: {ctime: data.ctime, mtime: data.mtime}}, {});
    config.metaDataAttrs.forEach(function(metaDataAttr){
        var metaDataObject = data.metadata[metaDataAttr.name];

            if(Array.isArray(metaDataObject)) {
                metaDataObject.forEach(function (metaData) {
                    parseMetaData(file, metaData, metaDataAttr, fileInfo);
                });
            } else {
                parseMetaData(file, metaDataObject, metaDataAttr, fileInfo);
            }

    });
    moveFiletoBuckets(fileInfo);
}

var masterData = {};
for(var index = 0; index < config.metaDataAttrs.length; index ++){
    var configMetaData = config.metaDataAttrs[index];
    var attrName = configMetaData.name;
    if(!masterData[attrName]){
        masterData[attrName] = {};
    }
}
var dataStore = {};
function moveFiletoBuckets(fileInfo){
    if(!dataStore[fileInfo.file]){
        dataStore[fileInfo.file] = {src: fileInfo.file, targets: []}
    }
    var fileObj = dataStore[fileInfo.file];
    for(var index = 0; index < config.metaDataAttrs.length; index ++) {
        var configMetaData = config.metaDataAttrs[index];
        var attrName = configMetaData.name;
        var attrValues = masterData[attrName];

        if(fileInfo.metaData[attrName]) {
            fileObj[attrName] = fileInfo.metaData[attrName];
        }
        fileObj.mtime = fileInfo.mtime;
    }
}

function moveFiletoBucketsOLD(fileInfo){
    for(var index = 0; index < config.metaDataAttrs.length; index ++){
        var configMetaData = config.metaDataAttrs[index];
        var attrName = configMetaData.name;
        var attrValues = masterData[attrName];

        try {
            if(fileInfo.metaData[attrName]) {
                for(var attrIndex = 0; attrIndex < fileInfo.metaData[attrName].length; attrIndex ++){
                    var data = fileInfo.metaData[attrName][attrIndex];
                    if (!attrValues[data]) {
                        attrValues[data] = {files: {}};
                    }
                    if (!attrValues[data].files[fileInfo.file]) {
                        attrValues[data].files[fileInfo.file] = fileInfo;
                    }
                }
            }
        }catch(e){
            log("EX", e, attrName, fileInfo.file);
        }
    }
}
function doneProcessing() {
    db.persist(function () {
        //utils.showStats();
        log("config.dbfile", config.dbfile)
        //Copy database file to output folder
        fs_extra.copy(config.dbfile, config.targetFolder + "/" + config.dbfile);
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
function parseMetaData(file, metaData, metaDataAttr, fInfo){
    var fileInfo = fInfo;
    metaData = metaData.trim();
    var processedFile = false;
    if(metaDataAttr.splitters) {
        metaDataAttr.splitters.forEach(function (splitter) {
            if (metaData.indexOf(splitter) > -1) {
                var metaDataSplit = metaData.split(splitter);
                metaDataSplit.forEach(function (mData) {
                    mData = mData.trim();
                    if(metaDataAttr.ignore && metaDataAttr.ignore.indexOf(mData)!= -1){
                        //log("IGNORE", mData, metaDataAttr, file);
                        return;
                    }
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
        if (!fileInfo.metaData[metaDataAttrName])
            fileInfo.metaData[metaDataAttrName] = [];
        fileInfo.metaData[metaDataAttrName].push(metaData);
}

// Copy file to folder depending upon the file's genre
function copyToFolder(filePath, fileInfo, genre, config){
    var newPathToFolder = utils.getFolderForGenre(genre, config);
    var newFullPath = fsutils.getPathForFile(newPathToFolder, filePath);;
    log(filePath, genre, newFullPath)
    try{
        fs_extra.ensureDirSync(newPathToFolder);
    }catch(e){
        log("Error ensureDirSync", e);
        exit(-1)
    }
    doFileCopy(filePath, fileInfo, newFullPath);
}

function isUpdated(filePath, fileInfo){
    var fileRecord = db.get(filePath);
    if(fileRecord){
        return fileRecord.fileInfo.mtime != fileInfo.mtime;
    }else
        return false;
}
function isFileUpdated(fileRec, currentFileDetails){
    return (fileRec.fileInfo.mtime != currentFileDetails.mtime)
}
function copyFiles(src, targets){
    // Copy files
    //1. Ensure file
    //fs_extra.ensure
    //2. Copy file
    // Save in DB
    targets.forEach(function(targetFile){
        try{
            fs_extra.copySync(src, targetFile);
        }catch(e){
            log("error copying", e, targetFile);
        }
    })
}
function doFileCopy(sourceFilePath, fileInfo, newFullPath){
    var fileRecord = db.get(sourceFilePath);
    if(fileRecord){
        if(isUpdated(sourceFilePath, fileInfo)){            // Updated
            myStats.add("updated", sourceFilePath);
            //stats.updated.push({filePath: sourceFilePath, fileInfoMTime: fileInfo.mtime, fileRecordMTime: fileRecord.mtime});
            fs_extra.copySync(sourceFilePath, newFullPath); // Copy it
            fileRecord.fileInfo.mtime = fileInfo.mtime;
            db.save(sourceFilePath, fileRecord);            // Update DB
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

config.dbfile = utils.getUniqueDBFileName(config);

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

function setTargetsForSourceFile(dataStore, genre, sourceFile){
    var newPathToFolder = utils.getFolderForGenre(genre, config);
    var newFullPath = fsutils.getPathForFile(newPathToFolder, sourceFile);
    //log(newFullPath)
    if(dataStore[sourceFile].targets.indexOf(newFullPath) == -1)
        dataStore[sourceFile].targets.push(newFullPath);
}
function moveFilesToProperFolders(dataStore) {
    //Set target files
    for(var sourceFile in dataStore){
        if(dataStore[sourceFile].genre){
            dataStore[sourceFile].genre.forEach(function(genre){
                setTargetsForSourceFile(dataStore, genre, sourceFile);
            });
        }else{
            setTargetsForSourceFile(dataStore, '', sourceFile);
        }
    }

    // Copy the files/Update DB
    for(var sourceFile in dataStore){
        var currentFileDetails = dataStore[sourceFile]
        var fileRec = db.get(sourceFile);
        if(fileRec){
            if(isFileUpdated(fileRec, currentFileDetails)){
                l("UPDATED", sourceFile);
                //l("UPDATED", sourceFile, fileRec.fileInfo.mtime, currentFileDetails.mtime, "FILEREC", fileRec, "currentFileDetails", currentFileDetails);
                // Update mtime, targets
                fileRec.fileInfo.mtime = currentFileDetails.mtime;

                //Delete old targets
                try {
                  fsutils.delFilesSync(currentFileDetails.targets);
                }catch(excp){
                  log("exp deleting old files", excp);
                }

                // Update with new targets
                fileRec.targets = currentFileDetails.targets;

                copyFiles(sourceFile, currentFileDetails.targets);
                db.save(sourceFile, fileRec);

                //TODO: Delete files which are no longer required in target
            }else{
                //l("SAME");
                myStats.add("unmodified", sourceFile);
            }
        }else{
            var key = sourceFile;
            var value = {fileInfo: {mtime: currentFileDetails.mtime}, targets: currentFileDetails.targets};
            log("NEW FILE", key);
            copyFiles(sourceFile, currentFileDetails.targets);
            db.save(key, value);
            db.persist()
        }
    }
return;
    if(masterData.genre) {
        for(var genre in masterData.genre){
            var files = masterData.genre[genre].files;
            log("**", genre);
            for(var sourceFile in files){
                copyFileIfSourceUpdated(sourceFile, files[sourceFile], genre);
            }
            log("****\n");
        }
        //db.show();
        db.persist();
    }
}
function copyFileIfSourceUpdated(sourceFile, fileDetails, genre){
    var newPathToFolder = utils.getFolderForGenre(genre, config);
    var newFullPath = fsutils.getPathForFile(newPathToFolder, sourceFile);;
    log("SOURCE", sourceFile, newFullPath);
}
