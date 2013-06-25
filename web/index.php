<!DOCTYPE html>
<html>
<head>
    <meta charset="utf-8">
    <meta http-equiv="X-UA-Compatible" content="IE=edge,chrome=1">
    <title>Crowd Play ♫</title>
    <link rel="stylesheet" href="css/style.css">
    <link rel="stylesheet" href="css/jquery.mobile-1.3.1.min.css">
    <script type="text/javascript" src="scripts/jquery-1.9.1.min.js"></script>
    <script type="text/javascript" src="scripts/jquery.mobile-1.3.1.min.js"></script>
    <script type="text/javascript" src="scripts/crowdplay.js"></script>
</head>
<body>

<div id="main-page" data-role="page">

    <header data-role="header">
        <h1>Crowd Play ♫</h1>

        <a href="spotify:app:crowdplay">Spotify-App ▶</a>
        <a href="" onclick="alert('Unbezahlbar.'); return false;" rel="external">Buy Wishes</a>
    </header>

    <div data-role="content">

        <section id="player">
            <h2>Currently Playing
                <!-- <button data-inline="true" data-icon="forward">Skip Vote</button> -->
                <button id="skipButton" data-inline="true" data-icon="forward">Skip Wish</button>
            </h2>

            <ul id="currentTracks" class="tracks currentSong" data-role="listview" data-inset="true">
                <li>-- select a playlist first --</li>
            </ul>

        </section>

        <section id="playlist">

            <h2>Track Pool</h2>

            <ul id="tracks" data-role="listview" data-filter="false" data-inset="true">
                <li>-- select a playlist first --</li>
            </ul>

        </section>

    </div>

</div>

<script src="scripts/crowdplay.js"></script>
</body>
</html>
