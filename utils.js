/**
 * Created by z001hmj on 2/18/16.
 */

var crc = require('crc');
module.exports = {
    getUniqueDBFileName: function (config){
        return crc.crc32(config.lookUpFolder) + "-" + crc.crc32(config.targetFolder) + "-" + config.dbfile;
    },
    getFolderForGenre: function (genre, config){
        genre = genre.trim();
        var newPathToFolder = "";
        if(!config.genreToFolder[genre]){
            newPathToFolder = config.targetFolder + "/" +  config.genreToFolder["Others"] + "/" + genre;
        }
        else
            newPathToFolder = config.targetFolder + "/" +  config.genreToFolder[genre];
        return newPathToFolder;
    },
    showStats: function (){
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
    },
    addGlobalUncaughExceptionHandler: function(){
        process.on('uncaughtException', function (error) {
         log(error.stack);
         });
    }
}