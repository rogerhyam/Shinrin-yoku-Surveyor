
// http://www.w3schools.com/jquerymobile/jquerymobile_ref_events.asp

// set up a namespace so we can have non-coliding functions
var shinrinyoku = {};
shinrinyoku.developer_mode = true;
shinrinyoku.submit_uri = 'http://tenbreaths.rbge.info/submit/index.php';

// duration of concious breaths
shinrinyoku.min_breaths_duration = 30;
shinrinyoku.max_breaths_duration = 90;

/*
 * The survey object class
 */
function ShinrinYokuSurvey(){
    
    // give it a uuid
    this.id = 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
        var r = Math.random()*16|0, v = c == 'x' ? r : (r&0x3|0x8);
        return v.toString(16);
    });
    
    this.ten_breaths_completed = false; // flag that they succeeded in 10 breaths
    this.complete = false; // time they finished survey and clicked save
    this.groundings = new Array();
    this.geolocation = new Object();
    
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
    
}
var sysurvey = null;

shinrinyoku.onGeoSuccess = function(position){

    // if survey is null they have given up
    if(!sysurvey) return;
    
    // update the interface with the location
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

    $('#sy-geolocation-auto p').html('<strong>Position:</strong> ' + lat + ' ' + lon + ' (&plusmn; ' + position.coords.accuracy + 'm)');
    
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
    
    console.log(error);
    
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

shinrinyoku.onPhotoSuccess = function(imageData){
    
    // write it to the survey object
    sysurvey.photo = imageData;
    
    // display it.
    $('#sy-photo img').attr('src',  imageData);
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


shinrinyoku.saveSurveyor = function(){
    var surveyor = {};
    $('input.surveyor_field,select.surveyor_field,textarea.surveyor_field').each(function(index){        
        surveyor[$(this).attr('id')] = $(this).val();
    });
    window.localStorage.setItem('surveyor', JSON.stringify(surveyor));
}

shinrinyoku.populateSurveyor = function(){
    
    var surveyor = window.localStorage.getItem('surveyor');
    if(!surveyor){
        shinrinyoku.saveSurveyor();
        surveyor = window.localStorage.getItem('surveyor');
    }
    surveyor = JSON.parse(surveyor);
    
    $('input.surveyor_field,select.surveyor_field,textarea.surveyor_field').each(function(index){
        $(this).val(surveyor[$(this).attr('id')]);
        if($(this).is('select')){
            $(this).selectmenu("refresh", true);
        }
    });
        
}

shinrinyoku.submit = function(survey_ids){
    
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
        
        // the surveyor object
        var surveyor = window.localStorage.getItem('surveyor');
        var surveyor_string = JSON.stringify(surveyor);
        
        // post it to the server
 
        $.ajax({
            url: shinrinyoku.submit_uri,
            type: 'POST',
            data: {
                'survey': survey_string,
                'surveyor': surveyor_string
            },
            success: function(data){
                console.log(data);
                console.log("About to submit photo");
                shinrinyoku.submitPhoto(survey);
                alert('Data saved');
            },
            error: function(error){
            	console.log(error);
            	alert('An error!');
            }
        });
 
        /*
        $.post(
            shinrinyoku.submit_uri,
            "survey=banana&surveyor=cake",
            function(data){
                console.log(data);
                alert('Data saved');
                shinrinyoku.submitPhoto(survey);
            }
        );
        */
        
        // move from the out to history boxes
        for(var j=0; j < outbox.length; j++){
            if(outbox[j].id == survey_id){
                history.push(outbox[i]);
                outbox.splice(j, 1);
                break;
            }
        }
        
        // remove the list item
        $('#'+ survey_id).hide();
             
    }
    
    shinrinyoku.saveBox('history', history);
    shinrinyoku.saveBox('outbox', outbox);
    
}

shinrinyoku.submitPhoto = function(survey){
    
    if(survey.photo){
        
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
                 alert( "photo uploaded" );
                 console.log("Code = " + r.responseCode);
                 console.log("Response = " + r.response);
                 console.log("Sent = " + r.bytesSent);
             },
             function(error){
                 alert("An error has occurred: Code = " + error.code);
                 console.log("upload error source " + error.source);
                 console.log("upload error target " + error.target);
             },
             options);
    }else{
        console.log('No photo to submit.')
    }
    

    
}

