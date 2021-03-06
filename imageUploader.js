/* Jquery Image Uploader 0.2
*  Copyright 2012, Kenneth Spencer
*  Licensed under the MIT License
*/

(function($)
{
    $.fn.imageUploader = function(options)
    {
        return this.each(function()
        {
            new imageUploader(this, options);
        });
    };
})(jQuery);


/* Get location of JS file
*/
function imageUploader(selector, options)
{
    imageUploader.counter ++;
    this.options = {
        'preview' : {
            "resizeWidth" : 100,
            "resizeHeight" : 100,
            "default" : null,
            "image" : null,
            'size' : 'thumb'
        },
        'resizeWidth' : null,
        'resizeHeight' : null,
        'uploadPath' : null,
        'deletePath' : null,
        'multiple' : false,
        'debug' : true,
        'id' : 'image-uploader-' + imageUploader.counter,
        'fieldName' : 'image'
    }

    this.path = this.getPath();

    if (options) {
        this.options = $.extend(true, this.options, options);
    }

    this.instance = this.options.id.replace(/-/g, '_');

    imageUploader[this.instance] = this;
    imageUploader.instances.push(this);
        
    this.node = $(selector);    
    this.node.addClass('image-uploader-ready');

    var self = this;

    var self = this;
    this.HTML5 = window.FileReader ? true : false;

    this.renderPreview();
    if (this.HTML5) {
        this.htmlUploader();
    } else {
        this.swfUploader();
    }
}
imageUploader.counter = 0;
imageUploader.instances = [];

imageUploader.noFlash = function(instance)
{
    var uploader = imageUploader[instance];

    var no = $(".no-flash", uploader.browseCont);
    no.css('width', 100)
    // has no width, so not visible
    if (no.prop('offsetWidth') == 0) {
        return;
    }
    uploader.flash.remove();
    $(".no-flash", uploader.browseCont).remove();
    uploader.browse.on("click", function()
    {
        alert("You must have an up to date version of Flash installed to use this feature");
    });
}

imageUploader.prototype.renderPreview = function()
{
    var self = this;
    var opt = this.options;

    var preview = '<div class="image-uploader-preview"></div>';
    this.preview = $(preview).appendTo(this.node);

    /* Firefox is having trouble firing mouse events. have this here for a backup
    */
    this.preview.on('mouseenter', function()
    {
        self.mouseleave();
    });

    this.image = $('<img/>').appendTo(this.preview);
    this.image.css({
        'max-width' : (opt.preview.resizeWidth),
        'max-height' : (opt.preview.resizeHeight)
    });

    if (opt.preview.image) {
        this.image.prop('src',  opt.preview.image);
    } else if (opt.preview['default']) {
        this.image.prop('src',  opt.preview['default']);
    } else {
        this.image.css('display', 'none');
    }
}

imageUploader.prototype.htmlUploader = function()
{
    var self = this;
    var opt = this.options;

    this.sharedHTML();

    this.browseCont.css({
        'overflow' : 'hidden'
    });

    this.browseCont.prepend('<div class="image-uploader-input"><input type="file" accept="image/*"/></div>');
    this.input = this.browseCont.find('input');

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

    }).on("mouseenter", function()
    {
        self.mouseenter();
    }).on("mouseleave", function()
    {
        self.mouseleave();    
    });

    this.browseCont.on("mousemove", function(evt)
    {
        var offset = self.browseCont.offset();
        var width = self.browseCont.width();

        input.css("right",  width - (evt.pageX - offset.left) - 10);
    });

    this.remove.on('click', function()
    {
        $(this).fadeOut();
    
        var xhr = new XMLHttpRequest();
        xhr.onload = function(evt)
        {
            if (xhr.status != 200) {
                alert("There was an error uploading your file");
                self.reset();
                return;
            }

            if (this.getResponseHeader("Content-Type") == 'application/json') {
                self.deleteResponse(this.responseText);
            } else {
                alert(this.responseText || "Error uploading File");
                self.reset();
                return;
            }
        }
    
                            
        xhr.open('GET', self.options.deletePath, true);
        xhr.send();  
    });
}

