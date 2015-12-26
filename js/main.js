
// http://www.w3schools.com/jquerymobile/jquerymobile_ref_events.asp

// set up a namespace so we can have non-coliding functions
var shinrinyoku = {};
shinrinyoku.developer_mode = true;

// two different sites we could submit to
shinrinyoku.submit_uri_live = 'http://tenbreaths.rbge.info/submit/index.php';
shinrinyoku.submit_uri_dev = 'https://shinrin-yoku-server-rogerhyam-1.c9.io/submit/index.php';

// default to the live site
// shinrinyoku.submit_uri = shinrinyoku.submit_uri_live;
shinrinyoku.submit_uri = shinrinyoku.submit_uri_dev;


// duration of concious breaths
shinrinyoku.min_breaths_duration_default = 30;
shinrinyoku.max_breaths_duration_default = 90;
shinrinyoku.min_breaths_duration_developer = 1;
shinrinyoku.max_breaths_duration_developer = 10;

shinrinyoku.getRandomId = function(){
    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
        var r = Math.random()*16|0, v = c == 'x' ? r : (r&0x3|0x8);
        return v.toString(16);
    });
}

shinrinyoku.onGeoSuccess = function(position){

    // if survey is null they have given up
    if(!sysurvey) return;
    
	// make a human friendly string
    if(position.coords.latitude > 0){
        var lat = position.coords.latitude.toFixed(4) + '&deg; N';
    }else{
        var lat = Math.abs(position.coords.latitude).toFixed(4) + '&deg; S';
    }
    
    if(position.coords.longitude > 0){
        var lon = Math.abs(position.coords.longitude).toFixed(4) + '&deg; E';
    }else{
        var lon = Math.abs(position.coords.longitude).toFixed(4) + '&deg; W';
    }

    sysurvey.geolocation.display_string = '<strong>Position:</strong> ' + lat + ' ' + lon + ' (&plusmn; ' + position.coords.accuracy.toFixed(2) + 'm)';

    $('#sy-geolocation-auto p').html(sysurvey.geolocation.display_string);
    
    // save the coordinates - need to make a serialisable object
    sysurvey.geolocation.longitude = position.coords.longitude;
    sysurvey.geolocation.latitude = position.coords.latitude;
    sysurvey.geolocation.accuracy = position.coords.accuracy;
    sysurvey.geolocation.altitude = position.coords.altitude;
    sysurvey.geolocation.altitudeAccuracy = position.coords.altitudeAccuracy;
    sysurvey.geolocation.heading = position.coords.heading;    
    sysurvey.geolocation.timestamp = position.timestamp;

}

shinrinyoku.onGeoError = function(error){
    
    // save the error to survey so we know what it is
    sysurvey.geolocation.error = error;
    
    // make sure we clear the watcher so we don't continue to get GPS readings
    shinrinyoku.stopGps();

}

shinrinyoku.stopGps = function(){
    if(shinrinyoku.location_watch_handle){
        navigator.geolocation.clearWatch(shinrinyoku.location_watch_handle);
        shinrinyoku.location_watch_handle = false;
    }
}


shinrinyoku.onMoveSuccess = function(acceleration){
	
	// we have a dead zone we do nothing in near the balance point
	// this prevents triggering multiple breaths 
	if(acceleration.z > -2 && acceleration.z < 2) return;
	
	var grounding = sysurvey.groundings[sysurvey.groundings.length - 1];
	
	// if this is the first breathing record for this grounding run 
	// NOTE that a breath here is a an in-breath or out-breath but from the point of view of the 
	// user an breath is "all the way in and all the way out". 
	if(!grounding.breaths){
		grounding.breaths = [{started: acceleration.timestamp, breathing_in: acceleration.z < 0 }];
	}else{
		
		var last_breath = grounding.breaths[grounding.breaths.length -1];
		
		// if we have changed direction of breath then create a new breath		
		if (last_breath.breathing_in != (acceleration.z < 0)){
			
			var breath_count = grounding.breaths.push({started: acceleration.timestamp, breathing_in: acceleration.z < 0 });
			
			// quit on count of 20 turns quit
			// give a blip of vibration as haptic feedback
			if(breath_count > 20){
                if(navigator.vibrate) navigator.vibrate([300]);
				shinrinyoku.stopBreathing();
			}else{
				if(navigator.vibrate) navigator.vibrate([1]);
			}
		
		}
		
	}
	
}

shinrinyoku.onMoveError = function(error){
	shinrinyoku.stopMove();
}

shinrinyoku.stopMove = function(){
	if(shinrinyoku.move_watcher_handle){
		navigator.accelerometer.clearWatch(shinrinyoku.move_watcher_handle);
		shinrinyoku.move_watcher_handle = false;
	}
}