/*
 * W H O L E - D O C U M E N T 
 */
 $( function() {
   
     // listen for popup calls across multiple pages
     $('a.sy-metric').on('click', function(){
         $( "#strength-popup" ).data('sy-metric-anchor', $(this));
         $( "#strength-popup" ).popup('open');
     });
     
 });


/*
 *  H O M E - P A G E 
 */
 
// Triggered when the page is about to be initialized, but before enhancement has begun
$(document).on( "pagebeforecreate", "#home", function(event) {
    console.log("pagebeforecreate #home");
}); // end pagebeforecreate

// Triggered when the page has been created, but before enhancement is complete
// good to add listeners
$(document).on('pagecreate', '#home', function(e, data) {
    console.log("pagecreate #home");
});

// Triggered on the "to" page, before transition animation starts
$(document).on('pagebeforeshow', '#home', function(e, data) {
    
    // if we are viewing the home page then we can't have an active
    // survey - we need to reset it
    // FIXME - WE SHOULD DO SOME CHECKING AND WARNING HERE - MAYBE BEFORE PAGE TRANSITION STARTS.
    sysurvey = null;
    
    var outbox = shinrinyoku.getBox('outbox');
    $('#sy-outbox-count').html(outbox.length);
    
    var history = shinrinyoku.getBox('history');
    $('#sy-history-count').html(history.length);
    
});

