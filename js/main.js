
// http://www.w3schools.com/jquerymobile/jquerymobile_ref_events.asp

/*
 * The survey object
 */
 
function ShinrinYokuSurvey(){
    this.stage = 0;
    this.complete = false;
    this.groundings = new Array();
}
var sysurvey = null;


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
         var duration = session.finished - session.start;
         
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








    
    