shinrinyoku.onPhotoSuccess = function(imageData){
    
    // write it to the survey object
    sysurvey.photo = imageData;
    
    // display it.
    $('#sy-photo img').attr('src',  imageData);
	shinrinyoku.scaleThumbnail($('#sy-photo img'));
    $('#sy-photo-take').hide();
    $('#sy-photo').show('slow');
    
}

shinrinyoku.onPhotoError = function(message){
    // fixme this should be a proper popup
    alert(message);
}

shinrinyoku.getBox = function(box_name){
    var box = window.localStorage.getItem(box_name);
    if(!box){
        box = new Array();
    }else{
        box = JSON.parse(box);
    }
    return box;
}

shinrinyoku.saveBox = function(box_name, box){
    window.localStorage.setItem(box_name, JSON.stringify(box));
}

shinrinyoku.resetSurvey = function(){
    
     // we must have a sysurvey object to use
    sysurvey = new ShinrinYokuSurvey();
    
    if(shinrinyoku.developer_mode){
        shinrinyoku.min_breaths_duration = shinrinyoku.min_breaths_duration_developer;
        shinrinyoku.max_breaths_duration = shinrinyoku.max_breaths_duration_developer;
    }else{
        shinrinyoku.min_breaths_duration = shinrinyoku.min_breaths_duration_default;
        shinrinyoku.max_breaths_duration = shinrinyoku.max_breaths_duration_default;
    }
   
    shinrinyoku.setDisplayReady();

}

shinrinyoku.submit = function(survey_ids, silent){
	
	// FIXME - THIS SHOULD ONLY HAPPEN IF THEY ARE LOGGED IN
    
    if (typeof(silent)==='undefined') silent = false;
    
    var history = shinrinyoku.getBox('history');
    var outbox = shinrinyoku.getBox('outbox');
    
    for(var i = 0; i < survey_ids.length; i++){
        
        var survey_id = survey_ids[i];
        
        // load the survey
        for(var j=0; j < outbox.length; j++){
            if(outbox[j].id == survey_id){
                var survey = outbox[j];
                break;
            }
        }
        
        // get a string representation.
        var survey_string = JSON.stringify(survey);

        // post it to the server
        if(!silent){
            $.mobile.loading( "show", { text: 'Uploading data ...', textVisible: true});
        }
        
        $.ajax({
            url: shinrinyoku.submit_uri,
            type: 'POST',
            data: {
                'survey': survey_string
            },
            success: function(data, textStatus, xhr){

                $.mobile.loading( "hide" );
                shinrinyoku.submitPhoto(survey, silent);
                
                // move from the out to history boxes
                for(var j=0; j < outbox.length; j++){
                    if(outbox[j].id == survey_id){
                        history.push(outbox[j]);
                        outbox.splice(j, 1);
                        break;
                    }
                }
                // remove the list item
                $('#'+ survey_id).hide();
                
                shinrinyoku.saveBox('history', history);
                shinrinyoku.saveBox('outbox', outbox);
                
                // push our luck.
                // if we are in silent mode and have just been asked to upload
                // a single one then try and send any others that are in the outbox
                // so this isn't triggered when we manually upload a single one from the outbox
                if(outbox.length > 0 && silent && survey_ids.length == 1){
                    var togo = outbox[outbox.length -1];
                    shinrinyoku.submit([togo.id], true);
                }
                
            },
            error: function(xhr, textStatus){
                if(!silent){
                    $.mobile.loading( "hide" );
                    $('#outbox-no-net span').html(xhr.status);
                    $('#outbox-no-net').popup('open');
                } // not silent
            }
        });
             
    }
    
}

shinrinyoku.submitPhoto = function(survey, silent){
    
    if (typeof(silent)==='undefined') silent = false;
    
    if(survey.photo){
        if(!silent) $.mobile.loading( "show", { text: 'Uploading photo ...', textVisible: true});
        var options = new FileUploadOptions();
        options.fileKey = "file";
        options.fileName = survey.id + '.jpg';
        options.mimeType = "image/jpeg";
        options.chunkedMode = false;
        options.httpMethod = 'POST';
        options.params = {'survey_id': survey.id};
        
        var ft = new FileTransfer();
        ft.upload(
             survey.photo,
             encodeURI(shinrinyoku.submit_uri),
             function(r){
                 // success
                 $.mobile.loading( "hide" );
                 /*
				 console.log("Code = " + r.responseCode);
                 console.log("Response = " + r.response);
                 console.log("Sent = " + r.bytesSent);
				 */
             },
             function(error){
                 $.mobile.loading( "hide" );
				 // fixme - not sure what we can do when the photo fails
             },
             options);
    }
    
}

