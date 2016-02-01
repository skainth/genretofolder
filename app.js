// Program to arrange mp3/wma file based upon their genre(s)

var processor = require('./Processor');
var recursive = require('recursive-readdir');
var fs_extra = require('fs-extra');
var mkdirp = require('mkdirp');
var fs = require('fs');
var config = require('./config');

/*process.on('uncaughtException', function (error) {
    console.log(error.stack);
});*/

String.prototype.toProperCase = function () {
    return this.replace(/\w\S*/g, function(txt){return txt.charAt(0).toUpperCase() + txt.substr(1).toLowerCase();});
};

var log = console.log;

var masterData = [];

// Clean up target folder. TODO: Ask for confirmation
deleteFolderRecursive(config.targetFolder);

var allFiles = []

// Get all files in the source folder
recursive(config.lookUpFolder, function (err, files) {
    // Files is an array of filenames
    allFiles = files;
    handleFile(0);
});

//Files/Directories to be ignored
function ignore(file){
    for(var index = 0; index < config.ignoredFolders.length; index++){
        var folderName = config.ignoredFolders[index].toLowerCase();
        if(file.toLowerCase().indexOf(folderName) > -1) {
            return true;
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
        console.log("No more files to process");
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
        log("Error processing file", data.file);
    }else{
        processFileData(data);
    }
    // process next file
    handleFile(this.index + 1);
}

// Process data actually
function processFileData(data){
    var file = data.file;
    var genres = data.metadata.genre;
    if(genres && genres.length > 0){
        genres.forEach(function(genre){
            //log(file, genre);
            var processedFile = false;
            config.splitters.forEach(function(splitter){
                if(genre.indexOf(splitter) > -1){
                    var genreList = genre.split(splitter);
                    //log(file, genreList, data.metadata.genre);
                    genreList.forEach(function(genre){
                        saveFileData(file, genre, data.metadata);
                        processedFile = true;
                    });
                }
            });
            if(!processedFile)
                saveFileData(file, genre), data.metadata;
        });
    }
}
// Save file to path based upon its genre
function saveFileData(file, genre){
    if(!masterData[genre])
        masterData[genre] = [];
    copyToFolder(file, genre);
}

// Copy file to folder depending upon the file's genre
function copyToFolder(filePath, genre){
    var newPathToFolder = getFolderForGenre(genre);;
    var newFullPath = getPathForFile(newPathToFolder, filePath);;

    if(fs.exists(newPathToFolder)){
        log("To ", newFullPath)
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