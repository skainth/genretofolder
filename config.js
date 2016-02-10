/**
 * Created by z001hmj on 1/29/16.
 */
module.exports = {
     //lookUpFolder: "/Users/z001hmj/Google Drive/Muzik/1. Punjabi/Punjabi Pop/Lembher Hussainpuri",
    lookUpFolder: "/Users/z001hmj/Google Drive/Muzik",
    targetFolder: "/Users/z001hmj/out/Muzik",
    allowedExtentions: ['.mp3', 'wma'],
    //ignoredFolders:['4. New folder'],
    metaDataAttrs: [
        {name: 'genre', splitters: [',', ';']},
        {name: 'artist', splitters: [',', ';']},
        {name: 'album'}
    ],
    genreToFolder:{
        'Bhangra': "Punjabi/Bhangra",
        'Punjabi Pop': "Punjabi/Punjabi Pop",
        "Punjabi Soul": "Punjabi/Punjabi Soul",
        "Hindi Pop":"Hindi/Hindi Pop",
        "Hindi Soul":"Hindi/Hindi Soul",
        "English Pop": "English/English Pop",
        "English Soul": "English/English Soul",
        "Instrumental": "Instrumental",
        "Hindi Instrumental": "Instrumental/Hindi Instrumental",
        "Lounge": "Instrumental/Lounge",
        "Lounge & Mix": "Instrumental/Lounge",
        "Sufi":"Sufi",
        "Others":"Others"
    },
    dbfile: "loji.json"
};