shinrinyoku.startBreathing = function(){
         
		// haptic feedback on this button
    	if(navigator.vibrate) navigator.vibrate([1]);
		 
         var d = new Date();
         
         // if we are already running then cancel and return
         if(shinrinyoku.grounding_timer){
			 
			 // if we are in dev mode then we just pretend we are done
			 // this allows testing in a browser
			 if(shinrinyoku.developer_mode){
				 shinrinyoku.stopBreathing();
				 return;
			 }else{
	             sysurvey.groundings[sysurvey.groundings.length - 1].cancelled = d.getTime();
	             //$('#ten-breaths-finished').addClass('ui-disabled');
				 shinrinyoku.setDisplayReady();
	             clearTimeout(shinrinyoku.grounding_timer);
	             shinrinyoku.grounding_timer = false;
				 shinrinyoku.stopMove();
	             return;
			 }
			 

         }
         
         // Start them off
         if(sysurvey.groundings.length == 0) sysurvey.startRecording();
         sysurvey.groundings[sysurvey.groundings.length] = { 'started': d.getTime() };
		 
         
         //$('#ten-breaths-finished').removeClass('ui-disabled');
		 shinrinyoku.setDisplayBreathing();

         // start the timer to cancel if they fall asleep
         shinrinyoku.grounding_timer = setTimeout(function(){
                
                $('#survey-grounding-slow').popup('open');
                
                //$('#ten-breaths-finished').addClass('ui-disabled');
                //$('#ten-breaths-start').text("Start");
                shinrinyoku.ten_breaths_running = false;
				shinrinyoku.setDisplayReady();
				
                if(navigator.vibrate){
                    navigator.vibrate([300,500,300]);
                }
                
                // we should have got their position by now
                shinrinyoku.stopGps();
                
             }, shinrinyoku.max_breaths_duration * 1000);
			 
		// watch for the movement of the phone to count their breaths
		if(navigator.accelerometer){
	 		shinrinyoku.move_watcher_handle = navigator.accelerometer.watchAcceleration(
	 			shinrinyoku.onMoveSuccess,
	 			shinrinyoku.onMoveError,
	 			{ frequency: 100 }
	 		);
		}
         
         
}

shinrinyoku.stopBreathing = function(){
         
         // stop the breath timer
         if(shinrinyoku.grounding_timer){
             clearTimeout(shinrinyoku.grounding_timer);
             shinrinyoku.grounding_timer = false;
         }
		 
		 // stop listening to the phone movement
		 shinrinyoku.stopMove();
         
         var d = new Date();
         var session = sysurvey.groundings[sysurvey.groundings.length - 1];
         session.finished = d.getTime();
         var duration = session.finished - session.started;
         duration = duration / 1000; // seconds is easier
         
         /*
         Respiratory rate: A person's respiratory rate is the number of breaths you take per minute. 
         The normal respiration rate for an adult at rest is 12 to 20 breaths per minute.
         A respiration rate under 12 or over 25 breaths per minute while resting is considered abnormal.
         
         therefore a breath should take between 5 seconds and 2.5 seconds
         
         So they should do 10 breaths between 25 and 50 seconds. Round it to 30 - 90 secs (for the very slow)
         
         */
         
         // too quick
         if (duration < shinrinyoku.min_breaths_duration){
             session.toofast = true;   
             $('#survey-grounding-fast').popup('open');   
             // $('#ten-breaths-finished').addClass('ui-disabled');
             // $('#ten-breaths-start').text("Start");
			 shinrinyoku.setDisplayReady();
         }else if(sysurvey.geolocation.error){
			 // FIXME - nice error if we can't get a position
			 alert(sysurvey.geolocation.error.code);
			 alert(sysurvey.geolocation.error.message);
			 shinrinyoku.setDisplayReady();
         }else{
             
             // just right!
			 sysurvey.ten_breaths_completed = true;
             shinrinyoku.stopGps();
	 
			 // if we are logged in then go to complete mode
			 // if we aren't logged in then we drop the survey and 
			 // reset to start again
			 if( window.localStorage.getItem('user_key')){
			 	 shinrinyoku.setDisplayCompleted();
			 }else{
				 shinrinyoku.resetSurvey();
				 $('#survey-grounding-not-logged-in').popup('open');
			 }
			 
			 
         }
}

