/* Jquery Image Uploader 0.1
*  Copyright 2012, Kenneth Spencer
*  Licensed under the MIT License
*/

function imageUploader(selector, options)
{
    this.options = {
        'preview' : {
            "resizeWidth" : 100,
            "resizeHeight" : 100,
            "default" : null,
        },
        'resizeWidth' : null,
        'resizeHeight' : null,
        'uploadPath' : null,
        'deletePath' : null,
        'multiple' : false
    }

    if (options) {
        this.options = $.extend(true, this.options, options);
    }
        
    this.node = $(selector);    

    var self = this;
    this.HTML5 = window.FileReader ? true : false;

    this.renderPreview();
    if (this.HTML5) {
        this.htmlUploader();
    }
}

imageUploader.prototype.renderPreview = function()
{
    var self = this;
    var opt = this.options;

    var preview = '<div class="image-uploader-preview"></div>';
    this.preview = $(preview).appendTo(this.node);

    this.image = $('<img/>').appendTo(this.preview);
    this.image.css({
        'max-width' : (opt.preview.resizeWidth),
        'max-height' : (opt.preview.resizeHeight)
    });

    if (opt.preview.image) {
        this.image.prop('src',  opt.preview.image);
    } else if (opt.preview.default) {
        this.image.prop('src',  opt.preview.default);
    } else {
        this.image.css('display', 'none');
    }
}

imageUploader.prototype.htmlUploader = function()
{
    var self = this;
    var opt = this.options;

    var progress = '<div class="image-uploader-progress"><div class="image-uploader-percenter"></div></div>';

    var remove = '<div class="image-uploader-delete">Delete</div>';

    var browse = '<span class="image-uploader-browse">';
    browse += '<div class="image-uploader-input"><input type="file" /></div>';
    browse += '<button type="button">Change Image</button>';
    browse += '</span>';

    this.remove = $(remove).appendTo(this.node);
    this.progress = $(progress).appendTo(this.node);
    this.browse = $(browse).appendTo(this.node);

    this.input = this.browse.find('input');

    this.progress.css({
        'display' : 'none',
    });

    this.browse.css({
        'overflow' : 'hidden'
    });

    if (this.browse.css('position') != 'absolute') {
        this.browse.css('position', 'relative');
    }

    this.input.css({
        'opacity' : 0,
        'position' : 'absolute',
        'top' : 0,
        'right' : 0,
        'background' : 'red',
        'height' : '100%',
        'cursor' : 'pointer'
    });

    var input = this.input
    .prop('multiple', this.options.multiple)
    .on("change", function()
    {
        var max = self.multiple ? this.files.length : 1;
        for (var i = 0; i < max; i++) {
            var file = this.files[i];
            if (file.type == "image/jpeg" || file.type == "image/png" || file.type == "image/gif") {
                self.upload(file);
            }
        }
        this.value = '';

    })

    this.browse.on("mousemove", function(evt)
    {
        var offset =self.browse.offset();
        var width = self.browse.width();

        input.css("right",  width - (evt.pageX - offset.left) - 10);
    });

    this.remove.on('click', function()
    {
        $(this).fadeOut();
        
        self.image.fadeOut(function()
        {
            self.image.prop('src', self.options.preview.default);
            self.image.fadeIn();
        });        
    });
}

imageUploader.prototype.upload = function(file)
{
    var self = this;
    var formData = new FormData();
    formData.append('file', file);

    var size = file.size;
    var filename = file.name;
    var type = file.type;

    var percenter = $(".image-uploader-percenter", this.node);
    percenter.css('width', 0);

    this.browse.fadeOut(200, function()
    {
        self.progress.fadeIn(200);
    });


    /*  Upload the file to the server
     *
     */
    if (!this.options.uploadPath) {
        this.setPreview(file);
        this.progress.hide();
        this.browse.fadeIn();
        return;
    }

    var xhr = new XMLHttpRequest();
    xhr.onload = function(evt)
    {
        self.progress.stop().fadeOut(200, function()
        {
            self.browse.stop().fadeIn();
        });

        if (xhr.status != 200) {
            alert("There was an error uploading your file");
            return;
        }

        if (this.getResponseHeader("Content-Type") == 'application/json') {
            var data = JSON.parse(this.responseText);                
        } else {
            alert(this.responseText || "Error uploading File");
            return;
        }

        self.setPreview(file);
    }
    
    xhr.upload.onprogress = function(evt)
    {
        var percent = (evt.position / evt.totalSize) * 100;
        percenter.css('width', percent + '%');
    }
                            
    xhr.open('POST', this.options.uploadPath, true);
    xhr.send(formData);  
}

imageUploader.prototype.setPreview = function(file)
{
    var self = this;
    var opt = this.options;
    var reader = new FileReader();
    reader.onload = function(evt)
    {
        self.image.fadeOut(function()
        {
            self.image.prop('src', evt.target.result);
            self.image.fadeIn();
            $(self.remove).stop().show();
        }); 
    }
    reader.readAsDataURL(file);
}

imageUploader.prototype.toFile = function (dataURI)
{
    var split = dataURI.split(',');
    var type = split[0].match(/data:([^;]+)/)[1];

    var binary = atob(split[1]);
    var array = [];
    for(var i = 0; i < binary.length; i++) {
        array.push(binary.charCodeAt(i));
    }

    var blob = new Blob([new Uint8Array(array)], {
        type: type
    });
    return blob;
}

imageUploader.prototype.computeResize = function (image, width, height)
{
    var newWidth = image.widtt;
    var newHeight = image.height;

    if (width < image.width) {
        newWidth = width;
        newHeight = Math.floor((image.width / width) * image.height);            
    }
    
    if (height < newHeight) {
        newHeight = height;
        newWidth = Math.floor((newHeight / height) * newWidth);            
    }

    if (newWidth != image.width || newHeight != image.height) {
        return [newWidth, newHeight];    
    }

    return false;
}

imageUploader.prototype.resize = function (image, width, height, type)
{
    var canvas = document.createElement('canvas');
    canvas.width = width;
    canvas.height = height;
    var ctx = canvas.getContext('2d');
    ctx.drawImage(image, 0, 0, width, height);

    if (type) {
        return canvas.toDataURL(type);
    } else {
        return canvas.toDataURL();
    }
}    

