
var serverUri = "crowdcontrol.php";
var tracks = [];
var playlist = {
    name: ''
};

function init() {
    if (window.localStorage.getItem("username") == null || window.localStorage.getItem("username") == "") {
        var name = window.prompt("Username");
        window.localStorage.setItem("username", name);
    }

    $.get(serverUri, { wish: 'show'}, function(wishes) {
        var count = 3 - parseInt(wishes.stats[getUsername()]);
        if (count > 0) $("#skipButton").text('Skip Wish (' + count + ' left)').button('refresh');
        else $("#skipButton").text('No Wishes left').prop('disabled', true).button('refresh');
    });
}

function array_contains(arr, elem) {

    if (arr == null) {
        return false;
    }

    for (var i=0;i<arr.length;i++) {
        if (arr[i] == elem) {
            return true;
        }
    }

    return false;
}

function get_track(uri) {
    return tracks[uri];
}

function getUsername() {
    return window.localStorage.getItem("username");
}

function doSkipWish(e) {
    $.get(serverUri, { wish: 'skip', username: getUsername() }, function(result) {
        var wishesLeft = parseInt(result);
        if (wishesLeft == 0) {
            $("#skipButton").text('No Wishes left').prop('disabled', true).button('refresh');
        }
        else $("#skipButton").text('Skip Wish (' + wishesLeft + ' left)').button('refresh');
    });
}

function createTrackHtml(track) {

    function button(img, uri, className, selected, disabled) {
        if (selected) className += " selected";
        var add = disabled ? " disabled" : "";

        var text = '<img src="' + img + '">';

        return '<button class="utf-icon ' + className + '" data-uri="' + uri + '"' + add + '>' + text + '</button>';
    }

    if (typeof track.upvotes == "undefined" || track.upvotes == null) track.upvotes = [];
    if (typeof track.downvotes == "undefined" || track.downvotes == null) track.downvotes = [];

    var username = getUsername();
    var is_pro = array_contains(track.upvotes, username);
    var is_contra = array_contains(track.downvotes, username);
    var voted = is_pro || is_contra;

    return '<div class="track">' +
        '<div class="actions">' +
        button('images/Up.png', track.uri, 'pro', is_pro, voted) +
        button('images/Down.png', track.uri, 'contra', is_contra, voted) +
        '</div>' +
        '<div class="info">' +
        '<!--<img style="display: none;" class="cover" src="' + track.image + '">-->' +
        '<div class="name">' +
        '<span class="title">' + track.name + '</span>' +
        '<span class="artist">' + track.artist + '</span></div>' +
        '</div><br style="clear:left;"></div>';
}

function showPlaylist() {
    var $ol = $("#tracks");
    $ol.html('');

    for (var trackUri in tracks) {
        var track = tracks[trackUri];
        var $li = $(document.createElement("li"));

        var html = createTrackHtml(track);

        $li.html(html);
        $ol.append($li);
    }

    $ol.listview('refresh');
    $ol.find('button.pro').click(pro);
    $ol.find('button.contra').click(contra);
}

function update(result) {
    tracks = result.tracks;
    playlist.name = result.name;

    var currentTrack = result.current_track;
    var currentDisplay = $("#currentTracks .title").text();
    if (currentTrack.name == currentDisplay) return;

    showPlaylist();

    // show currently playing
    var html = createTrackHtml(get_track(result.current_track.uri));
    var $ol = $("#currentTracks");

    $ol.html('');
    $ol.append("<li>" + html + "</li>");

    $ol.listview('refresh');
    $ol.find('button.pro').click(pro);
    $ol.find('button.contra').click(contra);
}

function pro(e) {
    var trackUri = $(this).data('uri');
    $.get(serverUri, {
        'pro': trackUri,
        'playlist': playlist.name,
        'username': window.localStorage.getItem("username")});
    $(this).prop('disabled', true).addClass("selected");
    $(this).siblings(".contra").prop('disabled', true);
}

function contra(e) {
    var trackUri = $(this).data('uri');
    $.get(serverUri, {
        'contra': trackUri,
        'playlist': playlist.name,
        'username': window.localStorage.getItem("username")});
    $(this).prop('disabled', true).addClass("selected");
    $(this).siblings(".pro").prop('disabled', true);
}

function scheduleUpdate() {
    $.get(serverUri, {show: true, playlist: 'current'}, function(result) {
        update(result);
        setTimeout(scheduleUpdate, 5000);
    });
}

init();
scheduleUpdate();
$("#skipButton").click(doSkipWish);