shinrinyoku.scaleThumbnail = function(img){
 	
	 var img_height = img.prop('naturalHeight');
	 var img_width = img.prop('naturalWidth');
 
	 // put a hack in here incase the image hasn't loaded yet
	 // fixme - need a counter to prevent infinite loop if 
	 // image not found
	 if((img_height == 0 || img_width == 0) && !img.data('shinrinyoku-error')){
	 	setTimeout(function(){
			shinrinyoku.scaleThumbnail(img);
	 	}, 500);
		return;	 
	 }
	 
	 if(img_height >= img_width){
		 var scale = 80 / img_width;
	 }else{
	 	 var scale = 80 / img_height;
	 }
 
	 var img_width_scaled = img_width * scale;
	 var img_height_scaled = img_height * scale;

	 img.css('position', 'absolute');
	 img.css('width', img_width_scaled);
	 img.css('height', img_height_scaled);
 
	 if(img_height >= img_width){
	 	img.css('top',  ((img_height_scaled - 80) / 2) * -1  );
		img.css('left', 0);
	 }else{
		 img.css('left', ((img_width_scaled - 80) / 2) * -1 );
		 img.css('top', 0);
	 }
	 
}

shinrinyoku.getThumbnail = function(survey){
  
  // if we have an image we should return it or return null
  if(survey.photo){
 	 var idiv = $('<div class="thumbnail-wrapper"></div>');
	 var img = $('<img></img>');
	 idiv.append(img);
	 
	 // we need to catch if we fail to load the image or the 
	 // resize routine will loop infinitely
	 img.on('error', function() {
	 	 $(this).hide();
		 $(this).data('shinrinyoku-error', true);
	 });
	 
	 img.attr('src', survey.photo);
	 shinrinyoku.scaleThumbnail(img);
	 return idiv; 
  }else{
	  return null;
  }
 
}

shinrinyoku.setDisplayReady = function(){
		
    // set the buttons ready for a new breathing exercise
    $('#ten-breaths-start').text("Take Ten");
    $('#ten-breaths-start').removeClass('ui-disabled');

	// turn off user inputs
    $('#ten-breaths-text').addClass('ui-disabled');    
	$('#sy-button-grid button').addClass('ui-disabled');
	$('#ten-breaths-login2save').addClass('ui-disabled');
  
    // hide the geo fields till we stop
    $('#sy-geolocation-auto').hide();
    $('#sy-geolocation-auto p').html('');
	
    // no text at start
    $('#ten-breaths-text').val('');
    
    // no photo at start
    $('#sy-photo').hide();
    $('#sy-photo img').attr('src', '');
    $('#sy-photo-take').show();
	
	// hidden/public button is set to whatever they prefer
	shinrinyoku.setPrefersPublic(shinrinyoku.prefersPublic());
	
}

shinrinyoku.setDisplayBreathing = function(){	
    $('#ten-breaths-start').text('Cancel');
    $('#ten-breaths-start').blur();
}

shinrinyoku.setDisplayCompleted = function(){
    $('#sy-geolocation-auto').show();
    $('#ten-breaths-text').removeClass('ui-disabled');  
	$('#sy-button-grid button').removeClass('ui-disabled');
	$('#ten-breaths-login2save').addClass('ui-disabled');
    $('#ten-breaths-start').text("Take Ten");
    $('#ten-breaths-start').addClass('ui-disabled');
}

shinrinyoku.setDisplayLogin = function(){
	
	// different things depending on whether they are logged in or not.
	var userKey = window.localStorage.getItem('user_key');
	
	if(userKey){
		$('.sy-user-logged-in').show();
		$('.sy-user-logged-out').hide();
		var displayName = window.localStorage.getItem('user_display_name');
		$('.sy-user-display-name').html(displayName);
		
	}else{
		$('.sy-user-logged-in').hide();
		$('.sy-user-logged-out').show();
	}

	// clear the login and sign up forms
    $('.authentication-input').val('');
	
}

shinrinyoku.prefersPublic = function(){
	var prefers = window.localStorage.getItem('prefers-public');
	if(prefers == null){
		window.localStorage.setItem('prefers-public', JSON.stringify(false));
		return false;
	}else{
		return JSON.parse(prefers);
	}
}

shinrinyoku.setPrefersPublic = function(prefers){
	window.localStorage.setItem('prefers-public', JSON.stringify(prefers));
	if(prefers){
		$('.sy-prefers-public').show();
		$('.sy-prefers-hidden').hide();
	}else{
		$('.sy-prefers-public').hide();
		$('.sy-prefers-hidden').show();
	}
}

/*
 * The survey object class
 */
function ShinrinYokuSurvey(){
    
    // give it a uuid
    this.id = shinrinyoku.getRandomId();
    
    // tag it with the key for the current user (if there is one)
    this.user_key = window.localStorage.getItem('user_key');
    
    // tag it with the device key - dd
    this.device_key = window.localStorage.getItem('device_key');
    
    this.ten_breaths_completed = false; // flag that they succeeded in 10 breaths
    this.complete = false; // time they finished survey and clicked save
    this.groundings = new Array();
    this.geolocation = new Object();
    
    this.startRecording = function(){
        
        // tag the creation time
        var now = new Date();
        this.started = now.getTime();

        // find the location
        shinrinyoku.location_watch_handle = navigator.geolocation.watchPosition(
            shinrinyoku.onGeoSuccess,
            shinrinyoku.onGeoError,
            {
                enableHighAccuracy: true, 
                maximumAge        : 10 * 1000, 
                timeout           : 10 * 1000
            }
            );

        // set a timeout to clear the watch handler after 2 minutes no matter what - we don't want to flatten their battery
        setTimeout(shinrinyoku.stopGps, 1000 * 60 * 2 );
        
    };
    
}
var sysurvey = new ShinrinYokuSurvey();


