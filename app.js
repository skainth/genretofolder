/**
 * Created by z001hmj on 1/22/16.
 */
var processor = require('./Processor');
var recursive = require('recursive-readdir');
var fs_extra = require('fs-extra');
var mkdirp = require('mkdirp');
var fs = require('fs');

String.prototype.toProperCase = function () {
    return this.replace(/\w\S*/g, function(txt){return txt.charAt(0).toUpperCase() + txt.substr(1).toLowerCase();});
};

var config = {lookUpFolder: "/Users/z001hmj/Google Drive/Muzik/", targetFolder: "/Users/z001hmj/out/Muzik", ignoredFolders:['4. New folder'], splitters: [',', ';'],
                genreToFolder:{
                    'Bhangra': "Punjabi/Bhangra",
                    'Punjabi Pop': "Punjabi/Punjabi Pop",
                    "Punjabi Soul": "Punjabi/Punjabi Soul",
                    "Hindi Pop":"Hindi/Hindi Pop",
                    "Hindi Soul":"Hindi/Hindi Soul",
                    "English Pop": "English/English Pop",
                    "English Soul": "English/English Soul",
                    "Instrumental": "Instrumental",
                    "Hindi Instrumental": "Instrumental/Hindi Instrumental",
                    "Lounge": "Instrumental/Lounge",
                    "Sufi":"Sufi",
                    "Others":"Others"
                }
            };

deleteFolderRecursive(config.targetFolder);

/*function ignoreFunc(file, stats) {
    // `file` is the absolute path to the file, and `stats` is an `fs.Stats`
    // object returned from `fs.lstat()`.
    return stats.isDirectory();
}*/
var numFiles = 0, includedFiles = 0;
recursive(config.lookUpFolder, function (err, files) {
    // Files is an array of filename
    numFiles = files.length;
    files.forEach(function(file){
        if(!ignore(file)) {
            ++includedFiles;
            processor.process(file, action)
        }
        else
            ;//log("Ignored", file);
    })
});

function ignore(file){
    for(var index = 0; index < config.ignoredFolders.length; index++){
        var folderName = config.ignoredFolders[index].toLowerCase();
        if(file.toLowerCase().indexOf(folderName) > -1) {
            return true;
        }
    }
    return !(file.toLowerCase().indexOf('mp3') > -1);
}

var log = console.log;

setTimeout(function(){
    log("numFiles", numFiles, "includedFiles", includedFiles, "ignored", numFiles - includedFiles)
}, 2000);
log("Up!");

function action(err, data){
    if (err)
        log("ERROR", data.file, err);
    else {
        var file = data.file;
        var genres = data.metadata.genre;
        //log(data.file, genres);
        if(genres && genres.length > 0){
            genres.forEach(function(genre){
               //log(file, genre);
                var processedFile = false;
                config.splitters.forEach(function(splitter){
                    if(genre.indexOf(splitter) > -1){
                        var genreList = genre.split(splitter);
                        //log(file, genreList, data.metadata.genre);
                        genreList.forEach(function(genre){
                            copyToFolder(file, genre);
                            processedFile = true;
                        });
                    }
                });
                if(!processedFile)
                    copyToFolder(file, genre);
            });
        }
    }
}

function copyToFolder(filePath, genre){
    genre = genre.trim();
    //log(filePath, genre);

    var newPathToFolder = getFolderForGenre(genre);;

    var newFullPath = getPathForFile(newPathToFolder, filePath);;

    if(fs.exists(newPathToFolder)){
        //log("To ", newFullPath)
        fs_extra.copySync(filePath, newFullPath);
    }else{

        //mkdirSyncRecursive(newPathToFolder);
        log("Create folder To ", newPathToFolder);
        mkdirp(newPathToFolder, function(err){
            if(!err)
                fs_extra.copySync(filePath, newFullPath);
            else
                log(err, newFullPath);
        })
    }

    //fs_extra.copySync(filePath, newPath);
}

function getFolderForGenre(genre){
    var newPathToFolder = "";
    if(!config.genreToFolder[genre]){
        log("Not folder for ", genre);
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