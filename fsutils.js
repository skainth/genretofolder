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
                    callback && callback(err);
                }
                else {
                    console.log(f + ' deleted.', this);
                    this.deleteFiles(files, callback);
                }
            }.bind(this));
        }
    }
}