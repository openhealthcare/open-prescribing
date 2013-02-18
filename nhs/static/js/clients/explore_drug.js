//
// explore_drug.js

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

    // The purpose of a question layout is to listen for events and
    // construct a human-understandable headline for the current
    // visualisation of our data.
    var ExQuestionView = Backbone.Marionette.ItemView.extend({

        template: function(model){
            log.debug('this is a template');
            t =  _.template(
                '<h1><% if (name) { %><%= name.replace("_", " ") %><% }else{ %>Drug <% } %> prescription per capita per CCG</h1>');
            return t(model)
        },

        initialize: function(opts){
            log.debug('question started');
            ExploreDrugApp.on('exploring', this.exploring, this);
        },

        exploring: function(model){
            log.debug(model);
            log.debug('exploringit');
            this.model = model;
            this.render();
        }

    });

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
            'click button': 'resultise',
            'keyup #filter': 'filter'
        },

        initialize: function(opts){
            ExploreDrugApp.on('controls:toggle', this.toggle, this);
        },

        // Show the results
        resultise: function(){
            log.debug('Make Heatmap!');
            var bnf_code = jQuery('#drugs select').attr('value');
            var mapview = OP.maps.scrips_per_capita({
                bnf_code: bnf_code
            });
            log.debug(mapview);
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
            var mapview = OP.maps.scrips_per_capita({
                bnf_code: bnf_code
            });
            log.debug(mapview);
            ExploreDrugApp.trigger('exploring', this.model);
            ExploreDrugApp.trigger('controls:toggle');
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
    var ExploreDrugController = Backbone.Marionette.Controller.extend({

        per_capita_map: function(granularity, bnf_code){

        }

    });

    // This gives us unique URLs for our visualisations
    var ExploreDrugRouter = Backbone.Marionette.AppRouter.extend({

        appRoutes: {
             'percapitamap/:granularity/:bnf_code': 'per_capita_map'
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
        questions = new ExQuestionView();
        controls = new ExControlLayout();
        results = new OP.views.ResultLayout();

        all_drugs = OP.get({
            resource: 'product',
            data: { limit: 0 }
        })

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
        new ExploreDrugRouter();
        Backbone.history.start();
    });


})(this.window||exports, "ExploreDrug")
