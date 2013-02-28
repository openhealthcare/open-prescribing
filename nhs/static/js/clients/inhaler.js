//
// inhaler.js

// Open Prescribing API Client example application
//
//
// The Inhaler app shows the relative ratios of prescribing
// between two buckets of inhalers that the researchers are
// interested in for reasons documented on the page.
//
// This example is deliberately minimal in order to show a
// basic use case on which to build.

// Coding begins
(function(context, namespace){

    // Set up the Marionette app & the prescribing.js instance.
    var Inhaler = context[namespace] = new Backbone.Marionette.Application();
    var OP = new Scrip({api_host: window.location.host});

    Inhaler.addRegions({container: '#inhaler-map'});
    Inhaler.addInitializer(function(options){
        var results = new OP.views.ResultLayout();
        Inhaler.container.show(results);
        var mapview = OP.maps.bucket({
            bucket1: metered,
            bucket2: powdered,
            practices: true
        });
        OP.trigger('results:new_view', mapview);
    });

})(this.window||exports, "Inhaler")
