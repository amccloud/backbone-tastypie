(function($, _, Backbone) {
    Backbone.Tastypie = {
        defaultLimit: 20
    };

    Backbone.Tastypie.Model = Backbone.Model.extend({

        url: function() {
            var url = getValue(this, 'urlRoot') || getValue(this.collection, 'urlRoot') || urlError();
            
            if (this.isNew())
                return url;

            return url + this.get('id') + '/';
        }

    });

    Backbone.Tastypie.Collection = Backbone.Collection.extend({
        constructor: function(models, options) {
            Backbone.Collection.prototype.constructor.apply(this, arguments);

            this.meta = {};
            this.filters = {
                limit: Backbone.Tastypie.defaultLimit,
                offset: 0
            };

            if (options && options.filters)
                _.extend(this.filters, options.filters);
        },
        url: function(models) {
            var url = this.urlRoot;

            if (models) {
                var ids = _.map(models, function(model) {
                    return model.get('id');
                });

                url += 'set/' + ids.join(';') + '/';
            }

            return url + this._getQueryString();
        },
        parse: function(response) {
            if (response && response.meta)
                this.meta = response.meta;

            return response && response.objects;
        },
        fetchNext: function(options) {
            options = options || {};
            options.add = true;

            this.filters.limit = this.meta.limit;
            this.filters.offset = this.meta.offset + this.meta.limit;

            if (this.filters.offset > this.meta.total_count)
                this.filters.offset = this.meta.total_count;

            return this.fetch.call(this, options);
        },
        fetchPrevious: function(options) {
            options = options || {};
            options.add = true;
            options.at = 0;

            this.filters.limit = this.meta.limit;
            this.filters.offset = this.meta.offset - this.meta.limit;

            if (this.filters.offset < 0){
                this.filters.limit += this.filters.offset;
                this.filters.offset = 0;
            }

            return this.fetch.call(this, options);
        },
        _getQueryString: function() {
            if (!this.filters)
                return '';

            return '?' + $.param(this.filters);
        }
    });

    // Helper function from Backbone to get a value from a Backbone
    // object as a property or as a function.
    var getValue = function(object, prop) {
        if ((object && object[prop]))
            return _.isFunction(object[prop]) ? object[prop]() : object[prop];
    };

    // Helper function from Backbone that raises error when a model's
    // url cannot be determined.
    var urlError = function() {
        throw new Error('A "url" property or function must be specified');
    };
})(window.$, window._, window.Backbone);
