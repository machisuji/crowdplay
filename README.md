CrowdPlay Spotify App
=====================

A crude spotify app for a democratic playlists that allows playing random tracks from
a collaborative playlist and lets people vote tracks up and down. The probability of 
each tracks depends on the number of up- and downvotes, as well as the last time it 
was played. 

The app is based on the boilerplate app of the Spotify Apps API. 

Requirements
------------

- PHP 5.4+
- Spotify

Usage
-----

The app consists of two parts: The player in form of a Spotify App, and an independent web interface
for people to vote on tracks and see what's currently playing. 

To use the player just copy the crowdplay folder into the Spotify app of your home folder (on Windows 
for example: "%USERPROFILE%\Documents\Spotify") and start the app from spotify by typing "spotify:app:crowdplay"
into the search bar, or alternatively use the "Spotify-App" button in the web interface of CrowdPlay.

To use the web interface just start the "server.bat" file in the app folder, which will try to start 
the integrated PHP development server using the command "php -S 0.0.0.0:8004". Then point your browser
to "http://localhost:8004/". 

Links
-----

-  [Spotify Developer site](https://developer.spotify.com/)
-  [Spotify Apps API](https://developer.spotify.com/technologies/apps/)