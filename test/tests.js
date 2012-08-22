var test_users = _([
    {id:1, username:"andrew", resource_uri:'/api/v1/user/1/'},
    {id:2, username:"jackie", resource_uri:'/api/v1/user/2/'},
    {id:3, username:"genie", resource_uri:'/api/v1/user/3/'},
    {id:4, username:"kirt", resource_uri:'/api/v1/user/4/'},
    {id:5, username:"kory", resource_uri:'/api/v1/user/5/'},
    {id:6, username:"anton", resource_uri:'/api/v1/user/6/'},
    {id:7, username:"azat", resource_uri:'/api/v1/user/7/'}
]);

$.mockjax(function(request){
    var userDetail = request.url.match(/\/api\/v1\/user\/(\d+)\/$/i);
 
    if (userDetail) {
        var userId = userDetail[1];

        return {
            success: true,
            responseText: test_users.find(function(user) {
                return user.id == userDetail[1];
            })
        };
    }

    var qs = {};

    _.each(request.url.split('?')[1].split('&'), function(arg) {
        arg = arg.split('=');
        qs[arg[0]] = arg[1];
    });

    var limit = Number(qs.limit || 0),
        offset = Number(qs.offset || 0),
        objects = [];

    if (limit)
        objects = test_users.slice(offset, offset + limit);
    else
        objects = test_users.slice(offset);

    return {
        success: true,
        responseText: {
            objects: objects,
            meta: {
                limit: limit,
                offset: offset,
                total_count: test_users.value().length
            }
        }
    };
});

var User = Backbone.Tastypie.Model.extend({
    urlRoot: '/api/v1/user/'
});

var Users = Backbone.Tastypie.Collection.extend({
    urlRoot: '/api/v1/user/',
    model: User
});

asyncTest("parsing tastypie response", 3, function() {
    var limit = 3;

    var users = new Users([], {
        filters: {
            limit: limit,
            active: true
        }
    });

    users.fetch({
        success: function(users) {
            equal(users.models.length, limit);
            equal(users.meta.limit, limit);
            equal(users.meta.offset, 0);
            start();

            test("model url", 1, function() {
                var user = users.first(),
                    compare = test_users.first();

                equal(user.url(), compare.resource_uri);
            });

            asyncTest("fetching next page", 3, function() {
                users.fetchNext({
                    success: function(users) {
                        equal(users.models.length, limit * 2);
                        equal(users.meta.limit, limit);
                        equal(users.meta.offset, limit);
                        start();
                    }
                });
            });
        }
    });
});

asyncTest("limit greater than total", 6, function() {
    var limit = 100,
        total = test_users.value().length;

    var users = new Users([], {
        filters: {
            limit: limit
        }
    });

    users.fetch({
        success: function(users) {
            equal(users.models.length, total);
            equal(users.meta.limit, limit);
            equal(users.meta.offset, 0);

            users.fetchNext({
                success: function(users) {
                    equal(users.models.length, total);
                    equal(users.meta.limit, limit);
                    equal(users.meta.offset, total);
                    start();
                }
            });
        }
    });
});

test("new model url", function() {
    var user = new User();
    equal(user.url(), '/api/v1/user/');
});

test("model meta", function() {
    var Foo = Backbone.Tastypie.Collection.extend();
    var Bar = Backbone.Tastypie.Collection.extend();

    foo = new Foo();
    bar = new Bar();

    foo.meta.offset = 12;

    notEqual(foo.meta.offset, bar.meta.offset);
});
