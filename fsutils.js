/**
 * Created by z001hmj on 2/9/16.
 */
var fs = require('fs');
module.exports = {
    deleteFiles: function (files, callback) {
        if (files.length == 0) {
            callback && callback();
        }
        else {
            var f = files.pop();
            fs.unlink(f, function (err) {
                if (err){
                    console.log(err, "callback", callback)
                }
                else {
                    console.log(f + ' deleted.', this);
                }
                this.deleteFiles(files, callback);
            }.bind(this));
        }
    },
    deleteFolderRecursive: function(path) {
        var self = this;
        if( fs.existsSync(path) ) {
            fs.readdirSync(path).forEach(function(file,index){
                var curPath = path + "/" + file;
                if(fs.lstatSync(curPath).isDirectory()) { // recurse
                    self.deleteFolderRecursive(curPath);
                } else { // delete file
                    fs.unlinkSync(curPath);
                }
            });
            fs.rmdirSync(path);
        }
    },
    getPathForFile: function(newPathToFolder, filePath){
        var pathTokens = filePath.split('/');
        var fileName = pathTokens[pathTokens.length - 1];
        var newFullPath = newPathToFolder + "/" + fileName;
        return newFullPath;
    }
}