imageUploader.prototype.upload = function(file)
{
    var self = this;
    var formData = new FormData();
    formData.append(this.options.fieldName, file);

    var size = file.size;
    var filename = file.name;
    var type = file.type;

    this.open();

    /* Fake File upload for testing
    */
    if (!this.options.uploadPath && this.options.debug) {
        this.setPreview(file);
        this.reset();
        return;
    }

    /*  Upload the file to the server
     */
    var xhr = new XMLHttpRequest();
    xhr.onload = function(evt)
    {
        if (xhr.status != 200) {
            alert("There was an error uploading your file");
            self.reset();
            return;
        }
     //   self.setPreview(file);

        if (this.getResponseHeader("Content-Type") == 'application/json') {
            self.response(this.responseText);
        } else {
            alert(this.responseText || "Error uploading File");

            self.reset();
            return;
        }
    }
    
    xhr.upload.onprogress = function(evt)
    {
        self.setProgress(evt.loaded,  evt.total);
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

imageUploader.prototype.swfUploader = function()
{
    var flashVars = {
        "instance" : this.instance,
        "debug" : this.options.debug ? true : "",
        'uploadPath' : this.options.uploadPath,
        'fieldName' : this.options.fieldName
    };

    var attributes = {
        "width" : "500",
        "height" : "500",
        "alt" : "",
        "data" : this.path + "/swf/flash_uploader.swf",
        "type" : "application/x-shockwave-flash",
        "id" : this.options.id + '-object'
    }

    var params = {
        "movie" : this.path + "/swf/flash_uploader.swf",
        "wmode" : "transparent",
        "scale" : "noscale",
        "flashVars" : this.buildQuery(flashVars)
    }

    var html = "<object"
    for (var name in attributes) {
        html += " " + name + '="' + attributes[name] + '"';
    } 
    html += ">";
    for (var param in params) {
        html += '<param name="' + param + '" value="' + params[param] + '" />';
    }
    html += '<div class="no-flash">';
    html += '<img src="' + this.path + '/images/pixel.gif" onload="imageUploader.noFlash(\''+ this.instance +'\');"/>';
    html += '</div>';
    html += "</object>";

    this.sharedHTML();

    this.browseCont.prepend(html);
    this.flash = this.browseCont.find('object');

    this.flash.css({
        'outline' : 'none',
        'position' : 'absolute',
        'opacity' : 1,
        'top' : 0,
        'left' : 0
    });

    this.flash.prop('width', this.browseCont.width());
    this.flash.prop('height', this.browseCont.height());
}

imageUploader.prototype.sharedHTML = function()
{
    var self = this;
    var opt = this.options;

    var progress = '<div class="image-uploader-progress"><div class="image-uploader-percenter"></div></div>';
    var remove = '<div class="image-uploader-delete">Delete</div>';

    var browse = '<span class="image-uploader-browse">';
    browse += '<button type="button">Change Image</button>';
    browse += '</span>';

    this.remove = $(remove).appendTo(this.node);
    this.progress = $(progress).appendTo(this.node);
    this.browseCont = $(browse).appendTo(this.node);
    this.browse = this.browseCont.find('button');

    if (this.browseCont.css('position') != 'absolute') {
        this.browseCont.css('position', 'relative');
    }

    if (opt.deletePath == null || !opt.preview.image) {
        this.remove.css('display', 'none');
    }
}

imageUploader.prototype.getPath = function()
{
    var index;
    var list = $("script");
    for (var i = 0, script; script = list[i]; i++) {
        if ((index = script.src.indexOf("/imageUploader.js")) != -1) {
            return script.src.substr(0, index);
        }
    }
}

imageUploader.prototype.buildQuery = function(data)
{
    var array = [];
    for (var key in data) {
        array.push(key + '=' + encodeURIComponent(data[key]).replace("%20", "+", 'g'));
    }

    return array.join('&');
}

imageUploader.prototype.mouseenter = function()
{
    this.browse.addClass('hover');
}

imageUploader.prototype.mouseleave = function()
{
    this.browse.removeClass('hover');
}

imageUploader.prototype.open = function()
{
    var self = this;
    var percenter = $(".image-uploader-percenter", this.node);
    percenter.css('width', 0);

    this.remove.fadeOut(200);

    if (this.flash) {
        this.flash.css('left', -5000);
    }

    this.browse.fadeOut(200, function()
    {
        self.progress.fadeIn(200);
    });

    this.node.removeClass('image-uploader-ready');
    this.node.addClass('image-uploader-uploading');
}


imageUploader.prototype.setProgress = function(position, size)
{
    var percent = (position / size) * 100;
    var percenter = $(".image-uploader-percenter", this.node);
    percenter.css('width', percent + '%');
    return true;
}

imageUploader.prototype.reset = function(success)
{
    var self = this;
    var opt = this.options;
    var percenter = $(".image-uploader-percenter", this.node);
    percenter.css('width', success ? '100%' : 0);

    setTimeout(function()
    {
        self.progress.stop().fadeOut(200, function()
        {
            self.browse.stop().fadeIn();
            if (opt.preview.image && opt.deletePath) {
                self.remove.stop().fadeIn();
            } else {
                self.remove.css('display', 'none');
            }

            if (self.flash) {
                self.flash.css('left', 0);
            }
            
            self.browse.css('opacity', '');

            self.node.removeClass('image-uploader-uploading');
            self.node.addClass('image-uploader-ready');
        });
    }, 100);
}

imageUploader.prototype.deleteResponse = function(text)
{
    var self = this;
    var fail = function()
    {
        console.log(text);
        alert("There was an error deleting the file");
        this.reset();
    }


    if (text.substr(0, 1) == '{' && text.substr(-1, 1) == '}') {
        try {
            var data = JSON.parse(text);
        } catch(e) {
            fail();
            return;
        }    

        console.log("Response: " + data.message);
        switch(data.type) {
        case 'success':
            self.image.fadeOut(function()
            {
                self.image.prop('src', self.options.preview['default']);
                self.image.fadeIn();
            });

            break;
         default:
            alert(data.message);
            this.reset();
            break;
        }        
    } else {
        fail();
    }
}

imageUploader.prototype.response = function(text)
{
    var self = this;
    var fail = function()
    {
        console.log(text);
        alert("There was an error uploading the file");
        this.reset();
    }

    var setPreview = function(src)
    {
        var image = new Image();
        image.onload = function()
        {
            self.image.fadeOut(function()
            {
                self.image.prop('src', src);
                self.image.fadeIn();
            }); 
        }        
        image.src = src;
        self.options.preview.image = src;
        self.reset(true);
    }


    if (text.substr(0, 1) == '{' && text.substr(text.length -1, 1) == '}') {
        try {
            var data = JSON.parse(text);
        } catch(e) {
            fail();
            return;
        }    

        console.log("Response: " + data.message);
        switch(data.type) {
        case 'success':
            setPreview(data.images[self.options.preview.size]);
            break;
         default:
            if (jQuery.fn.dialogOpen) {
                $(self.node).dialogOpen("<span>" + data.message + "</span>", {
                    'stem' : true,
                    'id' : 'form-error-dialog'
                });
                setTimeout(function()
                {
                    $(self.node).dialogClose();
                }, 3000);
            } else {
                alert(data.message);
            }
            this.reset();
            break;
        }        
    } else {
        fail();
    };

}

