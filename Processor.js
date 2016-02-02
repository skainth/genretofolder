/**
 * Created by z001hmj on 1/22/16.
 */
var fs = require('fs');
var mm = require('musicmetadata');

module.exports = {
    process: function(file, callback){
        var parser = mm(fs.createReadStream(file), function (err, metadata) {
            if(err){
                return callback && callback(err, null);
            }
            if(callback) {
                var data = {file: file};
                if (metadata)
                    data.metadata = metadata;

                fs.stat(file, function (fsStatErr, stats) {
                        if (fsStatErr)
                            callback(fsStatErr, data);
                        else {
                            MergeRecursive(data, stats);
                            callback(fsStatErr, data);
                        }
                    //console.log(err, file, stats.mtime, Date.parse(stats.mtime));
                });
            }
        });
    }
};
/*
 * Recursively merge properties of two objects
 */
function MergeRecursive(obj1, obj2) {

    for (var p in obj2) {
        try {
            // Property in destination object set; update its value.
            if ( obj2[p].constructor==Object ) {
                obj1[p] = MergeRecursive(obj1[p], obj2[p]);

            } else {
                obj1[p] = obj2[p];

            }

        } catch(e) {
            // Property in destination object not set; create it and set its value.
            obj1[p] = obj2[p];

        }
    }

    return obj1;
}