/*
 * W H O L E - D O C U M E N T 
 */
$( function() {
     
      $.mobile.changePage.defaults.allowSamePageTransition = true;
     
     // initialise the nav panel
     $("#nav-panel").panel().enhanceWithin();
	
     // initialise the nav panel
     $( "#nav-panel" ).on( "panelbeforeopen", function( event, ui ) {
         
         var outbox = shinrinyoku.getBox('outbox');
         $('#sy-outbox-count').html(outbox.length);

         var history = shinrinyoku.getBox('history');
         $('#sy-history-count').html(history.length);
         
     } );
     
	 // initialise the logout popup
	 $('#ten-breaths-logout-popup').enhanceWithin().popup();
     
	 // listen for logging out (either on panel or page)
	 $('.sy-user-logout').on('click', function(){
		 console.log('log out requested');
		 $('#ten-breaths-logout-popup').popup('open');
	 });
	 
	 // listen for the logout button on the logout popup
	 $('#ten-breaths-logout-popup-confirm').on('click', function(){
		 localStorage.removeItem('user_key');
		 localStorage.removeItem('user_display_name');
		 shinrinyoku.setDisplayLogin();
         $("body").pagecontainer("change", "#ten-breaths");
	 });
	 
     
     // we have a unique key for this install
    var device_key = window.localStorage.getItem('device_key');
    if(!device_key){
        window.localStorage.setItem('device_key', shinrinyoku.getRandomId());
    }

     // listen for popup calls across multiple pages
     $('a.sy-metric').on('click', function(){
         $( "#strength-popup" ).data('sy-metric-anchor', $(this));
         $( "#strength-popup" ).popup('open');
     });
	 
	 // update for if we are logged in or not
	 shinrinyoku.setDisplayLogin();
	 
	 
});
 

/*
 * T E N - - B R E A T H S - P A G E 
 */
 
 // Triggered when the page has been created, but before enhancement is complete
 // good to add listeners
$(document).on('pagecreate', '#ten-breaths', function(e, data) {

     $('#ten-breaths-start').on('click', shinrinyoku.startBreathing);
     // $('#ten-breaths-finished').on('click', shinrinyoku.stopBreathing);
     
     // listen to the menu button to validate etc
     $('#ten-breaths-back').on('click', function(){

         // 1) Is the timer running - are they breathing?
         if(shinrinyoku.grounding_timer){
             
             // stop the timer
             if(shinrinyoku.grounding_timer){
                 clearTimeout(shinrinyoku.grounding_timer);
                 shinrinyoku.grounding_timer = false;
             }
             
             // show the menu 
             $('#nav-panel').panel('open');
             
         }
         
         // 2) Have they finished?
         if(sysurvey.ten_breaths_completed){
             // ask them if they want to save.
             $('#ten-breaths-save-popup').popup('open');
          }else{
             // just show the menu 
             $('#nav-panel').panel('open');
         }
         
         // stop the gps watcher 
         shinrinyoku.stopGps();

     });
	 
	 $('#ten-breaths-clear').on('click', function(){
		 sysurvey = new ShinrinYokuSurvey();
		 shinrinyoku.setDisplayReady();
		 $('#ten-breaths-clear').blur();
	 });
     
	 $('#ten-breaths-hidden').on('click', function(){
		 shinrinyoku.setPrefersPublic(!shinrinyoku.prefersPublic()); 
		 $('#ten-breaths-hidden').blur();
	 });
	 
	 
     $('#ten-breaths-photo').on('click', function(){
         
         // get out of here if you don't have a camera
         if(typeof Camera === 'undefined'){
             alert('Sorry. There is no camera access');
             return;
         }
         
         navigator.camera.getPicture(
             shinrinyoku.onPhotoSuccess,
             shinrinyoku.onPhotoError, 
             { 
               quality: 75,
               destinationType: Camera.DestinationType.FILE_URI,
               sourceType: Camera.PictureSourceType.CAMERA,
               allowEdit: false,
               correctOrientation: true,
               encodingType: Camera.EncodingType.JPEG,
               targetWidth: 1024,
               targetHeight: 1024,
               saveToPhotoAlbum: true
             }
             );
         
     });
     
     $('#sy-photo').on('click', function(){
         
         // write it to the survey object
         sysurvey.photo = false;

         // display it.
         $('#sy-photo').hide('slow');
         $('#sy-photo img').attr('src', "");
         $('#sy-photo-take').show();
         
     });
     
     $('#ten-breaths-popup-discard').on('click', function(){
         
         // reset the sysurvey
         shinrinyoku.resetSurvey();
         
         // open the menu
         $('#nav-panel').panel('open');
         
     });
     
     $('#ten-breaths-save, #ten-breaths-popup-save').on('click', function(){

         // double check the gps is stopped
         shinrinyoku.stopGps();

         // save the survey - 
         var now = new Date();
         sysurvey.completed = now.getTime();
		 sysurvey.public = shinrinyoku.prefersPublic()? 1 : 0;
         sysurvey.timezoneOffset = now.getTimezoneOffset();
         // not sure if daylight saving is always included...
         
         // values on the form 
         sysurvey.textComments = $('#ten-breaths-text').val();
         
         // add it to the outbox
         var outbox = shinrinyoku.getBox('outbox');
         outbox.push(sysurvey);
         shinrinyoku.saveBox('outbox', outbox);

         // attempt silent upload of latest survey
        setTimeout(function(){
            
            // the survey will have disappeared so we have to fetch it from the
            // outbox again
            var outbox = shinrinyoku.getBox('outbox');
            if(outbox.length > 0){
                var togo = outbox[outbox.length -1];
                shinrinyoku.submit([togo.id], true);
            }
        
        }, 0);
        
        // say thankyou.
         setTimeout(function(){
            $('#ten-breaths-thanks-popup').popup('open');
         }, 100);
         
         // reset the sysurvey for the next one
         shinrinyoku.resetSurvey();
        
     });
     
});

 // Triggered on the "to" page, before transition animation starts
 // good to set state
