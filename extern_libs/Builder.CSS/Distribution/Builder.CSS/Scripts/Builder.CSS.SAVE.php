<?
    /*
        Builder.CSS 2.0
        http://acidjs.wemakesites.net/builder-css.html
    */

    $filename = $_POST['filename'];
    $output = $_POST['output'];

    //sleep(2);

    if(!$handle_file = fopen('../../'.$filename, 'w')) {
        exit;
    }
    
    if(fwrite($handle_file, stripslashes($output)) === true) {
        exit;
    }
?>