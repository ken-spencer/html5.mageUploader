<?php

$file = $_FILES['image'];

$sizes = [
    'thumb' => [100, 100],
    'display' => [800, 800],
];

$data = [];    

if (!($info = getImageSize($file['tmp_name']))) {
    return false;
}

$img = new imagick($file['tmp_name']);
$img->stripImage();
                
if ($info['mime'] == 'image/jpeg') {
    if ($img->getImageCompressionQuality() > 80) {
        $img->setImageCompressionQuality(80);
    }

    if ($info['channels'] == 4) {
        $img->setImageColorspace(Imagick::COLORSPACE_SRGB);
    }
}

$filename = preg_replace("/[ ]+/", '-', $file['name']);
$url = 'http' . (isset($_SERVER['HTTPS']) ? 's' : '' ) . '://';
$url.= $_SERVER['HTTP_HOST'] . dirname($_SERVER['REQUEST_URI']);

foreach ($sizes as $key => $size) {
    $scale_img = clone $img;
    $write_path = __DIR__ . '/files/' . $key . '-' . $filename;
    $http_path = $url . '/files/' . $key . '-' . $filename;
        
    if ($size[0] <= $img->getImageWidth() && $size[1] <= $img->getImageHeight()) {
 	    $scale_img->scaleImage($size[0], $size[1], true);
    }
   
    if (!$scale_img->writeImage($write_path)) {
    }

    $data['images'][$key] =$http_path;
}

response('success', 'Upload Successful', $data);

function response($type, $message, $data)
{
    $data['type'] = $type;
    $data['message'] = $message;
    header('Content-Type: application/json');
    echo json_encode($data);
}
