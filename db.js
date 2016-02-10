/**
 * Created by z001hmj on 2/8/16.
 */
var fs = require('fs');




function DB(dataFile, callback){
    var data = {};
    fs.readFile(dataFile, function(err, fileData){
        if(err){
            console.log("ERROR", err);
            data = {};
        }else{
            data = JSON.parse(fileData);
        }

        callback(err);
    });

    this.save = function(filePath, fileInfo, newFullPath){
        var obj = data[filePath];
        if(obj){
            obj.files.push(newFullPath);
        }else{
            obj = data[filePath] = {};
            obj.files = [];
            obj.files.push(newFullPath);
        }
        obj.fileInfo = fileInfo;
    }
    this.get = function(filePath){
        return data[filePath];
    }
    this.show = function(){
        console.log(data);
    }
    this.persist = function(){
        fs.writeFile("data.json", JSON.stringify(data), function(err) {
            if(err) {
                return console.log(err);
            }

            console.log("The file was saved!");
        });
    }
    this.keys = function(callback){
        callback && callback(Object.keys(data));
    }
}
module.exports = DB;
/*

module.exports = {
    save: function(filePath, fileInfo, newFullPath){
        var obj = data[filePath];
        if(obj){
            obj.files.push(newFullPath);
        }else{
            obj = data[filePath] = {};
            obj.fileInfo = fileInfo;
            obj.files = [];
            obj.files.push(newFullPath);
        }
    },
    get: function(filePath){
        return data[filePath];
    },
    show:function(){
        console.log(data);
    },
    persist: function(){
        fs.writeFile("data.json", JSON.stringify(data), function(err) {
            if(err) {
                return console.log(err);
            }

            console.log("The file was saved!");
        });
    }
}*/