/*
 * T E N - - B R E A T H S - P A G E 
 */
 
 // Triggered when the page has been created, but before enhancement is complete
 // good to add listeners
 $(document).on('pagecreate', '#ten-breaths', function(e, data) {

     console.log("pagecreate #ten-breaths");
    
     $('#ten-breaths-start').on('click', function(){
         
         var d = new Date();
         
         // if we are already running then cancel and return
         if(shinrinyoku.grounding_timer){
             sysurvey.groundings[sysurvey.groundings.length - 1].cancelled = d.getTime();
             $('#ten-breaths-finished').addClass('ui-disabled');
             $('#ten-breaths-start').text('Start');
             clearTimeout(shinrinyoku.grounding_timer);
             shinrinyoku.grounding_timer = false;
             return;
         }
         
         // Start them off
         sysurvey.groundings[sysurvey.groundings.length] = { 'started': d.getTime() };
         
         $('#ten-breaths-finished').removeClass('ui-disabled');
         $('#ten-breaths-start').text('Cancel');
         
         // start the timer to cancel if they fall asleep
         shinrinyoku.grounding_timer = setTimeout(function(){
                
                $('#survey-grounding-slow').popup('open');
                
                $('#ten-breaths-finished').addClass('ui-disabled');
                $('#ten-breaths-start').text('Start');
                shinrinyoku.ten_breaths_running = false;               

                if(navigator.vibrate){
                    navigator.vibrate([300,500,300,500,300]);
                }
                
             }, shinrinyoku.max_breaths_duration * 1000);
         
     });
     
    
     $('#ten-breaths-finished').on('click', function(){
         
         // stop the breath timer
         if(shinrinyoku.grounding_timer){
             clearTimeout(shinrinyoku.grounding_timer);
             shinrinyoku.grounding_timer = false;
         }
         
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
             $('#ten-breaths-finished').addClass('ui-disabled');
             $('#ten-breaths-start').text('Start');
         }else{
             
             sysurvey.ten_breaths_completed = true;
             
             // they are ready to save..
             $('#ten-breaths-text').removeClass('ui-disabled');
             $('#ten-breaths-photo').removeClass('ui-disabled');
             $('#ten-breaths-save').removeClass('ui-disabled');
             $('#ten-breaths-start').text('Start');
             $('#ten-breaths-start').addClass('ui-disabled');
             $('#ten-breaths-finished').addClass('ui-disabled');
             
             // hopefully we have a position by now - if so we show it
             // if not we ask them to enter one
             
             console.log(sysurvey);
             
             if(sysurvey.geolocation.error){
                 $('#sy-geolocation-auto').hide();
                 $('#sy-geolocation-manual').show();
                 $('#sy-geolocation-manual textarea').focus();
             }else{
                 $('#sy-geolocation-manual').hide();
                 $('#sy-geolocation-auto').show();
                 $('#ten-breaths-text').focus();
             }
             
         }

     });
     
     // listen to the back button to validate etc
     $('#ten-breaths-back').on('click', function(){

         // FIXME - CHECK WE ARE OK TO MOVE BACK TO home page
         
         // 1) Is the timer running - are they breathing?
         if(shinrinyoku.grounding_timer){
             
             // stop the timer
             if(shinrinyoku.grounding_timer){
                 clearTimeout(shinrinyoku.grounding_timer);
                 shinrinyoku.grounding_timer = false;
             }
             
             // forget the survey
             sysurvey = null;

             // stop the gps watcher 
             shinrinyoku.stopGps();             
             
         }
         
         console.log(sysurvey);
         
         // 2) Have they finished and don't want to save?
         if(sysurvey.ten_breaths_completed){
             $('#ten-breaths-save-popup').popup('open');
          }else{
             // go to the home page
             $("body").pagecontainer("change", "#home", {
                 transition: 'slide',
                 reverse: true,
             });
         }
         

     });
     
     $('#sy-photo-take button').on('click', function(){
         
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
         
     })
     
     $('#sy-photo').on('click', function(){
         
         // write it to the survey object
         sysurvey.photo = false;

         // display it.
         $('#sy-photo').hide('slow');
         $('#sy-photo img').attr('src', "");
         $('#sy-photo-take').show();
         
     });
     
     $('#ten-breaths-popup-discard').on('click', function(){
         // forget the survey
         sysurvey = null;
         // go to the home page
         $("body").pagecontainer("change", "#home", {
             transition: 'slide',
             reverse: true,
         });
     });
     
     $('#ten-breaths-save, #ten-breaths-popup-save').on('click', function(){

         // double check the gps is stopped
         shinrinyoku.stopGps();

         // save the survey - 
         var now = new Date();
         sysurvey.completed = now.getTime();
         sysurvey.timezoneOffset = now.getTimezoneOffset();
         // not sure if daylight saving is always included...
         
         // values on the form 
         sysurvey.textComments = $('#ten-breaths-text').val();
         sysurvey.geolocation.manual = $('#geolocation-manual-text').val();
         
         // fixme - photo

         // add it to the outbox
         var outbox = shinrinyoku.getBox('outbox');
         outbox.push(sysurvey);
         shinrinyoku.saveBox('outbox', outbox);

         sysurvey = null;
         $("body").pagecontainer("change", "#home", {
                  transition: 'slide',
                  reverse: true,
              });

     });
     
 });

 // Triggered on the "to" page, before transition animation starts
 // good to set state
 $(document).on('pagebeforeshow', '#ten-breaths', function(e, data) {
     
     // we must have a sysurvey object to use
     if(sysurvey == null){
         sysurvey = new ShinrinYokuSurvey();
     }
    
    if(shinrinyoku.developer_mode){
        shinrinyoku.min_breaths_duration = 2;
        shinrinyoku.max_breaths_duration = 5;
    }
    
    // set the buttons ready for a new breathing exercise
    $('#ten-breaths-start').text('Start');
    $('#ten-breaths-start').removeClass('ui-disabled');
    $('#ten-breaths-finished').addClass('ui-disabled');
    $('#ten-breaths-text').addClass('ui-disabled');
    $('#ten-breaths-photo').addClass('ui-disabled');
    $('#ten-breaths-save').addClass('ui-disabled');
    
    // hide the geo fields till we stop
    $('#sy-geolocation-auto').hide();
    $('#sy-geolocation-auto p').html('');
    $('#sy-geolocation-manual').hide();
    $('#sy-geolocation-manual textarea').val('');
    
    // no text at start
    $('#ten-breaths-text').val('');
    
    // no photo at start
    $('#sy-photo').hide();
    $('#sy-photo img').attr('src', '');
    $('#sy-photo-take').show();
    

    
});

 
/*
 * S U R V E Y O R - P A G E 
 */
 // good to add listeners
 $(document).on('pagecreate', '#surveyor', function(e, data) {

     // listen for keyup on any field
     $('.surveyor_field').keyup(function(){
         shinrinyoku.saveSurveyor();
     });
     
     // listen for the clear button on any text field
     $('input.surveyor_field').parent().find('.ui-input-clear').on('click', function () {
        shinrinyoku.saveSurveyor();
     });

     // listen for changing select lists
     $('select.surveyor_field').on('change', function () {
        shinrinyoku.saveSurveyor();
     });
 
 });
 // good to set state
 $(document).on('pagebeforeshow', '#surveyor', function(e, data) {
     shinrinyoku.populateSurveyor();
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
        console.log(survey);

        var li = $('<li></li>');
        li.attr('id', survey.id);

        var a1 = $('<a href="#"></a>');
        li.append(a1);
        a1.data('sy-survey-id', survey.id);
                
        var h3 = $('<h3></h3>');
        if(survey.name)h3.html(survey.name);
        else h3.html('~ no name ~');
        
        a1.append(h3);
        
        var p = $('<p></p>');
        var d = new Date(survey.started);
        p.html(d.toString());
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
    console.log($('div#outbox div.ui-content ul'));
    
    // we can only empty a history if we have one
    if(outbox.length > 0){
        $('#submit-all').removeClass('ui-disabled');
    }else{
        $('#submit-all').addClass('ui-disabled');
         var li = $('<li>Outbox is empty.</li>');
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
       
         console.log(survey);

         var li = $('<li></li>');
         li.attr('id', survey.id);
         li.attr('data-icon', 'action');

         var a1 = $('<a href="#"></a>');
         li.append(a1);
         a1.data('sy-survey-id', survey.id);
         
         

         var h3 = $('<h3></h3>');
         if(survey.name) h3.html(survey.name);
         else h3.html('banana');
         a1.append(h3);

         var p = $('<p></p>');
         var d = new Date(survey.started);
         p.html(d.toString());
         a1.append(p);

         // listen for view item request
         a1.on('click', function(){        
            console.log("takes you to that place..");
         });

         $('div#history div.ui-content ul').append(li).trigger('create');
     }
     $('div#history div.ui-content ul').listview().listview('refresh');
     //console.log($('div#history div.ui-content ul'));
     
     // we can only empty a history if we have one
     if(history.length > 0){
         $('#clear-history-button').removeClass('ui-disabled');
     }else{
         $('#clear-history-button').addClass('ui-disabled');
          var li = $('<li>History is empty.</li>');
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
      
      
      console.log('You are in!!');
  });

});

/*
 *  D E V E L O P E R - P A G E
 */
 // good to set state
 $(document).on('pagebeforeshow', '#developer', function(e, data) {
    
     $('#developer-mode').prop('checked', shinrinyoku.developer_mode).checkboxradio('refresh');
     $('#developer-submit-uri').val(shinrinyoku.submit_uri);
     
 });
 // good to add listeners
 $(document).on('pagecreate', '#developer', function(e, data) {
 
    $('#developer-save-button').on('click', function(){
        shinrinyoku.developer_mode = $('#developer-mode').prop('checked');
        shinrinyoku.submit_uri = $('#developer-submit-uri').val();
    });
     
 });
 
    

