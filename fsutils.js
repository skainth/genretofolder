/**
 * Created by z001hmj on 2/9/16.
 */
module.exports = {
    deleteFiles: function (files, callback) {
        if (files.length == 0) callback();
        else {
            var f = files.pop();
            fs.unlink(f, function (err) {
                if (err) callback(err);
                else {
                    console.log(f + ' deleted.');
                    deleteFiles(files, callback);
                }
            });
        }
    }
}