/**
 * Created by z001hmj on 2/8/16.
 */
var jsonfile = require('jsonfile');
var fs_extra = require('fs-extra');

function DB(dataFile, callback){
    var data = {};
    jsonfile.readFile(dataFile, function(err, fileData){
        if(err){
            console.log("ERROR", err);
            fs_extra.writeJson(dataFile, {}, function (err) {
                callback && callback(err);
            })
        }else{
            if(typeof fileData == "string")
                data = JSON.parse(fileData);
            else
                data = fileData; //Assume it is valid JSON
        }

        callback(err);
    });

    this.save = function(key, value){
        data[key] = value;
    }
    this.remove = function(key){
        delete data[key];
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
        keys.forEach(function(key){
            delete data[key];
        });
    }
    this.clear = function(){
        data = {};
    }
}
module.exports = DB;
