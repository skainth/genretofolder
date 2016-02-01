/**
 * Created by z001hmj on 1/22/16.
 */
var fs = require('fs');
var mm = require('musicmetadata');

module.exports = {
    process: function(file, callback){
        var parser = mm(fs.createReadStream(file), function (err, metadata) {
            var data = {file: file};
            if(metadata)
                data.metadata = metadata
            callback && callback(err, data);
        });
    }
};