require([
    '$api/models',
    '$api/library',
    '$views/list'
], function (_models, _library, _list) {
    'use strict';

    if (window.localStorage.getItem("username") == null) {
        window.localStorage.setItem("username", "host");
    }

    var serverUri = "http://localhost:8004/crowdcontrol.php";
    if (window.localStorage.getItem("serverUri") != null) serverUri = window.localStorage.getItem("serverUri");

    var selectedPlaylist = null;
    var currentTrack = null;
    var tracks = [];
    var nextTimer = 0;
    var lastPlayed = {}; // dictionary tracking when a song was last played

    var settings = {
        numListeners: 3,
        timeThresholdMin: 120,
        voteWeight: 1.0
    };

    function get_last_played(track) {
        if (track.uri in lastPlayed) return lastPlayed[track.uri];
        else return 0;
    }

    function onSongChanged(e) {
        var currentTrackUri = _models.player.track.uri;
        var html = createTrackHtml(_models.player.track);
        var $ol = $("#currentTracks");

        $ol.html('');
        $ol.append("<li>" + html + "</li>");

        $ol.listview('refresh');
        $ol.find('button.pro').click(pro);
        $ol.find('button.contra').click(contra);
    }

    function getRandomInt(min, max) {
        return Math.floor(Math.random() * (max - min + 1)) + min;
    }

    function skip(e) {
        clearTimeout(nextTimer);
        play(null);
    }

    function get_upvotes(track) {
        if (typeof track.upvotes == "undefined" || track.downvotes == null) return [];
        else return track.upvotes;
    }

    function get_downvotes(track) {
        if (typeof track.downvotes == "undefined" || track.downvotes == null) return [];
        else return track.downvotes;
    }

    function track_probability(track) {
        var p = 1.0;
        var upvotes = get_upvotes(track);
        var downvotes = get_downvotes(track);
        var last_play = get_last_played(track);

        // Upvotes directly influence probablity
        p += (upvotes.length / settings.numListeners) * settings.voteWeight;
        p -= (downvotes.length / settings.numListeners) * settings.voteWeight;

        // Linear Probablity Malus for songs that have been played recently
        if (last_play > 0) {
            var threshold = 1000 * 60 * settings.timeThresholdMin;
            var diff = (new Date().getTime()) - last_play;
            if (diff < threshold) {
                var malusP = diff / threshold;
                p *= malusP;
            }
        }

        return p;
    }

    function compute_probablities() {
        var sum = 0;
        for (var i=0;i<tracks.length;i++) {
            var p = track_probability(tracks[i]);
            tracks[i].probability = p;
            sum += p;
        }
        return sum;
    }

    function pick_song() {
        var p_sum = compute_probablities();
        var rand = Math.random() * p_sum;

        for (var i = 0; i < tracks.length; i++) {
            rand -= tracks[i].probability;
            if (rand <= 0) {
                return tracks[i];
            }
        }

        return tracks[0];
    }

    function play(e) {
        if (selectedPlaylist == null) return false;

        currentTrack = pick_song();
        _models.player.playTrack(currentTrack);
        lastPlayed[currentTrack.uri] = new Date().getTime();
        sync();

        clearTimeout(nextTimer);
        nextTimer = setTimeout(play, currentTrack.duration);

        return false;
    }

    function notify() {
        var params = {
            notify: selectedPlaylist.name,
            current_track: serialize_track(currentTrack)
        };

        $.post(serverUri, params);
    }

    function stop(e) {
        _models.player.stop();
    }

    function connect(e, uri) {
        var uri = e != null ? $(this).val() : uri;
        $(this).parent().removeClass("fail").removeClass("success");

        $.ajax({
            url: uri,
            data: {connect: 1},
            success: function (result) {
                if (result == "OK") {
                    $("#serverUri").parent().addClass("success");
                    serverUri = uri;
                    window.localStorage.setItem("serverUri", uri);
                }
                else $("#serverUri").parent().addClass("fail");

                $.get(serverUri, {wish:'reset'});
            },
            timeout: 500,
            error: function (xhr, status, err) {
                $("#serverUri").parent().addClass("fail");
            }
        });
    }

    function pro(e) {
        var trackUri = $(this).data('uri');
        $.get(serverUri, {
            'pro': trackUri,
            'playlist': selectedPlaylist.name,
            'playlist_uri': selectedPlaylist.uri,
            'username': window.localStorage.getItem("username")});
        $(this).prop('disabled', true).addClass("selected");
        $(this).siblings(".contra").prop('disabled', true);
    }

    function contra(e) {
        var trackUri = $(this).data('uri');
        $.get(serverUri, {
            'contra': trackUri,
            'playlist': selectedPlaylist.name,
            'playlist_uri': selectedPlaylist.uri,
            'username': window.localStorage.getItem("username")});
        $(this).prop('disabled', true).addClass("selected");
        $(this).siblings(".pro").prop('disabled', true);
    }

    function createTrackHtml(track) {
        return '<div class="track">' +
            '<div class="actions">' +
            '<button class="utf-icon pro" data-uri="' + track.uri + '">☺</button>' +
            '<button class="utf-icon contra" data-uri="' + track.uri + '">☹</button>' +
            '</div>' +
            '<div class="info">' +
            '<img class="cover" src="' + track.image + '">' +
            '<div class="name">' +
            '<span class="title">' + track.name + '</span>' +
            '<span class="artist">' + track.artists[0].name + '</span></div>' +
            '</div><br style="clear:left;"></div>';
    }

    function showPlaylist() {
        var $ol = $("#tracks");
        $ol.html('');

        for (var i = 0; i < tracks.length; i++) {
            var track = tracks[i];
            var $li = $(document.createElement("li"));

            var html = createTrackHtml(track);

            $li.html(html);
            $ol.append($li);
        }

        $ol.listview('refresh');
        $ol.find('button.pro').click(pro);
        $ol.find('button.contra').click(contra);
    }

    function serialize_track(t) {
        var upvotes = typeof t.upvotes != "undefined" ? t.upvotes : [];
        var downvotes = typeof t.downvotes != "undefined" ? t.downvotes : [];

        return {
            uri: t.uri,
            name: t.name,
            artist: t.artists[0].name,
            upvotes: upvotes,
            downvotes: downvotes,
            duration: t.duration
        };
    }

    function serialize_tracks() {
        var list = {};

        for (var i=0;i<tracks.length;i++) {
            var t = tracks[i];
            list[t.uri] = serialize_track(t);
        }

        return list;
    }

    function sync() {

        if (selectedPlaylist == null) return;

        var params = {
            sync: selectedPlaylist.name,
            current_track: serialize_track(currentTrack),
            tracks: serialize_tracks()
        };

        function success(result) {
            for (var i=0;i<tracks.length;i++) {
                var t = tracks[i];
                if (typeof result.tracks[t.uri] != "undefined") {
                    var to = result.tracks[t.uri];
                    tracks[i].upvotes = to.upvotes;
                    tracks[i].downvotes = to.downvotes;
                }
            }
        }

        $.post(serverUri, params, success).fail(function(e) {
            console.log("error: couldn't sync playlist");
        });
    }

    function get_track(uri) {
        for (var i=0;i<tracks.length;i++) {
            if (tracks[i].uri == uri) {
                return tracks[i];
            }
        }
        return null;
    }

    function updatePlaylist() {
        if (selectedPlaylist == null) return;
        var uri = selectedPlaylist.uri;
        _models.Playlist.fromURI(uri).load(['tracks']).done(function(playlist) {
            playlist.tracks.snapshot(0, 1000).done(function(songs) {
                for (var i=0; i < songs.length;i++) {
                    var track = songs.get(i);
                    if (get_track(track.uri) == null) {
                        tracks.push(track);
                    }
                }
            });

            selectedPlaylist = playlist;
            showPlaylist();
        });
    }

    function loadPlaylist(uri) {
        clearTimeout(nextTimer);
        tracks = [];
        _models.Playlist.fromURI(uri).load(['tracks']).done(function (playlist) {
            playlist.tracks.snapshot(0, 1000).done(function (snapshot) {
                for (var i = 0; i < snapshot.length; i++) {
                    var track = snapshot.get(i);
                    tracks.push(track);
                }
            });

            selectedPlaylist = playlist;
            showPlaylist();
            play(null);
        });
    }

    function selectPlaylist(uri) {
        return function () {
            loadPlaylist(uri);
            return false;
        };
    }

    function listPlaylists() {
        var userLib = _library.Library.forCurrentUser();
        var playlists = userLib.playlists;

        playlists.snapshot(0, 100).done(function (snapshot) {
            var $select = $("#playlists");

            for (var i = 0; i < snapshot.length; i++) {
                var playlist = snapshot.get(i);
                if (!playlist.collaborative) continue;

                var $option = $(document.createElement("option"));
                $option.val(playlist.uri);
                $option.text(playlist.name);
                $select.append($option);
            }

            $select.listview('refresh');
        });
    }

    function pauseButton(e) {
        var $button = $("#pauseButton");
        if ($button.text() == "Pause") {
            clearTimeout(nextTimer);
            nextTimer = 0;
            _models.player.pause();
            $button.text("Resume").button("refresh");
        } else {
            nextTimer = setTimeout(play, currentTrack.duration - _models.player.position)
            _models.player.play();
            $button.text("Pause").button("refresh");
        }
    }

    function checkWishes() {
        $.get(serverUri, { wish: 'show' }, function(result) {
            var wishes = result;
            if (wishes.pending.length > 0) {
                if (wishes.pending[0].wish == "skip") {
                    $.get(serverUri, { wish: 'grant' });
                    play(null);
                }
            }
        });
    }

    $("#playlists").change(function (e) {
        var value = $("#playlists").val();
        loadPlaylist(value);
    });

    $("#skipButton").click(skip);
    $("#pauseButton").click(pauseButton);

    $("#serverUri").change(connect);

    _models.player.addEventListener('change', onSongChanged);
    setInterval(function() {
        updatePlaylist();
    }, 30 * 1000);

    setInterval(function() {
        checkWishes();
    }, 1000);

    connect(null, serverUri);
    listPlaylists();
});