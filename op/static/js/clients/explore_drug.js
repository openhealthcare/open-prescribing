//
// explore_drug.js

// Open Prescribing API Client example application
//
//
// The drug explorer allows a user to investigate an individual
// Drug in more detail.

// Coding Begins

(function(context, namespace){

    // Setup logging
    if(typeof process !== 'undefined' && typeof process.argv !== 'undefined' && typeof require !== 'undefined'){
        _debuglog = function(x){
            if(_.indexOf(process.argv, 'explore/test/js') != -1){
                return;
            }
        }
    }else{
        _debuglog = function(x){
            console.log(x)
        }
    }

    var log = {
        debug: _debuglog
    }

    var ExControlLayout = Backbone.Marionette.Layout.extend({
        template: '#explore-drug-controls-template',

        regions: {
            filter: '#filter',
        },

    })

    // Handle callbacks on routes
    var ExploreDrugController = {

        pong: function(){ log.debug('ping -> pong') },

        per_capita_map: function(bnf_code){
            // var model = ExploreDrugApp.all_drugs.where({bnf_code: bnf_code})[0];
            log.debug('In a per capita map for ' + bnf_code + ' from a url');
            var mapview = OP.maps.scrips_per_capita({
                bnf_code:   bnf_code,
                practices:  true,
                data_tables: true
            });
            log.debug(mapview);

            // Check to see if we have a model to update the question
            var explore = function(model){OP.trigger('exploring', model);}

            var drug = new OP.models.Drug({bnf_code: bnf_code});
            drug.fetch({success: function(model, response, options){
                log.debug(model);
                explore(model);
            }
            });

        }

    };

    // This gives us unique URLs for our visualisations
    var ExploreDrugRouter = Backbone.Marionette.AppRouter.extend({

        appRoutes: {
            'explore/drug/:bnf_code': 'per_capita_map'
        },

        controller: ExploreDrugController

    });

    // Set up our client application
    var ExploreDrugApp = context[namespace] = new Backbone.Marionette.Application();

    // We want access to our prescribing.js application everywhere in this scope
    var OP = ExploreDrugApp.OP = new Scrip({
        // Currently we'll only ever serve this from the main site
        api_host: window.location.host
    })

    // Create a region to contain the main application
    ExploreDrugApp.addRegions({
        container: '#explore-container'
    });

    // On startup, create the initial views for controls, results, etc
    ExploreDrugApp.addInitializer(function(options){
        var layout = new OP.layouts.ExLayout();
        ExploreDrugApp.container.show(layout);

        questions = new OP.views.QuestionView({

            question_template: function(model){
                t =  _.template('<% if (name) { %><%= name.replace("_", " ") %>\
                                           <% }else{ \
                                                 %>Drug <% } %> prescription per capita per ccg');
                return t(model)
            },

            filename: 'percap.zip',

        });

        controls = new ExControlLayout();
        results = new OP.layouts.ResultLayout();

        // all_drugs = OP.get({
        //     resource: 'product',
        //     data: { limit: 0 }
        // });

        // ExploreDrugApp.all_drugs = all_drugs;

        drug_filter = new OP.layouts.DrugFilter({
            collection: new OP.collections.Pharmacy()
        });

        layout.question.show(questions);
        layout.controls.show(controls);
        controls.filter.show(drug_filter);
        layout.results.show(results);
    });

    // On startup, let's have a router and controller
    ExploreDrugApp.addInitializer(function(options){
        ExploreDrugApp.router = new ExploreDrugRouter();
        Backbone.history.start({pushState: true});
    });

    // Let's listen for events from the Filters
    ExploreDrugApp.addInitializer(function(options){

        OP.on('drugitem:click', function(bnf_code){
            var url = 'explore/drug/' + bnf_code
            ExploreDrugApp.router.navigate(url, {trigger: true});
        });

    })

})(this.window||exports, "ExploreDrug")
