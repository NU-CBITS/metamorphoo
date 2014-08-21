<?
    /*
        Builder.JS 1.0
        http://acidjs.wemakesites.net/builder-js.html
    */

    $filename = $_POST['filename'];
    $output = $_POST['output'];

    if(!$handle_file = fopen('../../'.$filename, 'w')) {
        exit;
    }

    if(fwrite($handle_file, stripslashes($output)) === true) {
        exit;
    }
?>