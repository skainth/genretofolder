/**
 * Created by z001hmj on 1/29/16.
 */
module.exports = {
    lookUpFolder: "C:\\Users\\IEUser\\Google Drive\\Muzik",
    targetFolder: "C:\\Users\\IEUser\\out\\Muzik",
    /*lookUpFolder: "/Users/z001hmj/SKI/temp/src",
    targetFolder: "/Users/z001hmj/SKI/temp/output/Muzik",*/
    allowedExtentions: ['.mp3', 'wma'],
    //ignoredFolders:['4. New folder'],
    metaDataAttrs: [
        {name: 'genre', splitters: [',', ';', '/'], ignore: ['Movie']},
       /* {name: 'artist', splitters: [',', ';']},
        {name: 'album'}*/
    ],
    genreToFolder:{
        'Bhangra': "1. Punjabi/Bhangra",
        'Punjabi Pop': "1. Punjabi/Punjabi Pop",
        "Punjabi Soul": "1. Punjabi/Punjabi Soul",
        "Hindi Pop":"2. Hindi/Hindi Pop",
        "Hindi Soul":"2. Hindi/Hindi Soul",
        "English Pop": "3. English/English Pop",
        "English Soul": "3. English/English Soul",
        "Beats": "4. Beats",
        "Others":"5. Others"
    },
    dbfile: "data.json",
    clearTargetFolder: true,
    maxLog: 5

};
