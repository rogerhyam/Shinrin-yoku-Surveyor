
// http://www.w3schools.com/jquerymobile/jquerymobile_ref_events.asp

// set up a namespace so we can have non-coliding functions
var shinrinyoku = {};
shinrinyoku.developer_mode = true;
shinrinyoku.submit_uri = 'http://shinrinyoku.rbge.info/submit.php';

// duration of concious breaths
shinrinyoku.min_grounding_duration = 30;
shinrinyoku.max_grounding_duration = 90;

/*
 * The survey object class
 */
function ShinrinYokuSurvey(){
    
    // give it a uuid
    this.id = 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
        var r = Math.random()*16|0, v = c == 'x' ? r : (r&0x3|0x8);
        return v.toString(16);
    });
    
    this.complete = false;
    this.groundings = new Array();
    this.geolocation = new Object();
    
    // tag the creation time
    var now = new Date();
    this.started = now.getTime();

    // find the location
    // fixme - this should use watch location
    navigator.geolocation.getCurrentPosition(shinrinyoku.onGeoSuccess, shinrinyoku.onGeoError);
    
}
var sysurvey = null;

shinrinyoku.onGeoSuccess = function(position){

    // if survey is null they have given up
    if(!sysurvey) return;
    
    // update the interface with the location
    if(position.coords.latitude > 0){
        var lat = position.coords.latitude.toFixed(6) + '&deg; North';
    }else{
        var lat = Math.abs(position.coords.latitude).toFixed(6) + '&deg; South';
    }
    
    if(position.coords.longitude > 0){
        var lon = Math.abs(position.coords.longitude).toFixed(6) + '&deg; East';
    }else{
        var lon = Math.abs(position.coords.longitude).toFixed(6) + '&deg; West';
    }

    $('#sy-geolocation-auto p').html(lat + ' ' + lon + ' (&plusmn; ' + position.coords.accuracy + 'm)');
    $('#sy-geolocation-auto').show();
    $('#sy-geolocation-manual').hide();
    
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
    sysurvey.geolocation.error = error;
    $('#sy-geolocation-auto').hide();
    $('#sy-geolocation-manual').show();
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
        
        
        // do a call to submit this entry
        // FIXME
        
        // if successful
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

     console.log("pagecreate #survey-grounding");
    
     $('#ten-breaths-start').on('click', function(){
         var d = new Date();
         sysurvey.groundings[sysurvey.groundings.length] = { 'started': d.getTime() };
         $('#survey-grounding div.ui-content a').removeClass('ui-disabled');
         $(this).addClass('ui-disabled');
         
         // start the timer to cancel if they fall asleep
         shinrinyoku.grounding_timer = setTimeout(function(){
                $('#survey-grounding-slow').popup('open');
                $('#grounding-lost, #grounding-over, #grounding-cancel, #grounding-finished').addClass('ui-disabled');
                $('#grounding-start').removeClass('ui-disabled');
                if(navigator.vibrate){
                    navigator.vibrate([300,500,300,500,300]);
                }
             }, shinrinyoku.max_grounding_duration * 1000);
         
     });
     
     $('#grounding-lost, #grounding-over, #grounding-cancel').on('click', function(){
         
         if(shinrinyoku.grounding_timer){
             clearTimeout(shinrinyoku.grounding_timer);
             shinrinyoku.grounding_timer = false;
         }
         
         var buttons = $('#survey-grounding div.ui-content a');
         buttons.addClass('ui-disabled');
         $(buttons[0]).removeClass('ui-disabled');
         var d = new Date();
         sysurvey.groundings[sysurvey.groundings.length - 1]['failed'] = d.getTime();
         
     });
    
     $('#grounding-finished').on('click', function(){
         
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
         if (duration < shinrinyoku.min_grounding_duration){
             $('#survey-grounding-fast').popup('open');
              var buttons = $('#grounding-lost, #grounding-over, #grounding-cancel, #grounding-finished');
              buttons.addClass('ui-disabled');
              $('#grounding-start').removeClass('ui-disabled');
         }else{
             sysurvey.stage++;
             $("body").pagecontainer("change", "#survey", {
               transition: 'slide',
               reverse: true,
             });
         }
         
         // fixme - enable rest of fields

     });
     
     // listen to the back button to validate etc
     $('#ten-breaths-back').on('click', function(){

         // FIXME - CHECK WE ARE OK TO MOVE BACK TO home page
         $("body").pagecontainer("change", "#home", {
             transition: 'slide',
             reverse: true,
         });

     });
     
     $('#ten-breaths-save').on('click', function(){

         // save the survey - there should be no need for validation
         var now = new Date();
         sysurvey.completed = now.getTime();
         sysurvey.timezoneOffset = now.getTimezoneOffset();
         // not sure if daylight saving is always included...

         // add it to the outbox
         var outbox = shinrinyoku.getBox('outbox');
         outbox.push(sysurvey);
         shinrinyoku.saveBox('outbox', outbox);

         sysurvey = null;
         $("body").pagecontainer("change", "#home", {
                  transition: 'slide',
                  reverse: true,
              });

         console.log(sysurvey);

     });
     
    
     
 });

 // Triggered on the "to" page, before transition animation starts
 $(document).on('pagebeforeshow', '#ten-breaths', function(e, data) {
     
     // we must have a sysurvey object to use
     if(sysurvey == null){
         sysurvey = new ShinrinYokuSurvey();
     }
    
    if(shinrinyoku.developer_mode){
        shinrinyoku.min_grounding_duration = 2;
        shinrinyoku.max_grounding_duration = 5;
    }
    
    // set the buttons ready for a new breathing exercise
    var buttons = $('#grounding-lost, #grounding-over, #grounding-cancel, #grounding-finished');
    buttons.addClass('ui-disabled');
    $('#grounding-start').removeClass('ui-disabled');

   
    


    
});


