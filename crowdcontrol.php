<?php

class Lock
{
    private $filename;
    private $fp;

    public function __construct($filename)
    {
        $this->filename = $filename;
    }

    public function acquire()
    {
        $this->fp = fopen($this->filename, "w+");
        return flock($this->fp, LOCK_EX);
    }

    public function release()
    {
        $result = flock($this->fp, LOCK_UN);
        fclose($this->fp);
        $this->fp = null;
        return $result;
    }
}

function LoadDatabase($name)
{
    if (!file_exists("db/$name.json")) {
        return [
            'name' => $name,
            'tracks' => [],
            'current_track' => []
        ];
    }
    return json_decode(file_get_contents("db/$name.json"), true);
}

function SaveDatabase($data)
{
    $name = $data['name'];
    file_put_contents("db/$name.json", json_encode($data));
}

function GetDatabase()
{
    $dbname = $_GET['playlist'];
    $db = LoadDatabase($dbname);
    return $db;
}

// replies to a "connect", i.e. ping request just signaling that the server is there
function Ping()
{
    if (isset($_GET['connect'])) {
        header("content-type: text/plain; charset=utf8");
        error_reporting(0);
        die("OK");
    }
}

function Sync()
{
    $db = LoadDatabase($_POST['sync']);
    $tracks = $_POST['tracks'];

    // add tracks to database
    foreach ($tracks as $track) {
        $uri = $track['uri'];
        if (!isset($db['tracks'][$uri])) {
            $db['tracks'][$uri] = $track;
        }
    }

    // remove tracks from database
    foreach ($db['tracks'] as $track) {
        $uri = $track['uri'];
        if (!isset($tracks[$uri])) {
            unset($db['tracks'][$uri]);
        }
    }

    // remember what's currently  being played
    $currentTrackUri = $_POST['current_track']['uri'];
    $db['current_track'] = $db['tracks'][$currentTrackUri];
    file_put_contents("db/current_playlist.txt", $_POST['sync']);

    SaveDatabase($db);

    header("content-type: application/json; charset=utf8");
    echo json_encode($db);
}

function Pro()
{
    $db = GetDatabase();
    $track = $_GET['pro'];
    $username = $_GET['username'];
    $stat = & $db['tracks'][$track];

    if (!isset($stat['upvotes'])) $stat['upvotes'] = [$username];
    else {
        if (array_search($username, $stat['upvotes']) === false) {
            array_push($stat['upvotes'], $username);
        }

        // remove from downvotes if necessary
        if (!isset($stat['downvotes'])) $stat['downvotes'] = [];
        $stat['downvotes'] = array_diff($stat['downvotes'], [$username]);
    }

    SaveDatabase($db);
}

function Contra()
{
    $db = GetDatabase();
    $track = $_GET['contra'];
    $username = $_GET['username'];
    $stat = & $db['tracks'][$track];

    if (!isset($stat['downvotes'])) $stat['downvotes'] = [$username];
    else {
        if (array_search($username, $stat['downvotes']) === false) {
            array_push($stat['downvotes'], $username);
        }

        // remove from upvotes if necessary
        if (!isset($stat['upvotes'])) $stat['upvotes'] = [];
        $stat['upvotes'] = array_diff($stat['upvotes'], [$username]);
    }

    SaveDatabase($db);
}

function Show()
{
    $name = $_GET['playlist'];
    if ($name == "current") {
        $name = file_get_contents("db/current_playlist.txt");
    }

    $db = LoadDatabase($name);
    header("content-type: application/json; charset=utf8");
    echo json_encode($db);
}

function Notify()
{
    $db = LoadDatabase($_POST['notify']);
    $db['current_track'] = $_POST['current_track'];
    SaveDatabase($db);

    // remember what's currently  being played
    file_put_contents("db/current_playlist.txt", $_POST['notify']);
}

function LoadWishes()
{
    $file = "db/wishes.txt";
    if (!file_exists($file)) {
        return [
            'pending' => [],
            'stats' => []
        ];
    } else {
        return json_decode(file_get_contents($file), true);
    }
}

function SaveWishes($wishes)
{
    $data = json_encode($wishes);
    file_put_contents("db/wishes.txt", $data);
}

function ResetWishes()
{
    $wishes = LoadWishes();
    $wishes['pending'] = [];
    foreach ($wishes['stats'] as &$stat) {
        $stat = 0;
    }
    SaveWishes($wishes);
}

function SkipWish()
{
    $username = $_GET['username'];
    $wishes = LoadWishes();

    if (!isset($wishes['stats'][$username])) $wishes['stats'][$username] = 0;

    if (intval($wishes['stats'][$username]) < 3) {
        $wishes['pending'][] = ["user" => $username, "wish" => "skip"];
        $wishes['stats'][$username] = intval($wishes['stats'][$username]) + 1;
    }

    SaveWishes($wishes);

    header("content-type: text/plain");
    echo (3 - $wishes['stats'][$username]);
}

function GrantWish()
{
    $wishes = LoadWishes();

    if (count($wishes['pending']) > 0) {
        $wish = $wishes['pending'][0];
        for ($i=1;$i<count($wishes['pending']);$i++) {
            $wishes['stats'][$wishes[$i]['user']] = intval($wishes['stats'][$wishes[$i]['user']]) - 1;
        }
        $wishes['pending'] = [];
        SaveWishes($wishes);
    }
}

function ShowWishes()
{
    $wishes = LoadWishes();
    header("content-type: text/json; charset=utf8");
    echo json_encode($wishes);
}

function WishRouter()
{
    switch ($_GET['wish']) {
        case 'skip': SkipWish(); break;
        case 'show': ShowWishes(); break;
        case 'reset': ResetWishes(); break;
        case 'grant': GrantWish(); break;
    }
}

function Action($name, $arg = null)
{
    return function () use ($name, $arg) {
        call_user_func($name);
    };
}

function synchronized($callable, $on = "db/write.lock")
{
    $lock = new Lock($on);
    $lock->acquire();

    $callable();

    $lock->release();
}

//============= MAIN ==============\\

if (count($_GET) == 0 && count($_POST) > 0) {
    $action = key($_POST);
    $arg = current($_POST);
} else {
    $action = key($_GET);
    $arg = current($_GET);
}

$actions = [
    'pro' => Action('Pro'),
    'contra' => Action('Contra'),
    'show' => Action('Show'),
    'connect' => Action('Ping'),
    'sync' => Action('Sync'),
    'notify' => Action('Notify'),
    'wish' => Action('WishRouter'),
];

if (!isset($actions[$action])) {
    die("invalid action");
} else {
    synchronized($actions[$action]);
}