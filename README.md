# Backbone Tastypie [![Build Status](https://secure.travis-ci.org/amccloud/backbone-tastypie.png)](http://travis-ci.org/amccloud/backbone-tastypie]) #
Modifications to Backbone's Model an Collection so that they play nice with django-tastypie. Includes a way to easily paginate over a resource list and a way to access the associated meta information.

## Example ##
```javascript
var User = Backbone.Model.extend({
    urlRoot: '/api/v1/user/'
});

var Users = Backbone.Collection.extend({
    urlRoot: '/api/v1/user/',
    model: User
});

// /api/v1/user/?active=true
var activeUsers = new Users({
    filters: {
        active: true,
    }
});

// Fetch first 20 users.
activeUsers.fetch();

// Fetch and add next 20 users.
activeUsers.fetchNext();

// Total number of users.
activeUsers.meta.total_count
```
