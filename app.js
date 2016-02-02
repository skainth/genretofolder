// Program to arrange mp3/wma file based upon their genre(s)

var processor = require('./Processor');
var recursive = require('recursive-readdir');
var fs_extra = require('fs-extra');
var mkdirp = require('mkdirp');
var fs = require('fs');
var config = require('./config');

var log = console.log;

/*process.on('uncaughtException', function (error) {
    log(error.stack);
});*/

String.prototype.toProperCase = function () {
    return this.replace(/\w\S*/g, function(txt){return txt.charAt(0).toUpperCase() + txt.substr(1).toLowerCase();});
};

var masterData = [];

// Clean up target folder. TODO: Ask for confirmation
deleteFolderRecursive(config.targetFolder);

var allFiles = []

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
    var fileInfo = {file: data.file, metaData: {}};
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
    log("I'm Done!");
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
    /*if(metaDataAttrName == "genre") {
        if (!masterData[metaData])
            masterData[metaData] = [];
        copyToFolder(file, metaData);
    }*/
}

// Copy file to folder depending upon the file's genre
function copyToFolder(filePath, genre){
    var newPathToFolder = getFolderForGenre(genre);;
    var newFullPath = getPathForFile(newPathToFolder, filePath);;

    if(fs.exists(newPathToFolder)){
        fs_extra.copySync(filePath, newFullPath);
    }else{
        mkdirp(newPathToFolder, function(err){
            if(!err)
                fs_extra.copySync(filePath, newFullPath);
            else
                log(err, newFullPath);
        })
    }
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