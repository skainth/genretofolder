/**
 * Created by z001hmj on 2/16/16.
 */
function stats(keywords){
    var data = [];
    keywords.forEach(function(keyword){
        data[keyword] = [];
    })
    this.add = function(key, value){
        if(!data[key])
            data[key] = [];
        if(data[key].indexOf(value) == -1)
            data[key].push(value);
    }
    this.get = function(key){
        if(data[key])
            return data[key];
        return [];
    }
    this.getAll = function(){
        return data;
    }
}
module.exports = stats;