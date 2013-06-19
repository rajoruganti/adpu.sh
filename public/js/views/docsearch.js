window.DocSearchView = Backbone.View.extend({

	events: {
	    "submit form": "formSubmitted"
	  },
	formSubmitted: function(e){
		e.preventDefault();
		var attributeName = "q";
		var value = $("q").val();
		var attribute = {};
		attribute[attributeName] = value;
		this.model.set(attribute);	
	},
/*	initialize: function () {
        this.render();
    },

	   el: "#docs",
	   template: _.template($('#docSearchView').html()),
	   render: function(eventName) {
	      _.each(this.model.models, function(doc){
	         var docTemplate = this.template(Doc.toJSON());
	         $(this.el).append(docTemplate);
	      }, this);
	      return this;
	   }
	});
*/
});