$(document).on('pagebeforeshow', '#ten-breaths', function(e, data) {
     // reset the sysurvey
     shinrinyoku.resetSurvey();
});

$(document).on('pageshow', '#ten-breaths', function(e, data) {
	 
});

/*
 * L O G I N - P A G E 
 *
 */
$(document).on('pagecreate', '#login', function(e, data) {
	
	// defaults
	$('.sy-login-component').show();
	$('.sy-signup-component').hide();
	$('.sy-forgot-component').hide();
	
	// select login
	$('#sy-navbar-login').on('click', function(){
		$('.sy-login-component').show();
		$('.sy-signup-component').hide();
		$('.sy-forgot-component').hide();
	});
	
	// select signup
	$('#sy-navbar-signup').on('click', function(){
		$('.sy-login-component').hide();
		$('.sy-signup-component').show();
		$('.sy-forgot-component').hide();
	});

	// select forgot password
	$('#sy-navbar-forgot').on('click', function(){
		$('.sy-login-component').hide();
		$('.sy-signup-component').hide();
		$('.sy-forgot-component').show();
	});
	
	// when the popup is closed we go home if authentication
	// process has lead to them being logged in.
	$( "#login-popup" ).on( "popupafterclose", function( event, ui ) {
		$("body").pagecontainer("change", "#ten-breaths");
	});
	
	// submit signup
	$('#signup-button').on('click', function(){
		console.log('Sign you up');
		console.log($('#signup-password').val());
		
		$.mobile.loading( "show" );
		// call server and look for response
        $.ajax({
            url: shinrinyoku.submit_uri,
            type: 'POST',
            data: {
				'authentication': 'signup',
                'display_name': $('#signup-display-name').val(),
				'email': $('#signup-email').val(),
                'password': $('#signup-password').val()
            },
            success: function(data, textStatus, xhr){

                $.mobile.loading( "hide" );
				console.log(data);
				if(data.success){
					
					// they will have been given a user key
					window.localStorage.setItem('user_key', data.userKey);
					window.localStorage.setItem('user_display_name', data.displayName);
					
					shinrinyoku.setDisplayLogin();
					
					// this time when they close the popup they are taken to the home page
					$('#login-popup-title').html("Sign Up Successful");
					$('#login-popup-message').html("<p>You are now logged in.</p><p>You have been sent an email to confirm your address.</p>");
					
				}else{
					
					// multiple errors or one
					if(data.errors.length > 1){
						$('#login-popup-title').html("Sign Up Problems");
						var errorOL = $("<ol></ol>");
						for(var i = 0; i < data.errors.length; i++){
							var errorLI = $("<li>" + data.errors[i] + "</li>");
							errorOL.append(errorLI);
						}
						$('#login-popup-message').empty();
						$('#login-popup-message').append(errorOL);
					}else{
						$('#login-popup-title').html("Sign Up Problem");
						var errorP = $("<p>" + data.errors[0] + "</p>");
						$('#login-popup-message').empty();
						$('#login-popup-message').append(errorP);
					}
				
				}
				
				// tell them about it
				$('#login-popup').popup('open');
                
            },
            error: function(xhr, textStatus){
                    $.mobile.loading( "hide" );
                    console.log(xhr);
					console.log(textStatus);
					$('#login-popup-title').html("Sign Up Error");
					$('#login-popup-message').html("There was a problem connecting to the server. Please try again later.");
					$('#login-popup').popup('open');
					
             }
        });
		
	});
	
	// submit login
	$('#login-button').on('click', function(){
		console.log('log you in');
		
		$.mobile.loading( "show" );
		// call server and look for response
        $.ajax({
            url: shinrinyoku.submit_uri,
            type: 'POST',
            data: {
				'authentication': 'login',
				'email': $('#login-email').val(),
                'password': $('#login-password').val()
            },
            success: function(data, textStatus, xhr){

                $.mobile.loading( "hide" );
				console.log(data);
				if(data.success){
					
					// they will have been given a user key
					window.localStorage.setItem('user_key', data.userKey);
					window.localStorage.setItem('user_display_name', data.displayName);
		
					shinrinyoku.setDisplayLogin();
					
					$("body").pagecontainer("change", "#ten-breaths");					
										
				}else{
					$('#login-popup-title').html("Log In Failed");
					$('#login-popup-message').html("<p>Sorry. The email or password were incorrect.</p>");
					$('#login-popup').popup('open');
				}
				
				
                
            },
            error: function(xhr, textStatus){
                    $.mobile.loading( "hide" );
                    console.log(xhr);
					console.log(textStatus);
					$('#login-popup-title').html("Login Error");
					$('#login-popup-message').html("There was a problem connecting to the server. Please try again later.");
					$('#login-popup').popup('open');
             }
        });
		
	});
	
	// submit forgot
	$('#forgot-button').on('click', function(){
		console.log('remind you up');
		// FIXME: incomplete
	});
	
});

