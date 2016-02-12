/**
 * Created by z001hmj on 2/8/16.
 */
var jsonfile = require('jsonfile');

function DB(dataFile, callback){
    var data = {};
    jsonfile.readFile(dataFile, function(err, fileData){
        if(err){
            console.log("ERROR", err);
        }else{
            if(typeof fileData == "string")
                data = JSON.parse(fileData);
            else
                data = fileData; //Assume it is valid JSON
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
    this.persist = function(cb){
        jsonfile.writeFileSync(dataFile, data);
        cb && cb();
    }
    this.keys = function(callback){
        callback && callback(Object.keys(data));
    }
    this.delKeysSync = function(keys){
        if(!Array.isArray(keys)){
            keys = [keys];
        }
        console.log("Data len before", Object.keys(data).length)
        keys.forEach(function(key){
            delete data[key];
        });
        console.log("Data len After", Object.keys(data).length)
    }
    this.clear = function(){
        data = {};
    }
}
module.exports = DB;
