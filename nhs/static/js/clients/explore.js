//
// explore.js

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
        }
    });

    var ExControlLayout = Backbone.Marionette.Layout.extend({
        template: '#explore-controls-template',

        regions: {
            bucket1: '#bucket1',
            bucket2: '#bucket2'
        },

        events: {
            'click button': 'resultise'
        },

        resultise: function(){
            var bucket1 = jQuery('#bucket1 select').attr('value')
            var bucket2 = jQuery('#bucket2 select').attr('value')
            log.debug('make api heatmap call')
            // What we want here is for prescribing.js to
            // return us a view with a heatmap in it.
            var url = 'explore/ratio/' + bucket1 + '/' + bucket2;
            ExApp.router.navigate(url, {trigger: true});
        }

    })

    var DrugOptionView = Backbone.Marionette.ItemView.extend({
        template: '#drug-option-template',
        tagName: 'option',
        onRender: function(){
            this.$el.attr('value', this.model.get('bnf_code'));
            return
        }
    });

    var DrugSelectView = Backbone.Marionette.CollectionView.extend({
        itemView: DrugOptionView,
        tagName: 'select'
    });

    var ExApp = context[namespace] = new Backbone.Marionette.Application();
    var OP = new Scrip({
            api_host: window.location.host
        })

    ExApp.addRegions({
        container: '#explore-container'
    });

    // Route callbacks
    var ExploreController = {
        ratio: function(bucket1, bucket2){
            log.debug('explore ratio from bucket url');

            var mapview = OP.maps.bucket({
                bucket1: [bucket1],
                bucket2: [bucket2],
                practices: true
            });
            log.debug(mapview);
            ExApp.trigger('results:new_view', mapview);
            var _ratio = new OP.models.Ratio({bucket1: bucket1, bucket2: bucket2})
            OP.trigger('exploring', _ratio);
        }
    };

    // Unique URLs for our ratio visualisations
    var ExploreRouter = Backbone.Marionette.AppRouter.extend({

        appRoutes: {
            'explore/ratio/:bucket1/:bucket2': 'ratio'
        },

        controller: ExploreController

    });

    ExApp.addInitializer(function(options){
        var layout = new ExLayout();
        ExApp.container.show(layout);
        controls = new ExControlLayout();
        results = new OP.views.ResultLayout();

        question = new OP.views.QuestionView({

            template: function(model){
                log.debug('this is a template');
                model.bucket1 = model.bucket1 || false;
                t =  _.template(
                    '<h3>\
<a href="<%= window.location.href.replace("explore", "raw") %>/ratio.zip"> \
<i class="icon-download"></i></a>\
<i class="icon-question-sign"></i>\
<% if (bucket1 && bucket2) { %>\
<%= bucket1 %> vs <%= bucket2 %> \
<% }else{ %>Drug <% } %>\
prescription ratios per ccg</h3>');
                return t(model)
            }

        });

        ExApp.on('results:new_view', results.new_result, results);

        all_drugs = OP.get({
            resource: 'product',
            data: { limit: 0 }
        })

        bucket1 = new DrugSelectView({
            collection: all_drugs
        });

        bucket2 = new DrugSelectView({
            collection: all_drugs
        })

        layout.question.show(question);
        layout.controls.show(controls);
        controls.bucket1.show(bucket1);
        controls.bucket2.show(bucket2);
        layout.results.show(results);
    });

    // On startup, let's have a router controller pair
    ExApp.addInitializer(function(options){
        ExApp.router = new ExploreRouter();
        Backbone.history.start({pushState: true});
    });

})(this.window||exports, "Explore")
