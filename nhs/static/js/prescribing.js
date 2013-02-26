// prescribing.js
//

// Open Prescribing API client library
//------------------------------------

// Clients
// -------
//
// Client code should initialize an instance with such
// options as they desire.
//
// open_prescriptions = new Scrip();

// Coding Begins
// -------------

(function(context, namespace){

    // Let's sort out our dependencies
    if (typeof $ === 'undefined'&& (typeof require !== 'undefined')){
        $ = require('jquery');
    }
    if (typeof _ === 'undefined'&& (typeof require !== 'undefined')){
        _ = require('underscore');
    }
    if (typeof Backbone === 'undefined'&& (typeof require !== 'undefined')){
        Backbone = require('backbone');
    }

    // Check to see if we're running on Node
    if(typeof process !== 'undefined' && typeof process.argv !== 'undefined' && typeof require !== 'undefined'){
        _debuglog = function(x){
            // If we're running tests, don't flood stdout
            if(_.indexOf(process.argv, 'nhs/test/js') != -1){
                return;
            }
            return;
        }
    }else{
        // By default, use a browser
        _debuglog = function(x){
            console.log(x)
        }
    }

    // Let's set up some log levels shall we?
    var log = {
        debug: _debuglog
    }

    // Namespace mapping functions
    var mapping = {

        info: null,
        geojson: null,

        // Make a blank CCG feature
        CCGFeature: function(){
            feat = {
                type: 'Feature',
                properties: {
                    ccg_code: null,
                    Name: null,
                    ccg_name: null,
                    total_items: null,
                    Description: null,
                    pop_per_surgery: null,
                    no_of_practices: null,
                    no_of_lsoas: null,
                    population: null,
                    region: null
                },
                geometry: null
            }
            return feat;
        },

        initialize: function(identifier){
            var map = L.map(
                identifier,
                {
                    attributionControl: false
                }
            ).setView([53.0, -1.5], 7);
            var cloudmade = L.tileLayer('http://{s}.tile.cloudmade.com/{key}/{styleId}/256/{z}/{x}/{y}.png',
                                        {
                                            key: 'BC9A493B41014CAABB98F0471D759707',
                                            styleId: 22677
                                        }).addTo(map);
            return map;
        },

        // get color depending on the value we're heatmapping
        // This is a base implementation suitable for % ranges.
        getColor: function(d) {
            return d > 80  ? '#990000' :
                d > 70  ? '#D7301F' :
                d > 60  ? '#EF6548' :
                d > 50  ? '#FC8D59' :
                d > 40  ? '#FDBB84' :
                d > 30  ? '#FDD49E' :
                d > 20  ? '#FEE8C8' :
                '#FFF7EC';
        },

        // Style of an individual layer
        style: function(feature) {
            return {
                weight: 2,
                opacity: 1,
                color: 'white',
                dashArray: '3',
                fillOpacity: 0.7,
                fillColor: mapping.getColor(feature.properties.heatmap_property)
            };
        },

        // Highlight an individual feature
        highlightFeature: function(e) {
            var layer = e.target;
            layer.setStyle({
                weight: 5,
                color: '#666',
                dashArray: '',
                fillOpacity: 0.7
            });

            if (!L.Browser.ie && !L.Browser.opera) {
                layer.bringToFront();
            }
            mapping.info.update(layer.feature.properties);
        },

        // return our feature to normal
        resetHighlight: function(e) {
            // TODO - FIX THIS
            mapping.geojson.resetStyle(e.target);
            mapping.info.update();
        },

        // When we've selected a feature, zoom to it.
        zoomToFeature: function(e) {
            map.fitBounds(e.target.getBounds());
        },

        onEachFeature: function(feature, layer) {
            layer.on({
                mouseover: mapping.highlightFeature,
                mouseout: mapping.resetHighlight,
                click: mapping.zoomToFeature
            });
        },

        // Add a color legent to our map.
        // This is a base implementation suitable for percentage based
        // heatmaps. Other ranges must implement their own.
        make_legend: function(steps, color_fn){

            var legend = L.control({position: 'bottomright'});
            legend.onAdd = function (map) {
                var div = L.DomUtil.create('div', 'info legend'),

                labels = [],
                from, to;

                for (var i = 0; i < steps.length; i++) {
                    from = steps[i];
                    to = steps[i + 1];

                    labels.push(
                        '<i style="background:' + color_fn(from) + '"></i> ' +
                            from + (to ? '&ndash;' + to : '+'));
                }

            div.innerHTML = labels.join('<br>');
                return div;
            };
            return legend
        }
    }

    // Namespacing external services
    var services = {

    };

    // Let's have an application object to hang off from
    var App = new Backbone.Marionette.Application();

    // Set up some sensible defaults
    App.config = {
        // Send messages to the console?
        log: false,
        // API host
        api_host: 'prescriptions.openhealthcare.org.uk',
        // API version
        api_version: 'v1',

        // Collate the API details
        api_uri: function(){
            return 'http://' + App.config.api_host
                + '/api/' + App.config.api_version + '/'
        }

    }

    // Define our own generic collection
    ScripCollection = Backbone.Collection.extend({


        // Build this from the options hash
        url: function(){
            return App.config.api_uri() + this.resource + '/'
        },

        // Ignore the Metadata that Tastypie returns
        parse: function(response, options){
            log.debug("API response");
            log.debug(response);
            return response.objects || response;
        },

        // Filter the collection for names matching LETTERS
        search: function(letters){
            if(letters == "") return this;

            var pattern = new RegExp(letters,"gi");
            return this.filter(function(data) {
                return pattern.test(data.get("name"));
            });
        }

    });

    // Define our models
    var Models = {}

    Practice     = Backbone.Model.extend({});
    Drug         = Backbone.Model.extend({
        display_name: function(){
            return this.get('name').replace('_', ' ');
        }
    });
    Ccg          = Backbone.Model.extend({});
    Bucket       = Backbone.Model.extend({});
    Ratio        = Models.Ratio = Backbone.Model.extend({});
    Prescription = Backbone.Model.extend({});
    Affordance   = Backbone.Model.extend({})

    // Define Collections
    Pharmacy = ScripCollection.extend({
        model: Drug,
        resource: 'product'
    });

    // There is no good collective noun for buckets,
    // but a "brigade of buckets" sounds pretty awesome...
    Brigade = ScripCollection.extend({
        model: Bucket,
        resource: 'prescriptioncomparison',
    });

    // Container for CCG metadata
    Ccgs = ScripCollection.extend({
        model: Ccg,
        resource: 'ccgmetadata'
    });

    PrescriptionAggs = ScripCollection.extend({
        model: Prescription,
        resource: 'prescriptionaggregates'
    });

    // Views
    OPMap = Backbone.Marionette.ItemView.extend({

        // The function we'll use to set colours
        color_fun: null,

        // The steps we'll be using in our heatmapping
        steps: null,

        // The default legend maker
        make_legend: mapping.make_legend,

        constructor: function(options){
            var args = Array.prototype.slice.apply(arguments);
            Marionette.ItemView.prototype.constructor.apply(this, args);
        },

        template: function(serialised_model){
            var markup = "<center><div id=\"map\"><img src=\"https://s3-eu-west-1.amazonaws.com/prescribinganalytics/img/spinner.gif\" style='margin-top:20px;'></div></center>"
            return markup
        },

        initialize: function(opts){

            // Store boolean fetched flags
            this.dataflags = {
                ccg: false
            };

            // Store references to our data containers
            this.ccgs = new Ccgs({
                limit: 0
            });

            // Set up event handlers
            this.on('show', this.render_map,  this);
            this.ccgs.on('reset', this.got_ccgs_cb, this);

            // Get the data we're not already asking for
            this.ccgs.fetch({
                data: {
                    'limit': 0
                },
                success: function(){App.trigger('affordance:done', 'Fetching CCG metadata')}
            });
            App.trigger('affordance:add', 'Fetching CCG metadata');
            // Inform the UX layer that we're doing stuff. Don't panic.
        },

        // Are we ready to render yet?
        ready: function(){
            return _.every(
                _.values(this.dataflags),
                function(x){ return x === true });
        },

        // We've got the metadata - render if we're good to go
        got_ccgs_cb: function(){
            this.dataflags.ccg = true;
            if(this.ready()){
                this.heatmap_layers(this);
            };
            return;
        },

        // The View's markup has been rendered into the view, so
        // we're good to create the map with our JS
        render_map: function(){
            log.debug('render_map called')
            map = mapping.initialize('map')
            // mapping.make_hoverinfo(map)
            this.map = map;
        },

        // Fetching the Brigade just returned, so now we can add the CCG
        // heatmap features.
        heatmap_layers: function(view){
            log.debug('BucketMap collection got items');
            log.debug(view);
            // Inform the UX that we're doing some work
            App.trigger('affordance:add', 'Calculating Hetmap')

            // Allow the view to define it's own feature set and
            // The relevant contextual hover information
            var feature_collection = view.make_features();
            var contextual = view.make_contextual();

            if(!this.color_fun){
                var style_fun = mapping.style;
                var colouring = mapping.getColor;
            }else{
                var colouring = this.color_fun;

                style_fun = function(feature){
                    var base = mapping.style(feature)
                    base.fillColor = colouring(feature.properties.heatmap_property)
                    return base;
                }
            }

            legend = this.make_legend(this.steps, colouring)


            // Format the way Leaflet wants heatmap layers
            var geoJSON = L.geoJson(
                feature_collection,
                {
                    style: style_fun,
                    onEachFeature: mapping.onEachFeature
                }
            );


            // Finally, add our components to the map.
            legend.addTo(view.map);
            contextual.addTo(view.map);
            geoJSON.addTo(view.map);
            mapping.geojson = geoJSON;
            App.trigger('affordance:done', 'Calculating Hetmap')
        },

        // Figure out the heatmap colorings for this data range
        // Pass this explicitly so we have a known reference to the view
        make_color_fun: function(range, view){
            var min = _.min(range), max = _.max(range);
            var step = (max - min) / 8
            var steps = []
            var val = min;
            for(i=0; i < 8; i++){
                val += step
                steps.push(val);
            }

            // Set the steps on the view so that we can create
            // our heatmap appropriately
            view.steps = steps;

            var colours = [
                '#FFF7EC',
                '#FEE8C8',
                '#FDD49E',
                '#FDBB84',
                '#FC8D59',
                '#EF6548',
                '#D7301F',
                '#990000',
            ]

            var coloursteps = _.zip(steps, colours);

            fn = function(d){
                var pair = _.find(coloursteps, function(cs){ return cs[0] > d});
                if(pair){
                    return pair[1];
                }else{
                    return _.last(coloursteps)[1]
                }
            }
            this.color_fun = fn;
        }

    });

    BucketMap = OPMap.extend({

        // We know ahead of time that we're dealing with percentages, so
        // let's just set our steps statically.
        steps: [0, 20, 30, 40, 50, 60, 70, 80],

        // Add extra setup to the Open Prescribing Map
        initialize: function(opts){
            // Do the standard setup
            OPMap.prototype.initialize.call(this, opts);

            // Add our bucket references
            this.dataflags.buckets = false;
            this.buckets = opts.buckets;
            this.buckets.on('reset', this.got_buckets_cb, this);

        },

        // We've got the buckets - render if we're good to go
        got_buckets_cb: function(){
            this.dataflags.buckets = true;
            if(this.ready()){
                this.heatmap_layers(this);
            };
            return;
        },

        // What should we do when we hover over a geometry
        make_contextual: function(map){
            var info = L.control();
            mapping.info = info;

            // Create a DOM element
            info.onAdd = function (map) {
                this._div = L.DomUtil.create('div', 'info');
                this.update();
                return this._div;
            };

            // Fill our DOM element
            info.update = function (props) {
                this._div.innerHTML = '<h4>Drug Explorer</h4>'
                    +  (props ? '<b>CCG: ' + props.ccg_name + '</b><br />'
                        // + props.heatmap_property.toFixed(2) + '%'
                        + props.heatmap_property + '% of prescriptions in bucket 1'
                        + '<br />' + props.total_items + ' total prescription items'
                        + '<br />' + props.population + ' population'
                        + '<br />' + props.no_of_practices + ' GP Practices'
                        : 'Hover over a CCG');
            };
            return info;
        },

        // Given our buckets from the API. parse these into map Features,
        // matching them to our CCG geometry data
        make_features: function(){
            log.debug('parsing Brigade');
            var fc = {
                type: 'FeatureCollection'
            };
            var brigade = this.buckets.models[0].attributes;
            var ccgs = this.ccgs;

            // Loop through the Geometries, assigning characteristics
            features = _.map(
                ccgGeoms.features,
                function(geometry){
                    var feature = new mapping.CCGFeature();
                    var ccg_code = geometry.ccg_code;
                    var ccg = ccgs.where({code: ccg_code})[0];

                    feature.properties.ccg_code = ccg_code;
                    feature.properties.Name = ccg.get('title');
                    feature.properties.ccg_name = ccg.get('title');
                    feature.properties.population = ccg.get('population');
                    feature.properties.no_of_lsoas = ccg.get('lsoa_count');
                    feature.properties.region = ccg.get('region');
                    feature.properties.no_of_practices = ccg.get('no_of_practices');
                    feature.geometry = geometry.geometry;

                    var data = brigade[ccg_code] || null;

                    // No prescriptions, no ratio to show
                    if(!data){
                        feature.properties.total_items = 0;
                        feature.properties.heatmap_property = 0;
                        return feature;
                    }

                    var tot =  data.group1.items + data.group2.items;
                    feature.properties.total_items = tot;
                    feature.properties.heatmap_property = data.group1.proportion;
                    return feature
                }
            );

            fc.features = features;
            return fc;
        },

    });

    PerCapitaMap = OPMap.extend({

        // Add extra setup for the percapita map
        initialize: function(opts){
            // Base class initialisatin
            OPMap.prototype.initialize.call(this, opts);

            // Add our data reference
            this.collection = opts.collection;
            this.dataflags.collection = false;
            this.x = opts.x;
            this.collection.on('reset', this.got_collection, this);
        },

        // Check for readiness having got our collection
        got_collection: function(){
            this.dataflags.collection = true;
            if(this.ready()){
                this.heatmap_layers(this)
            }
        },


        // What should we do when we hover over a geometry
        make_contextual: function(map){
            var info = L.control();
            mapping.info = info;

            // Create a DOM element
            info.onAdd = function (map) {
                this._div = L.DomUtil.create('div', 'info');
                this.update();
                return this._div;
            };

            // Fill our DOM element
            info.update = function (props) {
                this._div.innerHTML = '<h4>Drug Explorer</h4>'
                    +  (props ? '<b>CCG: ' + props.ccg_name + '</b><br />'
                        // + props.heatmap_property.toFixed(2) + '%'
                        + props.heatmap_property + ' prescriptions per capita'
                        + '<br />' + props.total_items + ' total prescription items'
                        + '<br />' + props.population + ' population'
                        + '<br />' + props.no_of_practices + ' GP Practices'
                        : 'Hover over a CCG');
            };
            return info;
        },

        // We've got our data, let's create the heatmap features
        make_features: function(){
            log.debug('making percapita features');
            var fc = {
                type: 'FeatureCollection'
            };
            var aggs = this.collection.models[0].attributes;
            var ccgs = this.ccgs;

            var percap = [];

            // Loop through geometries, figuring out the per capita
            // feature details for each one.
            var features = _.map(
                ccgGeoms.features,
                function(geometry){
                    var feature = new mapping.CCGFeature();
                    var ccg_code = geometry.ccg_code;
                    var ccg = ccgs.where({code: ccg_code})[0];

                    feature.properties.ccg_code = ccg_code;
                    feature.properties.Name = ccg.get('title');
                    feature.properties.ccg_name = ccg.get('title');
                    feature.properties.population = ccg.get('population');
                    feature.properties.no_of_lsoas = ccg.get('lsoa_count');
                    feature.properties.region = ccg.get('region');
                    feature.properties.no_of_practices = ccg.get('no_of_practices');
                    feature.geometry = geometry.geometry;

                    var data = aggs[ccg_code] || null;

                    // No prescriptions, no ratio to show
                    if(!data){
                        feature.properties.total_items = 0;
                        feature.properties.heatmap_property = 0;
                        return feature;
                    }

                    feature.properties.total_items = data.count;
                    var scrips_per_capita = data.count/ccg.get('population');
                    feature.properties.heatmap_property = scrips_per_capita;
                    percap.push(scrips_per_capita)
                    return feature
                }
            );

            this.make_color_fun(percap, this);

            fc.features = features;
            return fc;
        }

    });


    // General purpose Marionette views that will be useful in
    // many clients

    var Views =  {}

    Views.Affordance =  Backbone.Marionette.ItemView.extend({

        template: function(serialised){
            tpl = _.template('<%= name %> <img src="/static/tastypie_swagger/images/throbber.gif" / >');
            return tpl(serialised)
        }

    });

    // The purpose of a question layout is to listen for events and
    // construct a human-understandable headline for the current
    // visualisation of our data.
    Views.QuestionView = Backbone.Marionette.ItemView.extend({

        initialize: function(opts){
            log.debug('question started');
            this.template = opts.template;
            App.on('exploring', this.exploring, this);
        },

        exploring: function(model){
            log.debug(model);
            log.debug('exploringit');
            this.model = model;
            this.render();
        }

    });


    // Capture results and display affordances on trigger
    // functions
    Views.ResultLayout = Backbone.Marionette.Layout.extend({

        template: function(serialised){
            tpl = _.template('<div id="explore-affordance"></div><div id="explore-results"></div>');
            return tpl(serialised)
        },

        regions: {
            results:    '#explore-results',
            affordance: '#explore-affordance'
        },

        // Listen for events
        initialize: function(opts){
            this.affordances = []
            App.on('results:new_view', this.new_result, this);
            App.on('affordance:add', this.add_affordance, this);
            App.on('affordance:done', this.done_affordance, this)
        },

        new_result: function(view){
            log.debug(view);
            this.results.show(view);
        },

        // We've decided to do something that could take some time.
        // Make sure we remind the user that we're doing something
        add_affordance: function(affordance){
            this.affordances.push(affordance);
            log.debug(this.affordances)
            var affview = new Views.Affordance({model: new Affordance({name: affordance})});
            this.affordance.show(affview);
            return;
        },

        // We've finished doing something, so let's remove this from the
        // Queue of affordances
        done_affordance: function(affordance){
            this.affordances =  _.without(this.affordances, affordance);
            if(this.affordances.length == 0){
                this.affordance.close();
            }else{
                var aff =  new Affordance({name: _.first(this.affordances)});
                var affview = new Views.Affordance({model: aff});
                this.affordance.show(affview);
            }
            return;
        }

    });


    // GET Api calls

    var Api = {

        product: function(opts){
            pharmacy = new Pharmacy();
            data = opts.data || {}
            pharmacy.fetch({data: data});
            return pharmacy
        },

        // Exercise the comparson API
        prescriptioncomparison: function(opts){
            brigade = new Brigade();
            brigade.fetch({data: {
                'query_type': opts['query_type'] || 'ccg',
                'group1': opts['group1'].join(','),
                'group2': opts['group2'].join(','),
            }})
            return brigade
        },

        //Prescription aggregate API
        prescriptionaggregate: function(opts){
            var scrips = new PrescriptionAggs();
            scrips.fetch({
                data: {
                    'query_type': opts['query_type'] || 'ccg',
                    'bnf_code':   opts.bnf_code
                },
                success: function(){App.trigger('affordance:done', 'Fetching Prescription Aggregate')}
            });
            // Inform the UX layer that we're doing something
            // that could take some time
            App.trigger('affordance:add', 'Fetching Prescription Aggregate')
            return scrips;
        }

    }

    // Api wrapper for producing Map views
    var Maps = {

        // Return a view that displays the ratio of prescibing
        // different buckets of drugs per CCG
        bucket: function(opts){
            var comparison = Api.prescriptioncomparison({
                group1:  opts.bucket1 || [],
                group2:  opts.bucket2 || []
            });
            var bucketmap = new BucketMap({
                buckets: comparison
            });
            return bucketmap;
        },

        // Return a view that displays a map representing
        // the number of prescriptions per capita
        scrips_per_capita: function(opts){
            var scrips = Api.prescriptionaggregate({
                bnf_code: opts.bnf_code,
                granularity: 'ccg'
            });
            var percapitamap = new PerCapitaMap({
                collection: scrips,
                x: 'total_items'
            });
            App.trigger('results:new_view', percapitamap);
            return percapitamap;
        }

    };

    var GET = function(opts){
        log.debug('Getting!');
        log.debug(opts);
        return Api[opts.resource](opts);
    }

    App.get = GET;
    App.maps = Maps;
    App.views = Views;
    App.models = Models

    // Deal with configuration options passed in to the start method.
    App.addInitializer(function(opts){
        _.extend(App.config, opts);
    });

    // Initialisation API -> api = new Scrip();
    var Scrip = context[namespace] = function(opts){
        App.start(opts);
        return App
    }


})(this.window||exports, "Scrip")