// good to set state
$(document).on('pagebeforeshow', '#outbox', function(e, data) {

	// we always default to login
	$('.sy-login-component').show();
	$('.sy-signup-component').hide();
	$('.sy-forgot-component').hide();
	
});

/*
 * O U T B O X - P A G E
 */

// good to add listeners
$(document).on('pagecreate', '#outbox', function(e, data) {
    
    // submit all button
    $('#submit-all').on('click', function(){
        	
        var outbox = shinrinyoku.getBox('outbox');
        var survey_ids = [];
        for(i = 0 ; i< outbox.length; i++){
            survey_ids.push(outbox[i].id);
        }
        shinrinyoku.submit(survey_ids);
    });
    
    // confirm the delete of a survey in the popup
    $('#delete-confirm-button').on('click', function(){
        
        var survey_id = $(this).data('sy-survey-delete-survey-id');
        
        // remove the survey from storage
        window.localStorage.removeItem(survey_id);
        
        // remove it from the outbox
        var outbox = shinrinyoku.getBox('outbox');
        for(i=0; i < outbox.length; i++){
            if(outbox[i].id == survey_id){
                outbox.splice(i, 1);
                break;
            }
        }
        shinrinyoku.saveBox('outbox', outbox);
        
        // remove the list item
        $('#'+ survey_id).hide();
        
    });
    
});

// good to set state
$(document).on('pagebeforeshow', '#outbox', function(e, data) {
    
    // clear the list
    $('div#outbox div.ui-content ul').empty();
    
    var outbox = shinrinyoku.getBox('outbox');
    for(i = 0 ; i< outbox.length; i++){
        
        var survey = outbox[i];

        var li = $('<li></li>');
        li.attr('id', survey.id);

        var a1 = $('<a href="#"></a>');
        li.append(a1);
        a1.data('sy-survey-id', survey.id);		
		a1.append(shinrinyoku.getThumbnail(survey));
                
        var h3 = $('<h3></h3>');
        var d = new Date(survey.started);
        h3.html(d.toString(''));
        a1.append(h3);
        
        var p = $('<p></p>');
        if(survey.geolocation.display_string){
            p.html(survey.geolocation.display_string);
        }
        a1.append(p);
        
        var a2 = $('<a href="#" class="sy-survey-delete" ></a>');
        a2.data('sy-survey-id', survey.id);
        
        // listen for submit single item request
        a1.on('click', function(){        
           shinrinyoku.submit([ $(this).data('sy-survey-id') ]);
        });
        
        // listen for delete request
        a2.on('click', function(){
            // copy the id of the survey they clicked on into the dialogue
            $('#delete-confirm-button').data('sy-survey-delete-survey-id', $(this).data('sy-survey-id'));
            $('#delete-confirm').popup('open'); // launch the dialogue
        });
        
        li.append(a2);
        
        $('div#outbox div.ui-content ul').append(li).trigger('create');
    }
    $('div#outbox div.ui-content ul').listview().listview('refresh');
    
    // we can only empty a history if we have one
    if(outbox.length > 0){
        $('#submit-all').removeClass('ui-disabled');
    }else{
        $('#submit-all').addClass('ui-disabled');
         var li = $('<li data-theme="b">Outbox is empty.</li>');
         $('div#outbox div.ui-content ul').append(li).trigger('create');
         $('div#outbox div.ui-content ul').listview().listview('refresh');
    }


});


