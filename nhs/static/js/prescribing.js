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

    Practices = ScripCollection.extend({
        model: Practice,
        resource: 'practice'
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

            // CCG level data
            this.ccgs = new Ccgs({
                limit: 0
            });
            this.ccgs.on('reset', this.got_ccgs_cb, this);
            // Fetch the data
            this.ccgs.fetch({
                data: {
                    'limit': 0
                },
                success: function(){App.trigger('affordance:done', 'Fetching CCG metadata')}
            });
            // Inform the UX layer that we're doing stuff. Don't panic.
            App.trigger('affordance:add', 'Fetching CCG metadata');

            // Do we want practices?
            if(opts.practices){
                this.dataflags.practices = false;
                this.practices = new Practices({
                    limit: 0
                });
                this.practices.on('reset', this.got_practices_cb, this);
                // Fetch the data
                this.practices.fetch({
                    data: {
                        'limit': 0
                    },
                    success: function(){App.trigger('affordance:done', 'Fetching Practice metadata')}
                });
                // Inform the UX layer that we're doing stuff. Don't panic.
                App.trigger('affordance:add', 'Fetching Practice metadata');
            }

            // Set up event handlers
            this.on('show', this.render_map,  this);

        },

        // Are we ready to render yet?
        ready: function(){
            var readyp =  _.every(
                _.values(this.dataflags),
                function(x){ return x === true });
            if(readyp){
                this.heatmap_layers(this);
                this.marker_layers(this);
            }
        },

        // We've got the metadata - render if we're good to go
        got_ccgs_cb: function(){
            this.dataflags.ccg = true;
            this.ready()
        },

        // We've got the metadata - render if we're good to go
        got_practices_cb: function(){
            this.dataflags.practices = true;
            this.ready()
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
            App.trigger('affordance:add', 'Calculating Heatmap')

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
            App.trigger('affordance:done', 'Calculating Heatmap')
        },

        // We're working with a map that wants to put some markers
        // on the map - let's take care of that.
        marker_layers: function(view){
            // Make sure the UX layer knows we're still doing something
            var affordance = 'Calculating Markers';
            App.trigger('affordance:add', affordance);

            // Set up a clustered marker group
            var marker_group = new L.MarkerClusterGroup({disableClusterAtZoom: 14});
            if(view.make_markers){
                var markers = view.make_markers(marker_group);

                // Only make the clusters visible at a defined Zoom level
                function onZoomend(){
                    if(map.getZoom()>=7){map.addLayer(marker_group)};
                    if(map.getZoom()<7){map.removeLayer(marker_group);};
                };
                view.map.on('zoomend', onZoomend);

            }
            App.trigger('affordance:done', affordance);
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
            this.dataflags.ccg_buckets = false;
            this.ccg_buckets = opts.ccg_buckets;
            this.ccg_buckets.on('reset', this.got_ccg_buckets_cb, this);

            // Do we want practice level data?
            if(opts.practice_buckets){
                this.practice_buckets = opts.practice_buckets;
                this.dataflags.practice_buckets = false;
                this.practice_buckets.on('reset', this.got_practice_buckets_cb, this);
            }

        },

        // We've got the buckets - render if we're good to go
        got_ccg_buckets_cb: function(){
            this.dataflags.ccg_buckets = true;
            this.ready()
        },

        got_practice_buckets_cb: function(){
            this.dataflags.practice_buckets = true;
            this.ready()
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
            var brigade = this.ccg_buckets.models[0].attributes;
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

        // Parse the practice level data to plot on the map
        make_markers: function(group){
            log.debug('Making practice level markers');

            var aggs = this.practice_buckets.models[0].attributes;
            var practice_tpl = _.template(
                "<b><%= name %></b> <%= prop1 %>% in bucket 1\
<br><%= total_items %> total prescription items"
            )

            var found = 0;
            var missed = 0;

            this.practices.map(function(practice){
                var coords = practice.get('coords');
                // Some practices aren't linked to a Mapit postcode
                if(!coords){
                    return
                }
                var marker = L.marker(coords);
                var name = practice.get('display_name');
                var aggregate = aggs[practice.get('practice')];
                if(!aggregate){
                    missed +=1
                    // Valid cases exist where there will be no aggregate
                    // for this existant practice.
                    return;
                }
                found += 1;
                var prop1 = aggregate.group1.proportion;
                var total_items = aggregate.group1.items + aggregate.group2.items;

                marker.bindPopup(practice_tpl({
                    name: name, prop1: prop1, total_items: total_items
                }));
                group.addLayer(marker);
            });

            log.debug('found ' + found + ' missed ' + missed)

        },

    });

    // Map prescriptions per capita of an individual drug.
    PerCapitaMap = OPMap.extend({

        // Add extra setup for the percapita map
        initialize: function(opts){
            // Base class initialisation
            OPMap.prototype.initialize.call(this, opts);

            // Add our data reference
            this.ccg_scrips = opts.ccgs;
            this.dataflags.ccg_scrips = false;
            this.x = opts.x;
            this.ccg_scrips.on('reset', this.got_ccgs, this);

            // Do we want practice level data?
            if(opts.practices){
                this.practice_scrips = opts.practices;
                this.dataflags.practice_scrips = false;
                this.practice_scrips.on('reset', this.got_practices, this);
            }

        },

        // Check for readiness having got the CCG data
        got_ccgs: function(){
            this.dataflags.ccg_scrips = true;
            this.ready()
        },

        // We have practice_level data - plot it on a map
        got_practices: function(){
            this.dataflags.practice_scrips = true;
            this.ready()
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
            var aggs = this.ccg_scrips.models[0].attributes;
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
        },

        // Parse the practice level data to plot on the map
        make_markers: function(group){
            log.debug('Making practice level markers');

            var aggs = this.practice_scrips.models[0].attributes;
            var practice_tpl = _.template(
                "<b><%= name %></b> <%= count %> items presctribed"
            )

            this.practices.map(function(practice){
                var coords = practice.get('coords');
                // Some practices aren't linked to a Mapit postcode
                if(!coords){
                    return
                }
                var marker = L.marker(coords);
                var name = practice.get('display_name');
                var aggregate = aggs[practice.get('practice')];
                if(!aggregate){
                    // Sometimes the valid answer will be not to
                    // return a practice aggregate.
                    // Deal with this for practices that exist, but cannot
                    // Answer this question.
                    return
                }
                var count = aggregate.count;
                marker.bindPopup(practice_tpl({
                    name: name, count: count
                }));
                group.addLayer(marker);
            });

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
            this.$('.downloader').tooltip()
        },

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
                'query_type': opts['granularity'] || 'ccg',
                'group1': opts['group1'].join(','),
                'group2': opts['group2'].join(','),
            }})
            return brigade
        },

        //Prescription aggregate API
        prescriptionaggregate: function(opts){
            var scrips = new PrescriptionAggs();
            var granularity = opts['granularity'] || 'ccg';
            var affordance = 'Fetching ' + granularity + ' Aggregate';
            scrips.fetch({
                data: {
                    'query_type': granularity,
                    'bnf_code':   opts.bnf_code
                },
                success: function(){App.trigger('affordance:done', affordance)}
            });
            // Inform the UX layer that we're doing something
            // that could take some time
            App.trigger('affordance:add', affordance)
            return scrips;
        }

    }

    // Api wrapper for producing Map views
    var Maps = {

        // Return a view that displays the ratio of prescibing
        // different buckets of drugs per CCG
        bucket: function(opts){
            var group1 = opts.bucket1 || [];
            var group2 = opts.bucket2 || [];

            var ccg_comparison = Api.prescriptioncomparison({
                granularity: 'ccg',
                group1: group1,
                group2: group2
            });

            // Do we want practice-level data?
            var practice_comparison = false;
            if(opts.practices){
                practice_comparison = Api.prescriptioncomparison({
                    granularity: 'practice',
                    group1: group1,
                    group2: group2
                });
            }

            var bucketmap = new BucketMap({
                ccg_buckets: ccg_comparison,
                practice_buckets: practice_comparison,
                practices: true
            });
            return bucketmap;
        },

        // Return a view that displays a map representing
        // the number of prescriptions per capita
        scrips_per_capita: function(opts){
            var ccg_scrips = Api.prescriptionaggregate({
                bnf_code: opts.bnf_code,
                granularity: 'ccg'
            });

            // Do we want practice-level data on the map? Default to No.
            var practice_scrips = false
            if(opts.practices){
                practice_scrips = Api.prescriptionaggregate({
                    bnf_code: opts.bnf_code,
                    granularity: 'practice'
                });
            }

            var percapitamap = new PerCapitaMap({
                ccgs: ccg_scrips,
                practices: practice_scrips,
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
