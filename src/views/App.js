define(['backbone', './app.jade', 'views/panel/Panel', 'views/SingleToneView/SingleToneView'],
    function(Backbone, template) {

    var Panel = require('views/panel/Panel');
    var SingleTone = require('views/SingleToneView/SingleToneView');

    return Backbone.View.extend({
        el: 'body',
        events: {
          'click #button': 'addView',
          'click #single': 'addSingle'
        },
        initialize: function() {
            console.log('Панель');
        },
        render: function() {
            this.$el.html(template());
        },
        addView: function () {
            var v = new Panel();
            this.$('.main').append(v.$el);
            v.render();
        },
        addSingle: function () {
            var v = new SingleTone();
            this.$('.main').append(v.$el);
        }
    });

});