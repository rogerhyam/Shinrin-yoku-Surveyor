
// http://www.w3schools.com/jquerymobile/jquerymobile_ref_events.asp

/*
 * The survey object
 */
 
function ShinrinYokuSurvey(){
    this.stage = 0;
    this.complete = false;
    this.groundings = new Array();
    this.tags = new Array();
}
var sysurvey = null;

/*
 * W H O L E - D O C U M E N T 
 */
 $( function() {
   
     // listen for popup calls across multiple pages
     $('a.sy-metric').on('click', function(){
         $( "#strength-popup" ).data('sy-metric-anchor', $(this));
         $( "#strength-popup" ).popup('open');
     });
   
     // Instantiate the strength popup on DOMReady, and enhance its contents
     // it is used across multiple pages
     $( "#strength-popup" ).enhanceWithin().popup();
     
     // listen for when the popup appear
     $( "#strength-popup" ).on('popupbeforeposition', function(event, ui){
        console.log(event);
        console.log(ui); 
     });
     
     // listen for button clicks on strength popup
     $('div#strength-popup a').on('click', function(){
         var anchor =  $( "#strength-popup" ).data('sy-metric-anchor');     
         var sy_metric = anchor.data('sy-metric');
         var sy_val = $(this).data('sy-strength');
         sysurvey[sy_metric] = sy_val;
         
         // update the view
         anchor.parent().find('.ui-li-count').html(sy_val);
         
         // remove any flagging classes
         anchor.parent().removeClass (function (index, css) {
             return (css.match(/(^|\s)sy-strength-colour-.{1,2}/g) || []).join(' ');
         });
         
         anchor.parent().addClass('sy-strength-colour-' + sy_val);
         
         console.log(sysurvey);
         $(this).parent().popup('close');
         
     });
     
     // listen for stage save buttons
     $('a.sy-save-stage').on('click', function(){
         console.log('save clicked');
         sysurvey.stage++;
         $("body").pagecontainer("change", "#survey", {
                  transition: 'slide',
                  reverse: true,
              });
     });
     
     // listen for stage cancel button
     $('a.sy-cancel-stage').on('click', function(){
         console.log('cancel clicked');
     });
     
     // listen for minute timout buttons
     $('button.sy-sampling-minute-button').on('click', function(){
         
         var button = $(this);
         var page = button.parents('div[data-role="page"]');
         
         // change the button text
         button.html(button.data('on-text'));
         
         // start a timer
         var timer = setTimeout(function(button, page){
             
             // FIXME - VIBRATE PHONE
             
             // change the button txt and disable it
             button.html('Minute complete');
             button.addClass('ui-disabled');
             
             // enable everyting else on the page
             $('a.sy-metric', page).removeClass('ui-disabled');

             // remove the timer from the page now
             page.data('sy-timer', null);
             
         },1000, button, page);
         
         // keep a reference to the timer attached to the page incase we move away
         page.data('sy-timer', timer);
         
         console.log($(this));
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
});

/*
 *  S U R V E Y - P A G E 
 */

 // Triggered when the page has been created, but before enhancement is complete
 // good to add listeners
 $(document).on('pagecreate', '#survey', function(e, data) {
    
 });

// Triggered on the "to" page, before transition animation starts
$(document).on('pagebeforeshow', '#survey', function(e, data) {
    
    if(sysurvey == null){
        sysurvey = new ShinrinYokuSurvey();
    }
    
    // check we have enabled the correct buttons
    // disable all the button and only enable the one we are on
    /*
    var stages = $('#systage-list a');
    stages.addClass('ui-disabled');
 
    if(sysurvey.stage >= stages.length){
        // we are past the end of the stages so enable the save button
        $('#sysurvey-complete').removeClass('ui-disabled');
    }else{
        // enable the stage
        $(stages[sysurvey.stage]).removeClass('ui-disabled');
        // disable the save
        $('#sysurvey-complete').addClass('ui-disabled');
    }
    */
    
});

/*
 * G R O U N D I N G - P A G E 
 */
 
 // Triggered when the page has been created, but before enhancement is complete
 // good to add listeners
 $(document).on('pagecreate', '#survey-grounding', function(e, data) {
     console.log("pagecreate #survey-grounding");
    
    
     $('#grounding-start').on('click', function(){
         var d = new Date();
         sysurvey.groundings[sysurvey.groundings.length] = { 'started': d.getTime() };
         $('#survey-grounding div.ui-content a').removeClass('ui-disabled');
         $(this).addClass('ui-disabled');
     });
     
     $('#grounding-lost, #grounding-over, #grounding-cancel').on('click', function(){
         var buttons = $('#survey-grounding div.ui-content a');
         buttons.addClass('ui-disabled');
         $(buttons[0]).removeClass('ui-disabled');
         var d = new Date();
         sysurvey.groundings[sysurvey.groundings.length - 1]['failed'] = d.getTime();
     });
    
     $('#grounding-finished').on('click', function(){
         
         var d = new Date();
         var session = sysurvey.groundings[sysurvey.groundings.length - 1];
         session.finished = d.getTime();
         var duration = session.finished - session.started;
         
         // FIXME: check the breathing time was reasonable
         console.log(sysurvey.groundings);
         alert(Math.round(duration / 1000) + ' seconds' );
         
         // got to here then we are good to go
         sysurvey.stage++;
         $("body").pagecontainer("change", "#survey", {
                 transition: 'slide',
                 reverse: true,
             });

     });
    
     
 });
 
 // Triggered on the "to" page, before transition animation starts
 // good to set state
$(document).on('pagebeforeshow', '#survey-grounding', function(e, data) {

    var buttons = $('#survey-grounding div.ui-content a');
    buttons.addClass('ui-disabled');
    $(buttons[0]).removeClass('ui-disabled');

});

/*
 * V I S U A L - P A G E 
 */
 
// Triggered when the page has been created, but before enhancement is complete
// good to add listeners
$(document).on('pagecreate', '#survey-visual', function(e, data) {
     //console.log("pagecreate #survey-visual");
});

// good to set state
$(document).on('pagebeforeshow', '#survey-visual', function(e, data) {

    // disable buttons till after minute has run
    $('div#survey-visual a.sy-metric').addClass('ui-disabled');
    
});

/*
 * A U D I T O R Y - P A G E 
 */
// good to set state
$(document).on('pagebeforeshow', '#survey-auditory', function(e, data) {
    
    // disable buttons till after minute has run
    $('div#survey-auditory a.sy-metric').addClass('ui-disabled');

});
 

/*
 * E M O T I O N A L - P A G E 
 */
$(document).on('pagecreate', '#survey-emotional', function(e, data) {

    $('div#survey-emotional div.ui-content a').on('click', function(){
        
        // have we ticked three alread? If so complain.
        var checked = $('div#survey-emotional div.ui-content a.ui-icon-check');
        
        // is it already clicked
        if($(this).data('sy-tag-on') == 'true'){
            $(this).data('sy-tag-on', 'false');
            $(this).buttonMarkup({ icon: "" });
        }else{
            if(checked.length >= 3){
                alert('too many checked');
                return;
            }
            $(this).data('sy-tag-on', 'true');
            $(this).buttonMarkup({ icon: "check", iconpos: "right"});
        }
        
        // get the newly checked list
        sysurvey.tags = new Array();
        checked = $('div#survey-emotional div.ui-content a.ui-icon-check');
        checked.each(function(i,a){
           sysurvey.tags.push($(a).data('sy-val'));
        });
        console.log(sysurvey);

    });

});
 








    
    