/*
 * H I S T O R Y - P A G E
 */
 // good to add listeners
 $(document).on('pagecreate', '#history', function(e, data) {
     
     $('#clear-history-confirm-button').on('click', function(){
         shinrinyoku.saveBox('history',[]);
         $('div#history div.ui-content ul').empty();
         $('clear-history-confirm').popup('close');
     });
     
 });
 
 // good to set state
 $(document).on('pagebeforeshow', '#history', function(e, data) {

     // clear the list
     $('div#history div.ui-content ul').empty();
     
     var history = shinrinyoku.getBox('history');

     for(i = 0 ; i< history.length; i++){

         var survey = history[i];

         if(survey == null) continue;
       
         var li = $('<li></li>');
         li.attr('id', survey.id);
         li.attr('data-icon', 'action');

         var a1 = $('<a href="#"></a>');
         li.append(a1);
         a1.data('sy-survey-id', survey.id);
		 a1.append(shinrinyoku.getThumbnail(survey));
		 
         var h3 = $('<h3></h3>');
         var d = new Date(survey.started);
         h3.html(d.toString(''));
         a1.append(h3);

         var p = $('<p></p>');
         if(survey.geolocation.display_string){
          p.html(survey.geolocation.display_string);
         }
         a1.append(p);
         
         var survey_url = 'http://tenbreaths.rbge.info/index.php?survey=' + survey.id;
         a1.data('survey-url', survey_url);
        
         // listen for view item request
         a1.on('click', function(){
             var url = $(this).data('survey-url');
             window.open(url, '_system');
         });

         $('div#history div.ui-content ul').append(li).trigger('create');
     }
     $('div#history div.ui-content ul').listview().listview('refresh');
     
     // we can only empty a history if we have one
     if(history.length > 0){
         $('#clear-history-button').removeClass('ui-disabled');
     }else{
         $('#clear-history-button').addClass('ui-disabled');
          var li = $('<li data-theme="b">History is empty.</li>');
          $('div#history div.ui-content ul').append(li).trigger('create');
          $('div#history div.ui-content ul').listview().listview('refresh');
     }


 });

/*
 *  A B O U T  P A G E
 */
// good to add listeners
$(document).on('pagecreate', '#about', function(e, data) {

  // special access to the hidden developer page
  $('#about h1').on('click', function(){
      
      // if we haven't been clicked set click to 1 and start a timer to clear it after a second
      if(!shinrinyoku.dev_unlock){
          shinrinyoku.dev_unlock = 1;
          setTimeout(function(){ shinrinyoku.dev_unlock = 0}, 1000);
          return;
      }
      
      // if we have been clicked but not twice already increment the button
      if(shinrinyoku.dev_unlock < 3){
          shinrinyoku.dev_unlock++;
          return;
      }
      
      // on the fourth click in under a second you are through to here!
      $("body").pagecontainer("change", "#developer", {
                transition: 'flip',
       });
      
  });

});

/*
 *  D E V E L O P E R - P A G E
 */
 // good to set state
 $(document).on('pagebeforeshow', '#developer', function(e, data) {
    
     $('#developer-mode').prop('checked', shinrinyoku.developer_mode).checkboxradio('refresh');
     
     //set the values of the check buttons correctly
     $('#developer-submit-uri-dev').val(shinrinyoku.submit_uri_dev);
     $('#developer-submit-uri-live').val(shinrinyoku.submit_uri_live);
     
     // check the one we are using at the moment
     $('input[name=developer-submit-uri][value="' +  shinrinyoku.submit_uri + '"]').attr('checked', true).checkboxradio("refresh");
     
 });
 // good to add listeners
 $(document).on('pagecreate', '#developer', function(e, data) {
 
    $('#developer-save-button').on('click', function(){
        
        shinrinyoku.developer_mode = $('#developer-mode').prop('checked');
        shinrinyoku.submit_uri = $('input[name=developer-submit-uri]:checked').val();
        
        // turn the page back
        $("body").pagecontainer("change", "#about", {
                  transition: 'flip',
                  reverse: true
        });

    });
     
 });
 
    