/*
 * V I S U A L - P A G E 
 */
 
// Triggered when the page has been created, but before enhancement is complete
// good to add listeners
$(document).on('pagecreate', '#survey-visual', function(e, data) {
    
    // listen to the back button to validate etc
    $('#survey-visual-done').on('click', function(){
        
        // FIXME - CHECK WE ARE OK TO MOVE BACK TO SURVEY
        sysurvey.stage++;
        console.log('visual done');
        $("body").pagecontainer("change", "#survey", {
            transition: 'slide',
            reverse: true,
        });
        
    });
    
     //console.log("pagecreate #survey-visual");
});

// good to set state
$(document).on('pagebeforeshow', '#survey-visual', function(e, data) {

    // we should never be on this page without an active sysurvey
    if(!sysurvey){
       $("body").pagecontainer("change", "#survey", {
           transition: 'slide',
           reverse: true,
       });         
    }

    // disable buttons till after minute has run
    $('div#survey-visual a.sy-metric').addClass('ui-disabled');
        
    // reset colours
    $('div#survey-visual a.sy-metric').parent().removeClass(function (index, css){
        return (css.match(/(^|\s)sy-strength-colour-.{1,2}/g) || []).join(' ');
    });
    
    // reset numbers
    $('div#survey-visual a.sy-metric span.ui-li-count').html('0');
    
    // enable the timer button
    var button = $('div#survey-visual button.sy-sampling-minute-button');
    button.removeClass('ui-disabled');
    button.html(button.data('ready-text'));
});

/*
 * A U D I T O R Y - P A G E 
 */

 // good to add listeners
 $(document).on('pagecreate', '#survey-auditory', function(e, data) {
    
     // listen to the back button to validate etc
     $('#survey-auditory-done').on('click', function(){

         // FIXME - CHECK WE ARE OK TO MOVE BACK TO SURVEY
         sysurvey.stage++;
         console.log('auditory done');
         $("body").pagecontainer("change", "#survey", {
             transition: 'slide',
             reverse: true,
         });

     });
});

