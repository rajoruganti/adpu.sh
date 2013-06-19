window.HomeView = Backbone.View.extend({
    initialize:function () {
       // this.render();
    },

   /* render:function () {
		$(this.el).html(this.template());
		return this;
    },
*/
	tagName: "form",
	    id: "qform",
	events: {
      "click input": "getResults"
    },
	getResults: function(e) {
		alert('a');
		e.preventDefault();
		console.log(e.target.value);
      // Get values of selected options, use them to construct Ajax query. 
      // Also toggle 'selected' CSS classes on selected inputs here?
      this.model.performSearch(e.target.value);
    }


});

var SearchResultsView = Backbone.View.extend({
    tagName: "ul",
    id: "results-list",
    initialize: function() {
        this.model.on("change:searchResults", this.displayResults, this);
    },
    displayResults: function(model, results) {
     console.log("appending");
 		//append results to results-list here.   
      //update contents of blurb here?
    }
  });

var searchFormView = new HomeView({ model: searchModel });
var searchResultsView = new SearchResultsView({ model: searchModel });