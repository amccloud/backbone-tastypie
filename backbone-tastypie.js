(function (root, factory) {
  if (typeof exports === 'object') {

    var jquery = require('jquery');
    var underscore = require('underscore');
    var backbone = require('backbone');

    module.exports = factory(jquery, underscore, backbone);

  } else if (typeof define === 'function' && define.amd) {

    define(['jquery', 'underscore', 'backbone'], factory);

  } else {
    this.bpm = factory(jQuery, _, Backbone)
  } 
}(this, function($, _, Backbone) {
    Backbone.Tastypie = {
        defaultLimit: 20,
        doGetOnEmptyPostResponse: true,
        doGetOnEmptyPutResponse: false,
        apiKey: {
            username: '',
            key: ''
        }
    };

    /**
     * Override Backbone's sync function, to do a GET upon receiving a HTTP CREATED.
     * This requires 2 requests to do a create, so you may want to use some other method in production.
     * Modified from http://joshbohde.com/blog/backbonejs-and-django
     */
    Backbone.oldSync = Backbone.sync;
    Backbone.sync = function( method, model, options ) {
        var headers = {};

        if ( Backbone.Tastypie.apiKey && Backbone.Tastypie.apiKey.username.length ) {
            headers = _.extend( {
                'Authorization': 'ApiKey ' + Backbone.Tastypie.apiKey.username + ':' + Backbone.Tastypie.apiKey.key
            }, options.headers );
            options.headers = headers;
        }

        if ( ( method === 'create' && Backbone.Tastypie.doGetOnEmptyPostResponse ) ||
            ( method === 'update' && Backbone.Tastypie.doGetOnEmptyPutResponse ) ) {
            var dfd = new $.Deferred();

            // Set up 'success' handling
            dfd.done( options.success );
            options.success = function( resp, status, xhr ) {
                // If create is successful but doesn't return a response, fire an extra GET.
                // Otherwise, resolve the deferred (which triggers the original 'success' callbacks).
                if ( !resp && ( xhr.status === 201 || xhr.status === 202 || xhr.status === 204 ) ) { // 201 CREATED, 202 ACCEPTED or 204 NO CONTENT; response null or empty.
                    var location = xhr.getResponseHeader( 'Location' ) || model.id;
                    return $.ajax( {
                           url: location,
                           headers: headers,
                           success: dfd.resolve,
                           error: dfd.reject
                        });
                }
                else {
                    return dfd.resolveWith( options.context || options, [ resp, status, xhr ] );
                }
            };

            // Set up 'error' handling
            dfd.fail( options.error );
            options.error = function( xhr, status, resp ) {
                dfd.rejectWith( options.context || options, [ xhr, status, resp ] );
            };

            // Make the request, make it accessibly by assigning it to the 'request' property on the deferred
            dfd.request = Backbone.oldSync( method, model, options );
            return dfd;
        }

        return Backbone.oldSync( method, model, options );
    };

    _.extend(Backbone.Model.prototype, {
        idAttribute: 'resource_uri',

        url: function() {
            var url = getValue(this, 'urlRoot') || getValue(this.collection, 'urlRoot') || urlError();
            
            if (this.isNew())
                return url;

            return this.get('resource_uri') || this.id;
        },
        _getId: function() {
            if (this.has('id'))
                return this.get('id');

            return _.chain(this.get('resource_uri').split('/')).compact().last().value();
        },
        _getUri: function(id) {
            return this.urlRoot + id + '/'
        },
        get_or_fetch: function(itemid, options) {
          options = options || {};
          options = $.extend({use_ajax: true}, options)
          var use_ajax = options.use_ajax;
          var item = false
          if (this.collection) item = this.collection.get(itemid);
          if (!item) {
            // download character from the server
            item = new this.constructor({resource_uri: itemid});
            $.ajaxSetup({async: use_ajax});
            var deferred = item.fetch(options);
            $.ajaxSetup({async: true});
          } else if (options.success) {
            options.success(item)
          }
          return (!item && use_ajax) ? deferred : item;
        },
        api: function(url, options) {
            options = options || {}
            var u = this.url()
            options.url = u.substr(0,u.lastIndexOf('/')) + url + '/'
            _.defaults(options, {
                dataType: 'application/json'
            })
            return $.ajax(options)
        }
    });

    _.extend(Backbone.Collection.prototype, {
        initialize: function(collections, options) {
            _.bindAll(this, 'fetchNext', 'fetchPrevious');

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
                    return model._getId();
                });

                url += 'set/' + ids.join(';') + '/';
            }

            return url + this._getQueryString();
        },
        api: function(url, options) {
            options = options || {}
            var u = this.url()
            if (u.indexOf('?') != -1) {
                url = u.substr(0,u.lastIndexOf('/')) + url + u.substr(u.lastIndexOf('/'))
            }
            options.url = url
            _.defaults(options, {
                dataType: 'application/json'
            })
            return $.ajax(options)
        },
        _getUri: function(id) {
            return this.urlRoot + id + '/'
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
        },
        get_or_fetch: function(itemid, options) {
          options = options || {};
          options = $.extend({use_ajax: true}, options)
          var use_ajax = options.use_ajax;
          var item = this.get(itemid);
          if (!item) {
            // download character from the server
            item = new this.model();
            item.id = itemid;
            $.ajaxSetup({async: use_ajax});
            var deferred = item.fetch(options);
            $.ajaxSetup({async: true});
            if(options.add) this.add(item);
          } else if (options.success) {
            options.success(item)
          }
          return (!item && use_ajax) ? deferred : item;
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
}));
