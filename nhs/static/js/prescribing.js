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
        },

        // Fetch the complete set of this item from the API
        // with appropriate UX events fired.
        fetchall: function(affordance, opts){
            var data = { 'limit': 0 }
            if(opts){
                data = _.extend(data, opts);
            }
            // Inform the UX layer that we're doing stuff. Don't panic.
            App.trigger('affordance:add', affordance);

            // Fetch the data
            this.fetch({
                data: data,
                success: function(){App.trigger('affordance:done', affordance)},
                error: function(){
                    log.debug('Error callback for data fetch');
                    App.trigger('affordance:done', affordance);
                    App.trigger('affordance:error', affordance);
                }
            });

        }

    });

    // Define our models
    var Models = {}

    Practice     = Backbone.Model.extend({});
    Drug         = Models.Drug = Backbone.Model.extend({

        url: function(){
            return App.config.api_uri() + 'product/' + this.get('bnf_code');
        },

        parse: function(response, options){
            return response;
        },

        display_name: function(){
            return this.get('name').replace('_', ' ');
        }

    });
    Ccg          = Backbone.Model.extend({});
    Bucket       = Backbone.Model.extend({});
    Ratio        = Models.Ratio = Backbone.Model.extend({});
    Prescription = Backbone.Model.extend({});
    Affordance   = Backbone.Model.extend({});
    Models.PinnedAnalysis = Backbone.Model.extend({
        save: function(){
            var url = 'http://' + App.config.api_host + '/subs/pin/save'
            log.debug('saving pinned analysis');
            $.ajax(url, {
                type: 'POST',
                data: {
                    frag: this.get('frag'),
                    name: this.get('name')
                },
                success: function(data){
                    $('#pinAnalysis').modal('hide');
                    $('body').addClass('pinned');
                },
                error: log.debug
            });
        }
    });

    var Collections = {}

    // Define Collections
    Pharmacy = Collections.Pharmacy = ScripCollection.extend({
        model: Drug,
        resource: 'product',

        // Hit the server and reset ourselves.
        ajax_search: function(letters){
            var that = this;
            $.ajax(this.url(),
                   {
                       type: 'GET',
                       data: {
                           limit: 100,
                           name__icontains: letters
                       },
                       success: function(data){
                           that.reset(data.objects);
                       }
                   }
                  );
        },


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

            App.metadata.ccgs = this.ccgs;

            this.ccgs.on('reset', this.got_ccgs_cb, this);
            this.ccgs.fetchall('Fetching CCG metadata')

            // Do we want practices?
            if(opts.practices){
                this.dataflags.practices = false;
                this.practices = new Practices({
                    limit: 0
                });
                this.practices.on('reset', this.got_practices_cb, this);
                this.practices.fetchall('Fetching Practice metadata');
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

                    if(!ccg){
                        log.debug("Can't find CCG with code " + ccg_code)
                        return {}
                    }

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


    // Templates stored here for use later on
    var Templates = {}

    // The template used to render ratio comparison data
    // for CCGs
    Templates.BucketCCGTable = function(serialised){
            serialised.App = App; // Like a template context plugin
            log.debug(App.metadata.ccgs.length)
            log.debug(App.metadata.ccgs)
            log.debug('metadata tablerender')
            var tpl = _.template('\
<table class="table table-striped table-bordered table-hover">\
  <thead>\
    <tr>\
        <th>CCG ID              </th>\
        <th>CCG Name            </th>\
        <th>Bucket 1 Items      </th>\
        <th>Bucket 1 Proportion </th>\
        <th>Bucket 2 Items      </th>\
        <th>Bucket 2 Proportion </th>\
    </tr>\
  </thead>\
  <tbody\
<% _.each(_.pairs(data), function(pair) { \
                             var ccg_id = pair[0], groups = pair[1];\
                             var ccg = App.metadata.ccgs.where({code: ccg_id})[0];\
%>\
    <tr>\
        <td><%= ccg_id %>                  </td>\
        <td><%= ccg.get("title") %>        </td>\
        <td><%= groups.group1.items %>     </td>\
        <td><%= groups.group1.proportion %></td>\
        <td><%= groups.group2.items %>     </td>\
        <td><%= groups.group2.proportion %></td>\
    </tr>\
<% }); %>\
  </tbody>\
</table>');
            return tpl(serialised);
    }

    // The template used to render percapita data for CCGs
    Templates.PercapitaCCGTable = function(serialised){
            serialised.App = App; // Like a template context plugin
            var tpl = _.template('\
<table class="table table-striped table-bordered table-hover">\
  <thead>\
    <tr>\
        <th>CCG ID                   </th>\
        <th>CCG Name                 </th>\
        <th>Total Items              </th>\
        <th>Population               </th>\
        <th>Prescriptions Per Capita </th>\
    </tr>\
  </thead>\
  <tbody\
<% _.each(_.pairs(data), function(pair) { \
                             var ccg_id = pair[0], count = pair[1].count;\
                             var ccg = App.metadata.ccgs.where({code: ccg_id})[0];\
                             var percap = count / ccg.get("population");\
%>\
    <tr>\
        <td><%= ccg_id %>                  </td>\
        <td><%= ccg.get("title") %>        </td>\
        <td><%= count %>                   </td>\
        <td><%= ccg.get("population") %>   </td>\
        <td><%= percap %>                  </td>\
    </tr>\
<% }); %>\
  </tbody>\
</table>');
            return tpl(serialised);
    }

    // Template for A data map - e.g. a heatmap with Data Tables attached
    Templates.DataMap = _.template('\
<ul class="nav nav-tabs" id="datamap-tabs">\
  <li class="active"><a href="#map" class="tabbable">Heatmap</a></li>\
  <li> <a href="#ccg_data_table" class="tabbable">CCG Data</a></li>\
</ul>\
<div class="tab-content">\
  <div class="tab-pane active" id="map"></div>\
  <div class="tab-pane" id="ccg_data_table">Some data (CCG)</div>\
  <div class="tab-pane" id="practice_data_table">Some data (Practice)</div>\
<\div>\
<script>\
  $(function () {\
    $("#datamap-tabs a:first").tab("show");\
  })\
</script>\
');


    // Template for a question
    Templates.Question = _.template('<h3>\
<a href="<%= window.location.href.replace("explore", "raw") %>/<%= filename %>"\
   data-toggle="tooltip" \
   title="Download raw data" \
   class="tt"> \
<i class="icon-download"></i></a>\
<a href="#pinAnalysis"\
   data-toggle="modal"\
   role="button">\
     <i class="icon-pushpin tt"\
        data-toggle="tooltip"\
        title="Save this analysis"\
     ></i>\
</a>\
<i class="icon-question-sign tt"\
   data-toggle="tooltip"\
   title="What question is this visualisation attempting to answer?"></i>\
<%= question %>\
</h3>\
\
<div id="pinAnalysis" class="modal hide fade" tabindex="-1" role="dialog" aria-labelledby="myModalLabel" aria-hidden="true">\
  <div class="modal-header">\
    <button type="button" class="close" data-dismiss="modal" aria-hidden="true">×</button>\
    <h3 id="myModalLabel">Pin Analysis</h3>\
  </div>\
  <div class="modal-body">\
    <p>Friendly Name: <input id="pushpin-name" type="text" name="name"> </p>\
  </div>\
  <div class="modal-footer">\
    <button class="btn" data-dismiss="modal" aria-hidden="true">Close</button>\
    <button class="btn btn-danger pushpin">Save changes</button>\
  </div>\
</div>');

    // General purpose Marionette views that will be useful in
    // many clients

    var Views =  {}

    // Represent an in-progress data call to the API
    Views.Affordance =  Backbone.Marionette.ItemView.extend({

        template: function(serialised){
            tpl = _.template('<%= name %> <img src="/static/tastypie_swagger/images/throbber.gif" / >');
            return tpl(serialised)
        }

    });

    // Represent a failed data call to the API
    Views.FailedAffordance = Backbone.Marionette.ItemView.extend({

        template: function(serialised){
            var tpl = _.template('\
<i class="icon-thumbs-down"></i>\
Failed fetching data from the API: <%= name %>'
                                );
            return tpl(serialised);
        }

    });


    // The purpose of a question layout is to listen for events and
    // construct a human-understandable headline for the current
    // visualisation of our data.
    Views.QuestionView = Backbone.Marionette.ItemView.extend({

        events: {

            'click .pushpin': 'save'

        },

        // The master template containing the icons etc.
        // Interpolates the question values in from the model.
        template: function(model){
            var data = {
                question: this.question_template(model),
                filename: this.filename
            }
            return Templates.Question(data)
        },

        initialize: function(opts){
            log.debug('question started');
            this.question_template = opts.question_template;
            this.filename = opts.filename;
            App.on('exploring', this.exploring, this);
            _.bindAll(this, 'template')
        },

        exploring: function(model){
            log.debug(model);
            log.debug('exploringit');
            this.model = model;
            this.render();
        },

        // The user would like to save the current visualisation.
        save: function(){
            log.debug('saving');
            var name = $('#pushpin-name').val();
            var frag = window.location.pathname;
            var pin  = new Models.PinnedAnalysis({name: name, frag: frag});
            pin.save();
        },

    });

    Views.DrugListItemView = Backbone.Marionette.ItemView.extend({

        template: _.template("<%= name.replace('_', ' ') %>"),
        tagName: 'li',
        events: {
            'click': 'on_click'
        },

        on_click: function(event){
            log.debug('Make Heatmap!');
            var bnf_code = this.model.get('bnf_code');
            App.trigger('drugitem:click', bnf_code);
        },

        onRender: function(){
            this.$el.attr('data-bnf-code', this.model.get('bnf_code'));
            log.debug('Drug item rendered ' + this.model.get('bnf_code'));
            return
        }
    });

    Views.DrugSelectView = Backbone.Marionette.CollectionView.extend({
        itemView: Views.DrugListItemView,
        tagName: 'ul',

        events: {
            'keyup #filter': 'filter'
        },

        // When we render, check to see if we want to make the individual
        // elements draggable
        onRender: function(){
            log.debug('Drug select view rendered');
            log.debug(this.el);
            this.$el.children('li').draggable({
                containment: '#explore-controls',
                revert:      false,
                helper:      'clone',
            });
            return
        },

        // We'd like to get any drugs that contain VAL
        filter: function(val){
            log.debug(val);
            this.collection.ajax_search(val);
        }
    });


    Views.DrugBucketItemView = Backbone.Marionette.ItemView.extend({

        template: _.template("<%= name.replace('_', ' ') %>"),
        tagName: 'li',

    });


    Views.DrugBucketView = Backbone.Marionette.CollectionView.extend({

        tagName: 'ul',
        itemView: Views.DrugBucketItemView,

        // Listen for items added to buckets in URLs
        initialize: function(opts){
            _.bindAll(this, "url_add");
            App.on(opts.bucket_name + ':add', this.url_add)
        },

        // We've got a drug that was added to the bucket by a URL.
        // Chuck it into the collection please.
        url_add: function(model){
            log.debug(model);
            exists = this.collection.where({bnf_code: model.get('bnf_code')});
            if(exists.length == 0){ // Collection doesn't know bnf_code is unique
                this.collection.add(model);
            }
        },

        // Drug buckets should be inherently droppable
        onRender: function(){
            var view = this;
            log.debug('making ourself droppable')
            this.$el.append('<li class="target">Drop drugs on me to add them!')
            this.$el.droppable({
                drop: function(event, ui){view.on_drop(event, ui, view)}
            });
        },

        on_drop: function(event, ui, that){
            var name = ui.draggable.text();
            var code = ui.draggable.data('bnf-code');
            var exists = that.collection.where({bnf_code: code});
            if(exists.length == 0){
                var drug = new Drug({name:name, bnf_code: code});
                that.collection.add(drug);
            }
        }

    })

    Views.DataTable = Backbone.Marionette.ItemView.extend({
        initialise: function(opts){
            this.template = opts.template;
        },

        onRender: function(){
            this.$el.children('table').tablesorter();
        },

    });

    // Re-usable layouts
    var Layouts = {}


    // Capture results and display affordances on trigger
    // functions
    Layouts.ResultLayout = Backbone.Marionette.Layout.extend({

        template: function(serialised){
            tpl = _.template(
                '\
<div id="explore-affordance"></div>\
<div id="explore-failed-affordance"></div>\
<div id="explore-results"></div>'
            );
            return tpl(serialised)
        },

        regions: {
            results:    '#explore-results',
            affordance: '#explore-affordance',
            failures:   '#explore-failed-affordance'
        },

        // Listen for events
        initialize: function(opts){
            this.affordances = []
            App.on('results:new_view', this.new_result, this);
            App.on('affordance:add', this.add_affordance, this);
            App.on('affordance:done', this.done_affordance, this);
            App.on('affordance:error', this.failed_affordance, this);
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
        },

        // A data call has failed to respond - display this information
        // to the user.
        failed_affordance: function(affordance){
            var aff = new Affordance({name: affordance});
            var errview = new Views.FailedAffordance({model: aff});
            this.failures.show(errview);
        }

    });

    // Generic container for a map which shows it's data tables
    Layouts.DataMap = Backbone.Marionette.Layout.extend({

        template: Templates.DataMap,
        regions: {
            map:                 '#map',
            ccg_data_table:      '#ccg_data_table',
            practice_data_table: '#practice_data_table',
        },

        initialize: function(opts){
            this.ccgs = opts.ccgs;
            this.ccg_template = opts.ccg_template;
            this.dataflags = {}
            this.practices = opts.practices;
            _.bindAll(this, 'build_ccg_table');
            this.ccgs.on('reset', this.build_ccg_table);
        },

        build_ccg_table: function(){
            if(App.metadata.ccgs.length < 5){
                App.metadata.ccgs.once('reset', this.build_ccg_table);
                return
            }
            log.debug('building CCG table');
            var table = new Views.DataTable({
                template: this.ccg_template,
                model:    new Backbone.Model({data: this.ccgs.models[0].attributes})
            })
            this.ccg_data_table.show(table);
        },

    });

    Layouts.ExLayout = Backbone.Marionette.Layout.extend({
        template: '#explore-layout-template',

        regions: {
            question: '#explore-question',
            controls: '#explore-controls',
            results: '#explore-results'
        }

    });

    Layouts.DrugFilter = Backbone.Marionette.Layout.extend({

        template: _.template('\
<input type="text" placeholder="type here to filter" id="filter">\
<div id="drugs"></div>'),

        regions: {
            drugs: '#drugs'
        },

        events: {
            'keyup #filter': 'filter'
        },

        // Constructor for the filter layout
        initialize: function(opts){
            // Do we want to be draggable?
            var draggable = opts.draggable || false;
            var collection = opts.collection;
            var that = this;

            var showit = function(){
                var druglist = new Views.DrugSelectView({
                    collection: collection,
                    draggable:  true
                });
                that.drugs.show(druglist);
            }

            collection.on('reset', showit)
            showit()



        },

        // Filter the visible drugs
        filter: function(event){;
            var val = this.$('#filter').attr('value');
            log.debug('filtering ' + val)
            // log.debug(val);
            this.drugs.currentView.filter(val);
        },

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
                'group1': opts['group1'],
                'group2': opts['group2'],
            }})
            return brigade
        },

        //Prescription aggregate API
        prescriptionaggregate: function(opts){
            var scrips = new PrescriptionAggs();
            var granularity = opts['granularity'] || 'ccg';
            var affordance = 'Fetching ' + granularity + ' Aggregate';
            scrips.fetchall(affordance, {
                query_type: granularity,
                bnf_code:   opts.bnf_code
            });
            return scrips;
        }

    }

    // Api wrapper for producing Map views
    var Maps = {

        // Return a view that displays the ratio of prescibing
        // different buckets of drugs per CCG
        bucket: function(opts){
            var group1      = opts.bucket1 || [];
            var group2      = opts.bucket2 || [];
            var data_tables = opts.data_tables || false;

            var ccg_comparison = Api.prescriptioncomparison({
                granularity: 'ccg',
                group1:      group1,
                group2:      group2
            });

            // Do we want practice-level data?
            var practice_comparison = false;
            if(opts.practices){
                practice_comparison = Api.prescriptioncomparison({
                    granularity: 'practice',
                    group1:      group1,
                    group2:      group2
                });
            }

            var bucketmap = new BucketMap({
                ccg_buckets:      ccg_comparison,
                practice_buckets: practice_comparison,
                practices:        true
            });

            // Do we want a data table?
            if(data_tables){
                var data_map = new Layouts.DataMap({
                    ccgs:      ccg_comparison,
                    ccg_template: Templates.BucketCCGTable,
                    practices: practice_comparison
                });
                App.trigger('results:new_view', data_map);
                data_map.map.show(bucketmap)
                return data_map
            }else{
                return bucketmap;
            }

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

            // Do we want data tables?
            if(opts.data_tables){
                var data_map = new Layouts.DataMap({
                    ccgs:      ccg_scrips,
                    ccg_template: Templates.PercapitaCCGTable,
                    practices: practice_scrips
                });

                App.trigger('results:new_view', data_map);
                data_map.map.show(percapitamap);
                return data_map
            }else{
                App.trigger('results:new_view', percapitamap);
                return percapitamap
            }
        }

    };

    var GET = function(opts){
        log.debug('Getting!');
        log.debug(opts);
        return Api[opts.resource](opts);
    }

    App.get         = GET;
    App.maps        = Maps;
    App.views       = Views;
    App.layouts     = Layouts;
    App.models      = Models;
    App.collections = Collections;
    App.metadata    = {}

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