// good to set state
$(document).on('pagebeforeshow', '#survey-auditory', function(e, data) {
    
    // we should never be on this page without an active sysurvey
    if(!sysurvey){
       $("body").pagecontainer("change", "#survey", {
           transition: 'slide',
           reverse: true,
       });         
    }
    
    // disable buttons till after minute has run
    $('div#survey-auditory a.sy-metric').addClass('ui-disabled');
    
    // reset colours
    $('div#survey-auditory a.sy-metric').parent().removeClass(function (index, css){
        return (css.match(/(^|\s)sy-strength-colour-.{1,2}/g) || []).join(' ');
    });
    
    // reset numbers
    $('div#survey-auditory a.sy-metric span.ui-li-count').html('0');
    
    // enable the timer button
    var button = $('div#survey-auditory button.sy-sampling-minute-button');
    button.removeClass('ui-disabled');
    button.html(button.data('ready-text'));

});
 

/*
 * E M O T I O N A L - P A G E 
 */
$(document).on('pagecreate', '#survey-emotional', function(e, data) {

    $('div#survey-emotional div.ui-content a').on('click', function(){
    
        // is it already clicked unclick it
        if($(this).data('sy-tag-on') == 'true'){
            $(this).data('sy-tag-on', 'false');
            $(this).buttonMarkup({ icon: "" });
        }else{
            // click it
            $(this).data('sy-tag-on', 'true');
            $(this).buttonMarkup({ icon: "check", iconpos: "right"});
        }
        
        // if three are checked disable the rest
        var checked = $('div#survey-emotional div.ui-content a.ui-icon-check');
        if(checked.length >= 3){
            $('div#survey-emotional div.ui-content a').not('.ui-icon-check').addClass('ui-disabled');
        }else{
            $('div#survey-emotional div.ui-content a').removeClass('ui-disabled');
        }
        
        // get the newly checked list
        sysurvey.tags = new Array();
        checked = $('div#survey-emotional div.ui-content a.ui-icon-check');
        checked.each(function(i,a){
           sysurvey.tags.push($(a).data('sy-val'));
        });
        console.log(sysurvey);

    });
    
    // listen to the back button to validate etc
    $('#survey-emotional-done').on('click', function(){

        // FIXME - CHECK WE ARE OK TO MOVE BACK TO SURVEY
        sysurvey.stage++;
        console.log('emotional done');
        $("body").pagecontainer("change", "#survey", {
            transition: 'slide',
            reverse: true,
        });

    });

});

// good to set state
$(document).on('pagebeforeshow', '#survey-emotional', function(e, data) {
    
    // we should never be on this page without an active sysurvey
    if(!sysurvey){
       $("body").pagecontainer("change", "#survey", {
           transition: 'slide',
           reverse: true,
       });
       return;
    }
    
    // the list items are arranged randomly to prevent habit ticking
    var ul = $('ul#survey-emotional-list');
    var li = ul.children("li");
    li.each(function(){
       $(this).data('random-sort', Math.random());
    });
    
    li.detach().sort(function(a, b){
        return  $(a).data('random-sort') - $(b).data('random-sort');
    });
    ul.append(li).listview( "refresh" );
    
    // keep a record of the tag order
    sysurvey.tag_order = new Array();
    li.each(function(index){
       sysurvey.tag_order[index] = $(this).children('a').data('sy-val');
    });
    
});

/*
 * O V E R A L L - P A G E
 */
 // good to add listeners
 $(document).on('pagecreate', '#survey-overall', function(e, data) {
     
     // listen to the back button to validate etc
     $('#survey-overall-done').on('click', function(evt){
         
         // save the location name
         var location_name = $('#sy-location_name').val();
         if(!location_name){
             $('#survey-overall-no-location-name').popup('open');
             evt.preventDefault();
             return;
         }
         sysurvey.location_name = location_name;
         
         // fixme - do we have a GPS location.
         

         // FIXME - CHECK WE ARE OK TO MOVE BACK TO SURVEY
         
         
         sysurvey.stage++;
         $("body").pagecontainer("change", "#survey", {
             transition: 'slide',
             reverse: true,
         });

     });

     
 });
 // good to set state
 $(document).on('pagebeforeshow', '#survey-overall', function(e, data) {
 
     // we should never be on this page without an active sysurvey
     if(!sysurvey){
        $("body").pagecontainer("change", "#survey", {
            transition: 'slide',
            reverse: true,
        });         
     }
 
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
 
    

