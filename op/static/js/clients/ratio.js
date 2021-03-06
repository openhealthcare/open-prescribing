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

    var ExControlLayout = Backbone.Marionette.Layout.extend({
        template: '#explore-controls-template',

        regions: {
            filter:  '#filter',
            bucket1: '#bucket1',
            bucket2: '#bucket2'
        },

        events: {
            'click button.go': 'resultise'
        },

        resultise: function(){
            var bucket1 = this.bucket1.currentView.collection.pluck('bnf_code')
            var bucket2 = this.bucket2.currentView.collection.pluck('bnf_code')
            log.debug('make api heatmap call')
            // What we want here is for prescribing.js to
            // return us a view with a heatmap in it.
            var url = 'explore/ratio/' + bucket1.join(',') + '/' + bucket2.join(',');
            ExApp.router.navigate(url, {trigger: true});
        },

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
    var OP = ExApp.OP = new Scrip({
            api_host: window.location.host
        })

    ExApp.addRegions({
        container: '#explore-container'
    });

    // Route callbacks
    var ExploreController = {
        ratio: function(bucket1, bucket2){
            log.debug('explore ratio from bucket url');

            // _.map([[bucket1, '1'], [bucket2, '2']], function(bucketlist){
            //     var bucket = bucketlist[0];
            //     var id = bucketlist[1];
            //     _.map(bucket.split(','), function(bnf_code){
            //         var drug = new Drug({bnf_code: bnf_code});
            //         drug.fetch({success: function(model, response, options){
            //             log.debug(model);
            //             OP.trigger('bucket' + id + ':add', model);
            //         }})
            //     });
            // });

            // This is Insane.
            window.$ = jQuery;
            var mapview = OP.maps.bucket({
                bucket1:     bucket1,
                bucket2:     bucket2,
                practices:   true,
                data_tables: true
            });
            log.debug(mapview);
            // OP.trigger('results:new_view', mapview);
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
        var layout = new OP.layouts.ExLayout();
        ExApp.container.show(layout);

        question = new OP.views.QuestionView({

            filename: 'ratio.zip',
            question_template: _.template('Ratio between prescribing two groups of drugs')

        });

        controls = new ExControlLayout();
        results = new OP.layouts.ResultLayout();

        drug_filter = new OP.layouts.DrugFilter({
            collection: new OP.collections.Pharmacy(),
            draggable: true
        });

        layout.question.show(question);
        layout.controls.show(controls);
        controls.filter.show(drug_filter);
        layout.results.show(results);

        bucket1 = new OP.views.DrugBucketView({
            collection: new OP.collections.Pharmacy(),
            bucket_name: 'bucket1'
        });
        bucket2 = new OP.views.DrugBucketView({
            collection: new OP.collections.Pharmacy(),
            bucket_name: 'bucket2'
        });

        controls.bucket1.show(bucket1);
        controls.bucket2.show(bucket2);
    });

    // on startup, let's have a router controller pair
    ExApp.addInitializer(function(options){
        ExApp.router = new ExploreRouter();
        Backbone.history.start({pushState: true});
    });

})(this.window||exports, "Explore")
