define(['backbone', './panel.jade'], function(Backbone, template){

    return Backbone.View.extend({
        attributes: {
          class: 'v-panel'
        },
        render: function() {
            this.$el.html(template());
        }
    });

});