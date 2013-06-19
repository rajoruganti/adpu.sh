

var SearchModel = Backbone.Model.extend({
   performSearch: function(str) {
      //assign to local variable, so that it is accesible in callback's closure
	        var self = this; 
	        $.get('/docs/' + str, function(results) {
	            // are you sure it should be data?
	            console.log(data);
	            self.set("results", data);
	        });
   },
   _searchComplete: function(results) {
     this.set("searchResults", results);
   }
});
var searchModel = new SearchModel();