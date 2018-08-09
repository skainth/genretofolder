## A rewritten version of this utility is available at https://github.com/skainth/g2f

Personal project to learn nodejs.
This is a utility to arrange mp3 files in folders based upon their genres.

## The problem

I enjoy listening to music in my car and I like to have my music all nicely tagged with title, artist(s), genre(s), album, album art, etc. Many of my mp3's have multiple genres and here is where the problem begins. On desktop, you get many tools, like [MediaMonkey](http://www.mediamonkey.com/), which understand multiple genres in the same file. So, in their list of genres, they will show three genres, like "Pop", "Metal", "Rock" instead of a single like "Pop/Metal/Rock". So, if you are in a mood to listen to only Metal songs you just select "Metal" from your list of genres. But the audio players in most (all?) car audio players do not support multiple genres, so they treat stuff like "Pop/Metal/Rock" as a single genre. Pretty annoying.

## The solution

I created this utility which reads the source folder with your mp3s and a target folders for the different genres.
Example:
lookUpFolder: "C:\\Users\\IEUser\\Muzik",
targetFolder: "C:\\Users\\IEUser\\Google Drive\\Muzik",

The following config defines in which sub folder the matching audio file is to be copied

genreToFolder:{
        "EDM": "Trance/EDM",
        "Techno": "Trance/Techno",
        "House": "Trance/House",
        "Folk":"Country/Folk",
        "Blues":"Country/Blues",
        "Others":"Others"
    }

All files with one of its genres as House, will be copied to C:\\Users\\IEUser\\Google Drive\\Muzik\\Trance\\House

Now, if I want to listen to House music in my car, all I have to do is to navigate to the House folder!

## Added sugar

I've synced the output folder with google drive. Any changes to the output folder is quickly uploaded to my Google Drive. From where a phone, which is functioning as a USB drive in my car's audio player, downloads the updates. Now anytime I download and tag a new audio file, this utility auto runs, places the file in the appropriate folder from where it reaches my car’s phone via Google Drive. No more moving USB drives around!

