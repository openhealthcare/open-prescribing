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

    var ExLayout = Backbone.Marionette.Layout.extend({
        template: '#explore-layout-template',

        regions: {
            question: '#explore-question',
            controls: '#explore-controls',
            results: '#explore-results'
        },


    });

    var ExControlLayout = Backbone.Marionette.Layout.extend({
        template: '#explore-drug-controls-template',

        regions: {
            drugs: '#drugs',
        },

        events: {
            'keyup #filter': 'filter'
        },

        initialize: function(opts){
            ExploreDrugApp.on('controls:toggle', this.toggle, this);
        },

        // Filter the visible drugs
        filter: function(event){
            log.debug('filtering')
            var val = this.$('#filter').attr('value');
            log.debug(val);
            this.drugs.currentView.filter(val);
        },

        // Toggle the visibility of the controls
        toggle: function(){
            // if(this.$el.is(':visible')){
            //     this.$el.slideUp();
            // }else{
            //     this.$el.slideDown();
            // }
        }

    })

    var DrugListItemView = Backbone.Marionette.ItemView.extend({
        template: '#drug-option-template',
        tagName: 'li',
        events: {
            'click': 'resultise'
        },

        resultise: function(event){
            log.debug('Make Heatmap!');
            var bnf_code = this.model.get('bnf_code');
            var url = 'explore/drug/percapitamap/ccg/' + bnf_code
            ExploreDrugApp.router.navigate(url, {trigger: true});
        },

        onRender: function(){
            this.$el.attr('value', this.model.get('bnf_code'));
            return
        }
    });

    var DrugSelectView = Backbone.Marionette.CollectionView.extend({
        itemView: DrugListItemView,
        tagName: 'ul',

        // We'd like to hide any drugs that don't match VAL
        filter: function(val){
            log.debug(val);
            var matches = _(this.collection.search(val)).pluck('cid');
            this.$('li').toggle(false);

            _.each(
                matches, function(x){
                    this.children._views[this.children._indexByModel[x]].$el.toggle(true);
                },
                this);
        }
    });

    // Handle callbacks on routes
    var ExploreDrugController = {

        pong: function(){ log.debug('ping -> pong') },

        per_capita_map: function(granularity, bnf_code){
            var model = ExploreDrugApp.all_drugs.where({bnf_code: bnf_code})[0];
            log.debug('In a per capita map for ' + bnf_code + ' from a url');
            var mapview = OP.maps.scrips_per_capita({
                bnf_code: bnf_code
            });
            log.debug(mapview);
            ExploreDrugApp.trigger('controls:toggle');

            // Check to see if we have a model to update the question
            var explore = function(model){OP.trigger('exploring', model);}

            if(_.isUndefined(model)){
                log.debug('No model yet');
                ExploreDrugApp.all_drugs.once('reset', function(){
                    log.debug('Got the drug list. Updataing the question with metatada');
                    var model = ExploreDrugApp.all_drugs.where({bnf_code: bnf_code})[0];
                    explore(model);
                });
            }else{
                explore(model);
            }

        }

    };

    // This gives us unique URLs for our visualisations
    var ExploreDrugRouter = Backbone.Marionette.AppRouter.extend({

        appRoutes: {
            'explore/drug/ping': 'pong',
            'explore/drug/percapitamap/:granularity/:bnf_code': 'per_capita_map'
        },

        controller: ExploreDrugController

    });

    // Set up our client application
    var ExploreDrugApp = context[namespace] = new Backbone.Marionette.Application();

    // We want access to our prescribing.js application everywhere in this scope
    var OP = new Scrip({
        // Currently we'll only ever serve this from the main site
        api_host: window.location.host
    })

    // Create a region to contain the main application
    ExploreDrugApp.addRegions({
        container: '#explore-container'
    });

    // On startup, create the initial views for controls, results, etc
    ExploreDrugApp.addInitializer(function(options){
        var layout = new ExLayout();
        ExploreDrugApp.container.show(layout);
        questions = new OP.views.QuestionView({

            template: function(model){
                log.debug('this is a template');
                t =  _.template(
                    '<h3>\
<a href="<%= window.location.href.replace("explore", "raw") %>/raw.zip"> \
<i class="icon-download"></i></a>\
<i class="icon-question-sign"></i>\
<% if (name) { %><%= name.replace("_", " ") %><% }else{ %>drug <% } %> prescription per capita per ccg</h3>');
                return t(model)
            }

        });

        controls = new ExControlLayout();
        results = new OP.views.ResultLayout();

        all_drugs = OP.get({
            resource: 'product',
            data: { limit: 0 }
        });

        ExploreDrugApp.all_drugs = all_drugs;

        drugs = new DrugSelectView({
            collection: all_drugs
        });

        layout.question.show(questions);
        layout.controls.show(controls);
        controls.drugs.show(drugs);
        layout.results.show(results);
    });

    // On startup, let's have a router and controller
    ExploreDrugApp.addInitializer(function(options){
        ExploreDrugApp.router = new ExploreDrugRouter();
        Backbone.history.start({pushState: true});
    });


})(this.window||exports, "ExploreDrug")
